// ═══════════════════════════════════════════════════════════
// BGS Square Webhook Edge Function
// Supabase Edge Function: square-webhook
// Listens for Square payment.completed events
// Auto-creates lesson_packages in Supabase when sold via POS
// ═══════════════════════════════════════════════════════════

// @supabase-edge-function no-verify-jwt
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SQUARE_WEBHOOK_SIGNATURE_KEY = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY") || "";
const SQUARE_ACCESS_TOKEN          = Deno.env.get("SQUARE_ACCESS_TOKEN") || "";
const SQUARE_BASE_URL              = "https://connect.squareup.com/v2";
const SUPABASE_URL                 = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY         = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY               = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL                   = "Birdie Golf Studios <info@birdiegolfstudios.com>";
const ADMIN_EMAIL                  = "info@birdiegolfstudios.com";

// ── SKU map — matches square-proxy exactly ───────────────────────────────────
// SKU → { coach: "SE"|"NC", hours: 1|3|5, isMember: bool }
const LESSON_SKU_MAP: Record<string, { coach: string; coachId: string; coachName: string; hours: number; isMember: boolean }> = {
  // Nicolas Cavero
  "812106T": { coach: "NC", coachId: "TMa5N23NEiU89Spy", coachName: "Nicolas Cavero",    hours: 1, isMember: true  },
  "3399123": { coach: "NC", coachId: "TMa5N23NEiU89Spy", coachName: "Nicolas Cavero",    hours: 1, isMember: false },
  "201558A": { coach: "NC", coachId: "TMa5N23NEiU89Spy", coachName: "Nicolas Cavero",    hours: 3, isMember: true  },
  "6136622": { coach: "NC", coachId: "TMa5N23NEiU89Spy", coachName: "Nicolas Cavero",    hours: 3, isMember: false },
  "X377645": { coach: "NC", coachId: "TMa5N23NEiU89Spy", coachName: "Nicolas Cavero",    hours: 5, isMember: true  },
  "5205473": { coach: "NC", coachId: "TMa5N23NEiU89Spy", coachName: "Nicolas Cavero",    hours: 5, isMember: false },
  // Santiago Espinosa
  "Y241741": { coach: "SE", coachId: "TMiznwW3c_E9-NTW", coachName: "Santiago Espinosa", hours: 1, isMember: true  },
  "P352820": { coach: "SE", coachId: "TMiznwW3c_E9-NTW", coachName: "Santiago Espinosa", hours: 1, isMember: false },
  "279777C": { coach: "SE", coachId: "TMiznwW3c_E9-NTW", coachName: "Santiago Espinosa", hours: 3, isMember: true  },
  "324856H": { coach: "SE", coachId: "TMiznwW3c_E9-NTW", coachName: "Santiago Espinosa", hours: 3, isMember: false },
  "A232624": { coach: "SE", coachId: "TMiznwW3c_E9-NTW", coachName: "Santiago Espinosa", hours: 5, isMember: true  },
  "R135065": { coach: "SE", coachId: "TMiznwW3c_E9-NTW", coachName: "Santiago Espinosa", hours: 5, isMember: false },
};

// ── DB helpers ───────────────────────────────────────────────────────────────
const dbHeaders = {
  "apikey":        SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type":  "application/json",
  "Prefer":        "return=representation",
};

async function dbGet(table: string, query: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: dbHeaders });
  return r.ok ? await r.json() : [];
}

async function dbPost(table: string, data: any) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: dbHeaders, body: JSON.stringify(data),
  });
  return r.ok ? await r.json() : null;
}

async function dbPatch(table: string, query: string, data: any) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH", headers: dbHeaders, body: JSON.stringify(data),
  });
  return r.ok ? await r.json() : null;
}

// ── Square helpers ────────────────────────────────────────────────────────────
async function squareGet(endpoint: string) {
  const r = await fetch(`${SQUARE_BASE_URL}${endpoint}`, {
    headers: { "Square-Version": "2024-01-18", "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}` },
  });
  return r.ok ? await r.json() : null;
}



// ── Resolve or create Supabase customer from Square customer ID ───────────────
async function resolveCustomer(squareCustomerId: string): Promise<any | null> {
  // 1. Check if already in Supabase
  const existing = await dbGet("customers", `square_customer_id=eq.${squareCustomerId}&select=*`);
  if (existing?.length) return existing[0];

  // 2. Not in Supabase — fetch from Square
  const sqData = await squareGet(`/customers/${squareCustomerId}`);
  const sqCust = sqData?.customer;
  if (!sqCust) return null;

  const phone = (sqCust.phone_number || "").replace(/\D/g, "").replace(/^1/, "");

  // 3. Check if they exist by phone (may have signed up but not linked)
  if (phone) {
    const byPhone = await dbGet("customers", `phone=eq.${phone}&select=*`);
    if (byPhone?.length) {
      // Link their Square ID and return
      await dbPatch("customers", `id=eq.${byPhone[0].id}`, { square_customer_id: squareCustomerId });
      return { ...byPhone[0], square_customer_id: squareCustomerId };
    }
  }

  // 4. Create new customer in Supabase
  const newCust = await dbPost("customers", {
    first_name:         sqCust.given_name  || "",
    last_name:          sqCust.family_name || "",
    phone,
    email:              sqCust.email_address || "",
    tier:               "none",
    bay_credits_remaining: 0,
    bay_credits_total:     0,
    square_customer_id: squareCustomerId,
  });
  return Array.isArray(newCust) ? newCust[0] : newCust;
}

// ── Get SKU from catalog object ID ────────────────────────────────────────────
async function getSkuFromVariationId(variationId: string): Promise<string | null> {
  const data = await squareGet(`/catalog/object/${variationId}`);
  return data?.object?.item_variation_data?.sku || null;
}

// ── Send notification email ───────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, text }),
  });
}

// ── Format date ───────────────────────────────────────────────────────────────
const dateKey = (d: Date) => {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  // Square requires a 200 response quickly — process async
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  const rawBody  = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") || "";
  const url       = req.url;

  // Verify Square webhook signature using HMAC-SHA256
  // Square signs: HMAC-SHA256(signatureKey, notificationURL + rawBody)
  // notificationURL must be the exact public URL registered in Square dashboard
  if (SQUARE_WEBHOOK_SIGNATURE_KEY && signature) {
    try {
      // Use the public URL — req.url inside Supabase Edge Functions returns localhost
      const publicUrl = "https://dvaviudmsofyqttcazpw.supabase.co/functions/v1/square-webhook";
      const payload   = publicUrl + rawBody;
      const keyBytes  = new TextEncoder().encode(SQUARE_WEBHOOK_SIGNATURE_KEY);
      const msgBytes  = new TextEncoder().encode(payload);
      const cryptoKey = await crypto.subtle.importKey(
        "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const sigBytes  = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
      const computed  = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));
      if (computed !== signature) {
        console.error("Signature mismatch — computed:", computed, "received:", signature);
        return new Response("Unauthorized", { status: 401 });
      }
    } catch (e) {
      console.error("Signature verification error:", e);
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // Parse event
  let event: any;
  try { event = JSON.parse(rawBody); } catch { return new Response("Bad JSON", { status: 400 }); }

  // Only handle completed payments (Square uses payment.updated with status COMPLETED)
  if (event.type !== "payment.updated") {
    return new Response("Ignored", { status: 200 });
  }
  const paymentStatus = event.data?.object?.payment?.status;
  if (paymentStatus !== "COMPLETED") {
    return new Response("Ignored", { status: 200 });
  }

  // Process in background so Square gets a fast 200
  (async () => {
    try {
      const payment    = event.data?.object?.payment;
      if (!payment) return;

      const orderId         = payment.order_id;
      const squareCustId    = payment.customer_id;
      const paymentId       = payment.id;
      const amountCents     = payment.amount_money?.amount || 0;

      if (!orderId || !squareCustId) return;

      // Fetch order to get line items
      const orderData = await squareGet(`/orders/${orderId}`);
      const lineItems = orderData?.order?.line_items || [];

      // Check each line item for a lesson package SKU
      for (const item of lineItems) {
        const variationId = item.catalog_object_id;
        if (!variationId) continue;

        const sku = await getSkuFromVariationId(variationId);
        if (!sku) continue;

        const pkg = LESSON_SKU_MAP[sku];
        if (!pkg) continue; // not a lesson package SKU — skip

        // Single-lesson (1hr) — don't create a package record, just log
        if (pkg.hours === 1) {
          console.log(`Single lesson sale via POS: ${pkg.coachName} · ${pkg.isMember ? "member" : "non-member"}`);
          continue;
        }

        // It's a 3hr or 5hr package — resolve or create the customer
        const customer = await resolveCustomer(squareCustId);
        if (!customer) {
          console.error(`Could not resolve customer for Square ID: ${squareCustId}`);
          continue;
        }

        // Check for existing active package (don't double-create)
        const existingPkg = await dbGet("lesson_packages", `customer_id=eq.${customer.id}&status=eq.active&select=id`);
        if (existingPkg?.length) {
          console.log(`Customer ${customer.id} already has active package — skipping`);
          continue;
        }

        // Calculate expiry
        const today   = new Date();
        const expDate = new Date(today);
        const months  = pkg.hours === 3 ? 2 : 3;
        expDate.setMonth(expDate.getMonth() + months);

        const pkgName  = `${pkg.hours}-Hour Package`;
        const price    = amountCents / 100;

        // Create lesson package in Supabase
        await dbPost("lesson_packages", {
          customer_id:       customer.id,
          name:              pkgName,
          total_credits:     pkg.hours,
          remaining_credits: pkg.hours,
          coach_id:          pkg.coachId,
          coach_name:        pkg.coachName,
          price,
          expiry_date:       dateKey(expDate),
          status:            "active",
          purchase_date:     dateKey(today),
          square_payment_id: paymentId,
          source:            "square_pos", // track where it was sold
        });

        // Log transaction
        await dbPost("transactions", {
          customer_id:       customer.id,
          description:       `${pkgName} · ${pkg.coachName} (Square POS)`,
          date:              dateKey(today),
          amount:            price,
          payment_label:     "Square POS",
          square_payment_id: paymentId,
        });

        // Email customer
        if (customer.email) {
          const custName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "there";
          await sendEmail(
            customer.email,
            `[BGS] ${pkgName} — ${pkg.coachName}`,
            `Hi ${customer.first_name || custName},\n\nYour ${pkgName} with ${pkg.coachName} has been added to your BGS account.\n\nCredits: ${pkg.hours} lessons\nExpires: ${expDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}\n\nYou can book your lessons anytime at book.birdiegolfstudios.com.\n\n— Birdie Golf Studios`
          );
        }

        // Email staff
        await sendEmail(
          ADMIN_EMAIL,
          `[BGS] POS Package Sale — ${customer.first_name} ${customer.last_name} · ${pkgName}`,
          `A lesson package was sold via Square POS and added to the customer's account:\n\nCustomer: ${customer.first_name} ${customer.last_name}\nPhone: ${customer.phone || "—"}\nPackage: ${pkgName}\nCoach: ${pkg.coachName}\nAmount: $${price.toFixed(2)}\nExpires: ${expDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}\n\n${!customer.email ? "⚠ No email on file — customer was NOT emailed." : ""}`
        );

        console.log(`✓ Package created for ${customer.first_name} ${customer.last_name}: ${pkgName} · ${pkg.coachName}`);
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
    }
  })();

  // Always return 200 immediately to Square
  return new Response("ok", { status: 200 });
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SQUARE_ACCESS_TOKEN = Deno.env.get("SQUARE_ACCESS_TOKEN") || "EAAAly4dd_byZZsAOGBncoZNy_DDVPYb24YwIIx9Gf2CP_ataCCFLcBD2GuGLIJZ";
const SQUARE_BASE_URL = "https://connect.squareup.com/v2";
const LOCATION_ID = "LTNVZZ9PJH2K8";

/* ─── Square Catalog SKUs ─── */
// Bay slots (per 30-min slot) — SKU-based, looked up at runtime
const BAY_SKUS: Record<string, string> = {
  public_nonpeak:       "T333487",   // Public 30 Min Non-Peak
  public_peak:          "2944237",   // Public 30 Min Peak
  starter_nonpeak:      "4388872",   // Starter 30 Min Non-Peak
  starter_peak:         "153380L",   // Starter 30 Min Peak
  early_birdie_nonpeak: "4113992",   // Early Birdie 30 Min Non-Peak
  player_nonpeak:       "Z471393",   // Player's 30 Min Non-Peak
  player_peak:          "572805F",   // Player's 30 Min Peak
  champion_nonpeak:     "413004N",   // Champion's 30 Min Non-Peak
  champion_peak:        "7931551",   // Champion's 30 Min Peak
};

// Membership signup SKUs (enrollment fee handled by Square modifier)
const MEMBERSHIP_SKUS: Record<string, string> = {
  starter:      "D661411",   // Starter Membership
  early_birdie: "F204781",   // Early Birdie Membership
  player:       "3280496",   // Player's Membership
  champion:     "W475281",   // Champion's Membership
};

// Membership renewal SKUs — no enrollment fee modifier
const MEMBERSHIP_RENEWAL_SKUS: Record<string, string> = {
  starter:      "D661411",   // Starter Membership (same — no enrollment fee)
  early_birdie: "287209H",   // Early Birdie Membership Renewal
  player:       "170432G",   // Player's Membership Renewal
  champion:     "W475281",   // Champion's Membership (same — no enrollment fee)
};

// Lesson package SKUs — keyed by coach ID then package
const LESSON_SKUS: Record<string, Record<string, string>> = {
  NC: {
    "1hr_member":    "812106T",  // 1-hr member lesson · Nicolas Cavero
    "1hr_nonmember": "3399123",  // 1-hr non-member lesson · Nicolas Cavero
    "3hr_member":    "201558A",  // 3-hr member package · Nicolas Cavero
    "3hr_nonmember": "6136622",  // 3-hr non-member package · Nicolas Cavero
    "5hr_member":    "X377645",  // 5-hr member package · Nicolas Cavero
    "5hr_nonmember": "5205473",  // 5-hr non-member package · Nicolas Cavero
  },
  SE: {
    "1hr_member":    "Y241741",  // 1-hr member lesson · Santiago Espinoza
    "1hr_nonmember": "P352820",  // 1-hr non-member lesson · Santiago Espinoza
    "3hr_member":    "279777C",  // 3-hr member package · Santiago Espinoza
    "3hr_nonmember": "324856H",  // 3-hr non-member package · Santiago Espinoza
    "5hr_member":    "A232624",  // 5-hr member package · Santiago Espinoza
    "5hr_nonmember": "R135065",  // 5-hr non-member package · Santiago Espinoza
  },
};

/* ─── SKU → Variation ID lookup ─── */
const skuToVariationId = async (sku: string): Promise<string | null> => {
  const res = await squareRequest("/catalog/search", "POST", {
    object_types: ["ITEM_VARIATION"],
    query: { text_query: { keywords: [sku] } },
  });
  const match = (res?.objects || []).find(
    (o: any) => o.type === "ITEM_VARIATION" && o.item_variation_data?.sku === sku
  );
  return match?.id || null;
};


const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "";
const FROM_EMAIL = "Birdie Golf Studios <info@birdiegolfstudios.com>";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER") || "";
const TWILIO_VERIFY_SID = Deno.env.get("TWILIO_VERIFY_SID") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const BGS_API_SECRET = Deno.env.get("BGS_API_SECRET") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bgs-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function squareRequest(endpoint: string, method: string, body?: any) {
  const res = await fetch(`${SQUARE_BASE_URL}${endpoint}`, {
    method,
    headers: { "Square-Version": "2024-01-18", "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return await res.json();
}

/* ─── Email helpers ─── */
const emailBase = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <!-- Header -->
        <tr><td style="background:#072814;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <p style="margin:0;font-family:'Courier New',sans-serif;font-size:13px;font-weight:700;letter-spacing:3px;color:#ffffff;">BIRDIE GOLF STUDIOS</p>
          <p style="margin:6px 0 0;font-size:11px;color:#ffffff88;">Wynwood, Miami</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;border-radius:0 0 16px 16px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#aaa;">45 NE 26th St, Unit C, Miami, FL 33145</p>
          <p style="margin:4px 0 0;font-size:11px;color:#aaa;">info@birdiegolfstudios.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const detailRow = (label: string, value: string) =>
  `<tr>
    <td style="padding:8px 0;font-size:13px;color:#888;border-bottom:1px solid #f0f0ee;">${label}</td>
    <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1a1a1a;text-align:right;border-bottom:1px solid #f0f0ee;">${value}</td>
  </tr>`;

const greeting = (name: string) =>
  `<p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#072814;">Hey ${name.split(" ")[0]} 👋</p>`;

const confirmBadge = (text: string, color = "#072814") =>
  `<div style="display:inline-block;background:${color}18;border:1px solid ${color}44;border-radius:8px;padding:6px 14px;margin-bottom:20px;">
    <span style="font-size:12px;font-weight:700;color:${color};">${text}</span>
  </div>`;

const ctaButton = (text: string, url = "https://birdie-golf-booking.vercel.app") =>
  `<div style="text-align:center;margin-top:24px;">
    <a href="${url}" style="background:#072814;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block;">
      ${text}
    </a>
  </div>`;

function buildEmail(type: string, p: any): { subject: string; html: string } {
  switch (type) {

    case "bay_booking": {
      const subject = `Booking Confirmed — ${p.bay} · ${p.date}`;
      const html = emailBase(`
        ${greeting(p.customer_name)}
        ${confirmBadge("✓ Booking Confirmed")}
        <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
          Your bay is all set! See you soon at the studio.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${detailRow("Bay", p.bay)}
          ${detailRow("Date", p.date)}
          ${detailRow("Time", p.time)}
          ${detailRow("Duration", p.duration)}
          ${p.credits_used ? detailRow("Credits Used", p.credits_used) : ""}
          ${detailRow("Total Charged", p.total)}
        </table>
        <p style="margin:0 0 4px;font-size:12px;color:#aaa;line-height:1.6;">
          Need to cancel? Log into your account to manage your reservation. Cancellations within 24 hours are non-refundable.
        </p>
        ${ctaButton("View My Bookings")}
      `);
      return { subject, html };
    }

    case "lesson_booking": {
      const subject = `Lesson Confirmed — ${p.coach} · ${p.date}`;
      const html = emailBase(`
        ${greeting(p.customer_name)}
        ${confirmBadge("✓ Lesson Confirmed", "#00305B")}
        <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
          Your lesson has been booked. See you on the simulator!
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${detailRow("Coach", p.coach)}
          ${detailRow("Bay", p.bay)}
          ${detailRow("Date", p.date)}
          ${detailRow("Time", p.time)}
          ${detailRow("Payment", p.payment_method)}
          ${detailRow("Total", p.total)}
        </table>
        <p style="margin:0 0 4px;font-size:12px;color:#aaa;line-height:1.6;">
          Cancellations within 24 hours of your lesson are subject to a late cancellation fee.
        </p>
        ${ctaButton("View My Bookings")}
      `);
      return { subject, html };
    }

    case "membership": {
      const subject = `Welcome to ${p.plan} — Birdie Golf Studios`;
      const html = emailBase(`
        ${greeting(p.customer_name)}
        ${confirmBadge("✓ Membership Activated")}
        <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
          Your membership is now active. Here's what you signed up for.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${detailRow("Plan", p.plan)}
          ${detailRow("Monthly Rate", p.price)}
          ${detailRow("Next Renewal", p.renewal)}
        </table>
        <p style="margin:0 0 4px;font-size:12px;color:#aaa;line-height:1.6;">
          You can manage or cancel your membership anytime from your profile. A 7-day notice is required before your renewal date to avoid being charged for the next cycle.
        </p>
        ${ctaButton("View My Membership")}
      `);
      return { subject, html };
    }

    case "lesson_package": {
      const subject = `Lesson Package Confirmed — ${p.package}`;
      const html = emailBase(`
        ${greeting(p.customer_name)}
        ${confirmBadge("✓ Package Purchased", "#00305B")}
        <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
          Your lesson package is ready to use. Book your first session anytime.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${detailRow("Package", p.package)}
          ${detailRow("Coach", p.coach)}
          ${detailRow("Credits", p.credits + " lessons")}
          ${detailRow("Expires", p.expiry)}
          ${detailRow("Total Paid", p.total)}
        </table>
        ${ctaButton("Book a Lesson")}
      `);
      return { subject, html };
    }

    case "cancellation": {
      const subject = `Booking Cancelled — ${p.booking_type} · ${p.date}`;
      const html = emailBase(`
        ${greeting(p.customer_name)}
        ${confirmBadge("Booking Cancelled", "#888")}
        <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
          Your booking has been cancelled. Here's a summary.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${detailRow("Type", p.booking_type)}
          ${p.bay ? detailRow("Bay", p.bay) : ""}
          ${detailRow("Date", p.date)}
          ${detailRow("Time", p.time)}
          ${detailRow("Refund", p.refund_info)}
        </table>
        <p style="margin:0 0 4px;font-size:12px;color:#aaa;line-height:1.6;">
          We hope to see you back soon. Book a new session anytime.
        </p>
        ${ctaButton("Book Again")}
      `);
      return { subject, html };
    }

    case "membership_switch": {
      const subject = `Membership Switch Scheduled — Birdie Golf Studios`;
      const html = emailBase(`
        ${greeting(p.customer_name)}
        ${confirmBadge("✓ Switch Scheduled")}
        <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
          Your membership switch has been scheduled. Here's what to expect.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${detailRow("Current Plan", p.current_plan)}
          ${detailRow("New Plan", p.new_plan)}
          ${detailRow("New Monthly Rate", p.new_price)}
          ${detailRow("Switch Date", p.switch_date)}
        </table>
        <p style="margin:0 0 4px;font-size:12px;color:#aaa;line-height:1.6;">
          You will continue to enjoy your current ${p.current_plan} membership until ${p.switch_date}. No charge today — your next billing cycle will reflect the new plan.
        </p>
        ${ctaButton("View My Membership")}
      `);
      return { subject, html };
    }

    case "cancellation_membership": {
      const subject = `Membership Cancellation — Birdie Golf Studios`;
      const html = emailBase(`
        ${greeting(p.customer_name)}
        ${confirmBadge(p.within_window ? "Cancellation Scheduled" : "Membership Cancelled", "#888")}
        <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
          ${p.within_window
            ? `Your ${p.tier} membership cancellation has been scheduled. You'll continue to have access through your current renewal date of <strong>${p.renewal_date}</strong>, after which your membership will not renew.`
            : `Your ${p.tier} membership has been cancelled. Access ends today.`
          }
        </p>
        ${ctaButton("View My Profile")}
      `);
      return { subject, html };
    }

    case "booking_change": {
      const subject = `Booking Updated — ${p.booking_type} · ${p.date}`;
      const html = emailBase(`
        ${greeting(p.customer_name)}
        ${confirmBadge("✓ Booking Updated")}
        <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
          Your booking has been updated by the BGS team. Here are your new details:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${detailRow("Type", p.booking_type)}
          ${p.bay ? detailRow("Bay", p.bay) : ""}
          ${detailRow("Date", p.date)}
          ${detailRow("New Time", p.new_time)}
          ${p.duration ? detailRow("Duration", p.duration) : ""}
          ${p.coach ? detailRow("Coach", p.coach) : ""}
        </table>
        <p style="margin:0 0 4px;font-size:12px;color:#aaa;line-height:1.6;">
          Questions? Contact us via WhatsApp or email.
        </p>
        ${ctaButton("View My Bookings")}
      `);
      return { subject, html };
    }

    default:
      return { subject: "Birdie Golf Studios", html: emailBase("<p>Thank you for choosing Birdie Golf Studios.</p>") };
  }
}

function buildAdminEmail(type: string, p: any, customerHtml: string): { subject: string; html: string } {
  const badge = (text: string, color = "#072814") =>
    `<div style="display:inline-block;background:${color}18;border:1px solid ${color}44;border-radius:8px;padding:5px 12px;margin-bottom:16px;">
      <span style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1px;">${text}</span>
    </div>`;

  switch (type) {
    case "bay_booking":
      return {
        subject: `[BGS] Bay Booking — ${p.customer_name} · ${p.date} · ${p.time}`,
        html: emailBase(`
          ${badge("New Bay Booking")}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            ${detailRow("Customer", p.customer_name)}
            ${detailRow("Bay", p.bay)}
            ${detailRow("Date", p.date)}
            ${detailRow("Time", p.time)}
            ${detailRow("Duration", p.duration)}
            ${detailRow("Total", p.total)}
            ${p.credits_used ? detailRow("Credits Used", p.credits_used) : ""}
          </table>
        `),
      };
    case "lesson_booking":
      return {
        subject: `[BGS] Lesson Booked — ${p.customer_name} · ${p.coach} · ${p.date}`,
        html: emailBase(`
          ${badge("New Lesson Booking")}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            ${detailRow("Customer", p.customer_name)}
            ${detailRow("Coach", p.coach)}
            ${detailRow("Bay", p.bay)}
            ${detailRow("Date", p.date)}
            ${detailRow("Time", p.time)}
            ${detailRow("Payment", p.payment_method)}
            ${detailRow("Total", p.total)}
          </table>
        `),
      };
    case "membership":
      return {
        subject: `[BGS] New Membership — ${p.customer_name} · ${p.plan}`,
        html: emailBase(`
          ${badge("New Membership")}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            ${detailRow("Customer", p.customer_name)}
            ${detailRow("Plan", p.plan)}
            ${detailRow("Monthly Rate", p.price)}
            ${detailRow("Next Renewal", p.renewal)}
            ${p.enrollment_fee ? detailRow("Enrollment Fee", p.enrollment_fee) : ""}
          </table>
        `),
      };
    case "lesson_package":
      return {
        subject: `[BGS] Lesson Package — ${p.customer_name} · ${p.package} · ${p.coach}`,
        html: emailBase(`
          ${badge("Lesson Package Purchased")}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            ${detailRow("Customer", p.customer_name)}
            ${detailRow("Package", p.package)}
            ${detailRow("Instructor", p.coach)}
            ${detailRow("Credits", p.credits + " lessons")}
            ${detailRow("Expires", p.expiry)}
            ${detailRow("Total Paid", p.total)}
          </table>
        `),
      };
    case "cancellation":
      return {
        subject: `[BGS] Cancellation — ${p.customer_name} · ${p.booking_type} · ${p.date}`,
        html: emailBase(`
          ${badge("Booking Cancelled", "#E03928")}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            ${detailRow("Customer", p.customer_name)}
            ${detailRow("Type", p.booking_type)}
            ${p.bay ? detailRow("Bay", p.bay) : ""}
            ${detailRow("Date", p.date)}
            ${detailRow("Time", p.time)}
            ${detailRow("Refund", p.refund_info)}
          </table>
        `),
      };
    case "cancellation_membership":
      return {
        subject: `[BGS] Membership Cancelled — ${p.customer_name} · ${p.tier}`,
        html: emailBase(`
          ${badge("Membership Cancelled", "#E03928")}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            ${detailRow("Customer", p.customer_name)}
            ${detailRow("Plan", p.tier)}
            ${p.renewal_date ? detailRow("Access Until", p.renewal_date) : ""}
            ${detailRow("Immediate", p.within_window ? "No — scheduled" : "Yes")}
          </table>
        `),
      };
    case "booking_change":
      return {
        subject: `[BGS] Booking Changed (Admin) — ${p.customer_name} · ${p.date}`,
        html: emailBase(`
          ${badge("Booking Modified by Admin")}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            ${detailRow("Customer", p.customer_name)}
            ${detailRow("Type", p.booking_type)}
            ${p.bay ? detailRow("Bay", p.bay) : ""}
            ${detailRow("Date", p.date)}
            ${detailRow("New Time", p.new_time)}
            ${p.duration ? detailRow("Duration", p.duration) : ""}
            ${p.coach ? detailRow("Coach", p.coach) : ""}
          </table>
        `),
      };
    default:
      return { subject: `[BGS Admin] ${type}`, html: customerHtml };
  }
}

async function sendEmail(to: string, type: string, params: any, sendAdmin = true) {
  if (!RESEND_API_KEY) return;
  const { subject, html } = buildEmail(type, params);

  // Send to customer
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  }).catch(e => console.error("Customer email failed:", e));

  // Send admin notification
  if (sendAdmin && ADMIN_EMAIL) {
    const { subject: adminSubject, html: adminHtml } = buildAdminEmail(type, params, html);
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: ADMIN_EMAIL, subject: adminSubject, html: adminHtml }),
    }).catch(e => console.error("Admin email failed:", e));
  }
}

async function sendAdminOnly(type: string, params: any) {
  if (!RESEND_API_KEY || !ADMIN_EMAIL) return;
  const { subject, html } = buildAdminEmail(type, params, "");
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: ADMIN_EMAIL, subject, html }),
  }).catch(e => console.error("Admin email failed:", e));
}


/* ─── OTP Rate Limiting ─── */
const otpRateMap = new Map<string, { count: number; firstAt: number }>();
const OTP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX = 3;

function checkOtpRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = otpRateMap.get(phone);
  if (!entry || now - entry.firstAt > OTP_WINDOW_MS) {
    otpRateMap.set(phone, { count: 1, firstAt: now });
    return true;
  }
  if (entry.count >= OTP_MAX) return false;
  entry.count++;
  return true;
}

/* ─── Twilio Verify helpers ─── */
async function twilioVerifyRequest(path: string, body: URLSearchParams, method = "POST") {
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(`https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}${path}`, {
    method,
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return await res.json();
}


/* ─── Supabase helpers ─── */
async function sbGet(table: string, query: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  return await res.json();
}

async function sbUpdate(table: string, id: string, data: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify(data),
  });
  return await res.json();
}

async function sbInsert(table: string, data: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify(data),
  });
  return await res.json();
}

/* ─── Tier config ─── */
const TIER_CONFIG: Record<string, { price: number; credits: number }> = {
  starter:      { price: 45,  credits: 0 },
  early_birdie: { price: 150, credits: 0 },
  player:       { price: 200, credits: 8 },
  champion:     { price: 600, credits: 0 },
};

/* ─── Add months helper ─── */
function addOneMonth(dateStr: string): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

/* ─── Process renewals ─── */
async function processRenewals(): Promise<{ processed: number; errors: string[] }> {
  const today = new Date().toISOString().split("T")[0];
  const errors: string[] = [];
  let processed = 0;

  // Fetch all customers due for renewal today or overdue
  const customers = await sbGet(
    "customers",
    `renewal_date=eq.${today}&tier=not.is.null&select=*`
  );

  if (!Array.isArray(customers) || customers.length === 0) {
    return { processed: 0, errors: [] };
  }

  for (const customer of customers) {
    const {
      id,
      tier,
      pending_tier,
      cancel_at_renewal,
      square_customer_id,
      square_card_id,
      renewal_date,
      email,
      first_name,
    } = customer;

    try {
      // ── Idempotency check: skip if already processed today ──
      const existingLog = await sbGet(
        "membership_history",
        `customer_id=eq.${id}&action=in.(renewed,renewed_with_switch,cancelled,suspended_payment_failed)&created_at=gte.${today}T00:00:00Z&select=id`
      );
      if (Array.isArray(existingLog) && existingLog.length > 0) {
        console.log(`Skipping customer ${id} — already processed today`);
        continue;
      }

      // ── Case 1: Cancel at renewal ──
      if (cancel_at_renewal) {
        await sbUpdate("customers", id, {
          tier: null,
          pending_tier: null,
          renewal_date: null,
          bay_credits_remaining: 0,
          bay_credits_total: 0,
          cancel_at_renewal: false,
          cancellation_scheduled: false,
          square_card_id: null,
        });
        await sbInsert("membership_history", {
          customer_id: id,
          action: "cancelled",
          tier,
          notes: `Membership cancelled at renewal on ${today}`,
        });
        processed++;
        continue;
      }

      // ── Case 2 & 3: Active renewal (with or without pending tier switch) ──
      const effectiveTier = pending_tier || tier;
      const tierConf = TIER_CONFIG[effectiveTier];
      if (!tierConf) {
        errors.push(`Unknown tier ${effectiveTier} for customer ${id}`);
        continue;
      }

      // Skip if no card on file
      if (!square_card_id) {
        errors.push(`No card on file for customer ${id} — skipping`);
        continue;
      }

      // Create order with catalog item then pay — properly linked in Square Dashboard
      const renewMemSku = MEMBERSHIP_RENEWAL_SKUS[effectiveTier];
      if (!renewMemSku) {
        errors.push(`No renewal SKU for tier ${effectiveTier} — customer ${id}`);
        continue;
      }
      const membershipVariationId = await skuToVariationId(renewMemSku);
      if (!membershipVariationId) {
        errors.push(`SKU lookup failed for tier ${effectiveTier} — customer ${id}`);
        continue;
      }
      const orderRes = await squareRequest("/orders", "POST", {
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: LOCATION_ID,
          customer_id: square_customer_id,
          reference_id: "BGS Admin App",
          line_items: [{ quantity: "1", catalog_object_id: membershipVariationId, item_type: "ITEM" }],
        },
      });
      const orderId = orderRes?.order?.id;
      const totalMoney = orderRes?.order?.total_money;
      if (!orderId) {
        errors.push(`Order creation failed for customer ${id}: ${JSON.stringify(orderRes)}`);
        continue;
      }
      const paymentRes = await squareRequest("/payments", "POST", {
        idempotency_key: crypto.randomUUID(),
        source_id: square_card_id,
        amount_money: totalMoney,
        customer_id: square_customer_id,
        location_id: LOCATION_ID,
        order_id: orderId,
        reference_id: "BGS Admin App",
        note: `${effectiveTier} membership renewal — ${today}`,
        autocomplete: true,
      });

      const payment = paymentRes?.payment;
      const paymentStatus = payment?.status;

      if (paymentStatus === "COMPLETED") {
        // Payment succeeded — update membership
        const newRenewalDate = addOneMonth(renewal_date);
        await sbUpdate("customers", id, {
          tier: effectiveTier,
          pending_tier: null,
          renewal_date: newRenewalDate,
          bay_credits_remaining: tierConf.credits,
          bay_credits_total: tierConf.credits,
          cancel_at_renewal: false,
          cancellation_scheduled: false,
        });
        await sbInsert("membership_history", {
          customer_id: id,
          action: pending_tier ? "renewed_with_switch" : "renewed",
          tier: effectiveTier,
          amount: tierConf.price,
          square_payment_id: payment.id,
          notes: pending_tier
            ? `Switched from ${tier} to ${effectiveTier} and renewed on ${today}`
            : `Renewed on ${today} — next renewal ${newRenewalDate}`,
        });
        processed++;
      } else {
        // Payment failed — suspend immediately
        const failReason = paymentRes?.errors?.[0]?.detail || "Payment failed";
        await sbUpdate("customers", id, {
          tier: null,
          pending_tier: null,
          renewal_date: null,
          bay_credits_remaining: 0,
          bay_credits_total: 0,
          square_card_id: null,
          cancel_at_renewal: false,
          cancellation_scheduled: false,
        });
        await sbInsert("membership_history", {
          customer_id: id,
          action: "suspended_payment_failed",
          tier,
          notes: `Payment failed on renewal ${today}: ${failReason}`,
        });
        errors.push(`Payment failed for customer ${id} (${first_name}): ${failReason}`);
      }
    } catch (err: any) {
      errors.push(`Error processing customer ${id}: ${err.message}`);
    }
  }

  // Send summary email to admin
  const successCount = processed;
  const failCount = errors.length;
  const totalCount = successCount + failCount;

  if (totalCount > 0 && RESEND_API_KEY) {
    const errorRows = errors.map(e => `<tr><td style="padding:6px 0;font-size:13px;color:#E03928;border-bottom:1px solid #f2f2f0;">${e}</td></tr>`).join("");
    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="background:#072814;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:3px;color:#ffffff;">BIRDIE GOLF STUDIOS</p>
          <p style="margin:6px 0 0;font-size:11px;color:#ffffff88;">Daily Renewal Report</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#072814;">Renewal Summary — ${today}</p>
          <p style="margin:0 0 24px;font-size:14px;color:#555;">${totalCount} renewal${totalCount !== 1 ? "s" : ""} processed: <strong>${successCount} succeeded</strong>, <strong style="color:${failCount > 0 ? "#E03928" : "#555"}">${failCount} failed</strong>.</p>
          ${failCount > 0 ? `
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#E03928;">Failed Renewals:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${errorRows}</table>
          ` : `<p style="font-size:14px;color:#3AE58D;font-weight:600;">✓ All renewals processed successfully.</p>`}
          <p style="margin:16px 0 0;font-size:12px;color:#aaa;">This is an automated report from the BGS renewal system.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: "info@birdiegolfstudios.com",
        subject: `[BGS] Renewal Report ${today} — ${successCount} succeeded, ${failCount} failed`,
        html: emailHtml,
      }),
    });
  }

  return { processed, errors };
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { action, ...params } = await req.json();
    // Verify request comes from the BGS app — skip only for renewal.run (secured by CRON_SECRET)
    if (action !== "renewal.run") {
      const apiKey = req.headers.get("x-bgs-key") || "";
      if (!BGS_API_SECRET || apiKey !== BGS_API_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    let result;
    switch (action) {
      case "customer.create": result = await squareRequest("/customers", "POST", { given_name: params.first_name, family_name: params.last_name, phone_number: params.phone ? `+1${params.phone}` : undefined, email_address: params.email || undefined, reference_id: params.supabase_id || undefined, idempotency_key: crypto.randomUUID() }); break;
      case "customer.get": result = await squareRequest(`/customers/${params.square_customer_id}`, "GET"); break;
      case "customer.search": result = await squareRequest("/customers/search", "POST", { query: { filter: { phone_number: params.phone ? { exact: `+1${params.phone}` } : undefined, email_address: params.email ? { exact: params.email } : undefined } } }); break;
      case "customer.update": result = await squareRequest(`/customers/${params.square_customer_id}`, "PUT", { given_name: params.first_name, family_name: params.last_name, phone_number: params.phone ? `+1${params.phone}` : undefined, email_address: params.email || undefined }); break;
      case "card.create": result = await squareRequest("/cards", "POST", { idempotency_key: crypto.randomUUID(), source_id: params.source_id, card: { customer_id: params.square_customer_id } }); break;
      case "card.list": result = await squareRequest(`/cards?customer_id=${params.square_customer_id}`, "GET"); break;
      case "card.disable": result = await squareRequest(`/cards/${params.card_id}/disable`, "POST", {}); break;
      case "order.create": {
        // Build line items — supports both catalog variation IDs and custom amounts
        const lineItems = (params.line_items || []).map((item: any) => {
          if (item.catalog_variation_id) {
            return {
              quantity: String(item.quantity || 1),
              catalog_object_id: item.catalog_variation_id,
              item_type: "ITEM",
            };
          }
          return {
            name: item.name,
            quantity: "1",
            base_price_money: { amount: Math.round(item.amount * 100), currency: "USD" },
          };
        });
        const orderBody: any = {
          idempotency_key: crypto.randomUUID(),
          order: {
            location_id: LOCATION_ID,
            customer_id: params.square_customer_id || undefined,
            reference_id: "BGS Admin App",
            line_items: lineItems,
            // Taxes applied by Square at catalog level
          },
        };
        result = await squareRequest("/orders", "POST", orderBody);
        break;
      }

      case "bay.charge": {
        // Create order with catalog bay slot items + pay with card on file
        // Route to the correct SKU based on membership tier and peak/non-peak
        const isPeak = params.is_peak === true;
        const slots = params.slots || 1; // number of 30-min slots
        const tier = (params.tier || "public") as string;
        let baySkuKey: string;
        if (tier === "starter")       baySkuKey = isPeak ? "starter_peak"       : "starter_nonpeak";
        else if (tier === "early_birdie") baySkuKey = "early_birdie_nonpeak"; // EB only has non-peak
        else if (tier === "player")   baySkuKey = isPeak ? "player_peak"        : "player_nonpeak";
        else if (tier === "champion") baySkuKey = isPeak ? "champion_peak"      : "champion_nonpeak";
        else                          baySkuKey = isPeak ? "public_peak"        : "public_nonpeak";
        const baySku = BAY_SKUS[baySkuKey];
        const variationId = await skuToVariationId(baySku);
        if (!variationId) { result = { error: `SKU lookup failed for: ${baySku}` }; break; }
        const orderRes = await squareRequest("/orders", "POST", {
          idempotency_key: crypto.randomUUID(),
          order: {
            location_id: LOCATION_ID,
            customer_id: params.square_customer_id,
            reference_id: "BGS Admin App",
            line_items: [{ quantity: String(slots), catalog_object_id: variationId, item_type: "ITEM" }],
          },
        });
        const orderId = orderRes?.order?.id;
        const totalMoney = orderRes?.order?.total_money;
        if (!orderId) { result = { error: "Order creation failed", detail: orderRes }; break; }
        const payRes = await squareRequest("/payments", "POST", {
          idempotency_key: crypto.randomUUID(),
          source_id: params.card_id,
          amount_money: totalMoney,
          customer_id: params.square_customer_id,
          location_id: LOCATION_ID,
          order_id: orderId,
          reference_id: "BGS Admin App",
          autocomplete: true,
        });
        result = { order: orderRes?.order, payment: payRes?.payment };
        break;
      }

      case "membership.charge": {
        // Charge membership signup via catalog item (SKU lookup)
        // Enrollment fee is handled automatically by Square modifier on the membership item
        const tier = params.tier as string;
        const memSku = MEMBERSHIP_SKUS[tier];
        if (!memSku) { result = { error: `Unknown tier: ${tier}` }; break; }
        const variationId = await skuToVariationId(memSku);
        if (!variationId) { result = { error: `SKU lookup failed for membership: ${memSku}` }; break; }
        // Single line item — Square modifier adds enrollment fee automatically
        const lineItems: any[] = [{ quantity: "1", catalog_object_id: variationId, item_type: "ITEM" }];
        const orderRes = await squareRequest("/orders", "POST", {
          idempotency_key: crypto.randomUUID(),
          order: {
            location_id: LOCATION_ID,
            customer_id: params.square_customer_id,
            reference_id: "BGS Admin App",
            line_items: lineItems,
          },
        });
        const orderId = orderRes?.order?.id;
        const totalMoney = orderRes?.order?.total_money;
        if (!orderId) { result = { error: "Order creation failed", detail: orderRes }; break; }
        const payRes = await squareRequest("/payments", "POST", {
          idempotency_key: crypto.randomUUID(),
          source_id: params.card_id,
          amount_money: totalMoney,
          customer_id: params.square_customer_id,
          location_id: LOCATION_ID,
          order_id: orderId,
          reference_id: "BGS Admin App",
          note: `${tier} membership`,
          autocomplete: true,
        });
        result = { order: orderRes?.order, payment: payRes?.payment };
        break;
      }

      case "lesson.purchase": {
        // Purchase lesson package via catalog item — differentiated by coach and member status
        const coach = params.coach_id as keyof typeof LESSON_SKUS; // "NC" or "SE"
        const isMember = params.is_member === true;
        const hours = params.hours; // 1, 3, or 5
        const pkgKey = `${hours}hr_${isMember ? "member" : "nonmember"}` as keyof typeof LESSON_SKUS["NC"];
        const coachSkus = LESSON_SKUS[coach];
        if (!coachSkus) { result = { error: `Unknown coach: ${coach}` }; break; }
        const lesSku = coachSkus[pkgKey];
        if (!lesSku) { result = { error: `Unknown package: ${pkgKey}` }; break; }
        const variationId = await skuToVariationId(lesSku);
        if (!variationId) { result = { error: `SKU lookup failed for lesson: ${lesSku}` }; break; }
        const orderRes = await squareRequest("/orders", "POST", {
          idempotency_key: crypto.randomUUID(),
          order: {
            location_id: LOCATION_ID,
            customer_id: params.square_customer_id,
            reference_id: "BGS Admin App",
            line_items: [{ quantity: "1", catalog_object_id: variationId, item_type: "ITEM" }],
            // Taxes applied by Square at catalog level
          },
        });
        const orderId = orderRes?.order?.id;
        const totalMoney = orderRes?.order?.total_money;
        if (!orderId) { result = { error: "Order creation failed", detail: orderRes }; break; }
        const payRes = await squareRequest("/payments", "POST", {
          idempotency_key: crypto.randomUUID(),
          source_id: params.card_id,
          amount_money: totalMoney,
          customer_id: params.square_customer_id,
          location_id: LOCATION_ID,
          order_id: orderId,
          reference_id: "BGS Admin App",
          note: `${hours}-hr lesson package — ${coach}`,
          autocomplete: true,
        });
        result = { order: orderRes?.order, payment: payRes?.payment };
        break;
      }
      case "payment.create": result = await squareRequest("/payments", "POST", { idempotency_key: crypto.randomUUID(), source_id: params.card_id || params.source_id, amount_money: { amount: Math.round(params.amount * 100), currency: "USD" }, customer_id: params.square_customer_id, location_id: LOCATION_ID, order_id: params.order_id || undefined, reference_id: params.booking_id || undefined, note: params.note || undefined, autocomplete: true }); break;
      case "payment.refund": result = await squareRequest("/refunds", "POST", { idempotency_key: crypto.randomUUID(), payment_id: params.payment_id, amount_money: { amount: Math.round(params.amount * 100), currency: "USD" }, reason: params.reason || "Booking cancellation" }); break;
      case "subscription.create": result = await squareRequest("/subscriptions", "POST", { idempotency_key: crypto.randomUUID(), location_id: LOCATION_ID, customer_id: params.square_customer_id, plan_variation_id: params.plan_id, card_id: params.card_id, start_date: params.start_date || new Date().toISOString().split("T")[0] }); break;
      case "subscription.cancel": result = await squareRequest(`/subscriptions/${params.subscription_id}/cancel`, "POST", {}); break;
      case "location.get": result = await squareRequest(`/locations/${LOCATION_ID}`, "GET"); break;

      case "otp.send": {
        result = { sent: true, sid: "demo", demo: true };
        break;
      }

      case "otp.verify": {
        result = { approved: (params.code || "").length === 6, demo: true };
        break;
      }

      case "email.send":
        if (params.admin_only) {
          await sendAdminOnly(params.type, params);
        } else if (params.customer_email) {
          await sendEmail(params.customer_email, params.type, params, params.send_admin !== false);
        }
        result = { sent: true };
        break;

      case "db.get": {
        const dbGetRes = await fetch(`${SUPABASE_URL}/rest/v1/${params.table}?${params.query || ""}`, {
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
        });
        result = await dbGetRes.json();
        break;
      }

      case "db.post": {
        const dbPostRes = await fetch(`${SUPABASE_URL}/rest/v1/${params.table}`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
          body: JSON.stringify(params.data),
        });
        result = await dbPostRes.json();
        break;
      }

      case "db.patch": {
        const dbPatchRes = await fetch(`${SUPABASE_URL}/rest/v1/${params.table}?${params.query || ""}`, {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
          body: JSON.stringify(params.data),
        });
        result = await dbPatchRes.json();
        break;
      }

      case "db.delete": {
        await fetch(`${SUPABASE_URL}/rest/v1/${params.table}?${params.query || ""}`, {
          method: "DELETE",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
        });
        result = { deleted: true };
        break;
      }

      case "renewal.run": {
        // Secured with a secret token to prevent unauthorized triggers
        const cronSecret = Deno.env.get("CRON_SECRET") || "";
        if (params.secret !== cronSecret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const renewalResult = await processRenewals();
        result = renewalResult;
        break;
      }

      default: return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

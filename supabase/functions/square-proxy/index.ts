// Supabase Edge Function: square-proxy
// Deploy: supabase functions deploy square-proxy
// This proxies Square API calls from the browser, keeping the access token server-side.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SQUARE_ACCESS_TOKEN = "EAAAl2a0bCEOqL9B5-mRLy46pBbgTCboDNScOGe9wKkCIzACgzXQ7TtLCpTSnBkv";
const SQUARE_BASE_URL = "https://connect.squareupsandbox.com/v2"; // Change to https://connect.squareup.com/v2 for production
const LOCATION_ID = "LHYS7H99XC8WD";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function squareRequest(endpoint: string, method: string, body?: any) {
  const res = await fetch(`${SQUARE_BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Square-Version": "2024-01-18",
      "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return await res.json();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      // ─── CUSTOMERS ───
      case "customer.create": {
        result = await squareRequest("/customers", "POST", {
          given_name: params.first_name,
          family_name: params.last_name,
          phone_number: params.phone ? `+1${params.phone}` : undefined,
          email_address: params.email || undefined,
          reference_id: params.supabase_id || undefined,
          idempotency_key: crypto.randomUUID(),
        });
        break;
      }

      case "customer.get": {
        result = await squareRequest(`/customers/${params.square_customer_id}`, "GET");
        break;
      }

      case "customer.search": {
        result = await squareRequest("/customers/search", "POST", {
          query: {
            filter: {
              phone_number: params.phone ? { exact: `+1${params.phone}` } : undefined,
              email_address: params.email ? { exact: params.email } : undefined,
            },
          },
        });
        break;
      }

      case "customer.update": {
        result = await squareRequest(`/customers/${params.square_customer_id}`, "PUT", {
          given_name: params.first_name,
          family_name: params.last_name,
          phone_number: params.phone ? `+1${params.phone}` : undefined,
          email_address: params.email || undefined,
        });
        break;
      }

      // ─── CARDS (saved payment methods) ───
      case "card.create": {
        // source_id comes from Square Web Payments SDK tokenization
        result = await squareRequest("/cards", "POST", {
          idempotency_key: crypto.randomUUID(),
          source_id: params.source_id, // nonce from Web Payments SDK
          card: {
            customer_id: params.square_customer_id,
          },
        });
        break;
      }

      case "card.list": {
        result = await squareRequest(`/cards?customer_id=${params.square_customer_id}`, "GET");
        break;
      }

      case "card.disable": {
        result = await squareRequest(`/cards/${params.card_id}/disable`, "POST", {});
        break;
      }

      // ─── PAYMENTS ───
      case "payment.create": {
        result = await squareRequest("/payments", "POST", {
          idempotency_key: crypto.randomUUID(),
          source_id: params.card_id || params.source_id, // card on file ID or nonce
          amount_money: {
            amount: Math.round(params.amount * 100), // Square uses cents
            currency: "USD",
          },
          customer_id: params.square_customer_id,
          location_id: LOCATION_ID,
          reference_id: params.booking_id || undefined,
          note: params.note || undefined,
          autocomplete: true,
        });
        break;
      }

      case "payment.refund": {
        result = await squareRequest("/refunds", "POST", {
          idempotency_key: crypto.randomUUID(),
          payment_id: params.payment_id,
          amount_money: {
            amount: Math.round(params.amount * 100),
            currency: "USD",
          },
          reason: params.reason || "Booking cancellation",
        });
        break;
      }

      // ─── SUBSCRIPTIONS (memberships) ───
      case "subscription.create": {
        // Requires a subscription plan (catalog object) to be set up in Square
        result = await squareRequest("/subscriptions", "POST", {
          idempotency_key: crypto.randomUUID(),
          location_id: LOCATION_ID,
          customer_id: params.square_customer_id,
          plan_variation_id: params.plan_id, // Square catalog plan variation ID
          card_id: params.card_id,
          start_date: params.start_date || new Date().toISOString().split("T")[0],
        });
        break;
      }

      case "subscription.cancel": {
        result = await squareRequest(`/subscriptions/${params.subscription_id}/cancel`, "POST", {});
        break;
      }

      case "subscription.get": {
        result = await squareRequest(`/subscriptions/${params.subscription_id}`, "GET");
        break;
      }

      // ─── CATALOG (for lesson packages, membership plans) ───
      case "catalog.list": {
        result = await squareRequest(`/catalog/list?types=${params.types || "ITEM"}`, "GET");
        break;
      }

      // ─── LOCATION INFO ───
      case "location.get": {
        result = await squareRequest(`/locations/${LOCATION_ID}`, "GET");
        break;
      }

      // ─── EMAIL (Resend) ───
      case "email.send": {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
        const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "info@birdiegolfstudios.com";
        const FROM_EMAIL = "Birdie Golf Studios <bookings@birdiegolfstudios.com>";

        const { type: emailType, customer_email, customer_name, ...details } = params;

        let subject = "";
        let html = "";

        const baseStyle = `font-family: 'DM Sans', Arial, sans-serif; color: #1a1a1a;`;
        const header = `
          <div style="background: linear-gradient(135deg,#0B2E1A,#2D8A5E); padding: 28px 32px; border-radius: 12px 12px 0 0;">
            <p style="font-family: monospace; font-size: 13px; font-weight: 700; letter-spacing: 3px; color: #fff; margin: 0;">BIRDIE GOLF STUDIOS</p>
            <p style="font-size: 11px; color: #ffffff99; margin: 4px 0 0;">Wynwood, Miami, FL</p>
          </div>`;
        const footer = `
          <div style="padding: 20px 32px; background: #f8f8f6; border-radius: 0 0 12px 12px; border-top: 1px solid #e8e8e6;">
            <p style="font-size: 11px; color: #aaa; margin: 0;">45 NE 26th St., Unit C, Miami, FL 33137</p>
            <p style="font-size: 11px; color: #aaa; margin: 4px 0 0;">info@birdiegolfstudios.com · (305) 456-4149</p>
          </div>`;

        const row = (label: string, value: string) =>
          `<tr><td style="padding: 8px 0; font-size: 13px; color: #888; width: 140px;">${label}</td><td style="padding: 8px 0; font-size: 13px; font-weight: 600;">${value}</td></tr>`;

        if (emailType === "bay_booking") {
          subject = `Bay Booking Confirmed - ${details.date}`;
          const rows = [
            row("Date", details.date || ""),
            row("Time", details.time || ""),
            row("Duration", details.duration || ""),
            row("Bay", details.bay || ""),
            ...(details.credits_used ? [row("Credits Applied", details.credits_used)] : []),
            row("Total Charged", details.total || ""),
          ].join("");
          html = `
            <div style="${baseStyle} max-width: 560px; margin: 0 auto; border: 1px solid #e8e8e6; border-radius: 12px;">
              ${header}
              <div style="padding: 28px 32px;">
                <h2 style="font-size: 20px; font-weight: 700; color: #0B2E1A; margin: 0 0 6px;">Booking Confirmed</h2>
                <p style="font-size: 14px; color: #555; margin: 0 0 24px;">Hi ${customer_name}, your bay is reserved. See you on the course!</p>
                <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #f0f0ee;">${rows}</table>
                <div style="margin-top: 20px; padding: 14px 16px; background: #2D8A5E0A; border: 1px solid #2D8A5E22; border-radius: 10px;">
                  <p style="font-size: 12px; color: #555; margin: 0; line-height: 1.6;">Cancellations within 24 hours are non-refundable. To cancel, reply to this email or call us at (305) 456-4149.</p>
                </div>
              </div>
              ${footer}
            </div>`;
        } else if (emailType === "lesson_booking") {
          subject = `Lesson Confirmed - ${details.date}`;
          const rows = [
            row("Coach", details.coach || ""),
            row("Date", details.date || ""),
            row("Time", details.time || ""),
            row("Duration", "1 Hour"),
            row("Bay", details.bay || ""),
            row("Payment", details.payment_method || ""),
            row("Total", details.total || ""),
          ].join("");
          html = `
            <div style="${baseStyle} max-width: 560px; margin: 0 auto; border: 1px solid #e8e8e6; border-radius: 12px;">
              ${header}
              <div style="padding: 28px 32px;">
                <h2 style="font-size: 20px; font-weight: 700; color: #0B2E1A; margin: 0 0 6px;">Lesson Confirmed</h2>
                <p style="font-size: 14px; color: #555; margin: 0 0 24px;">Hi ${customer_name}, your lesson is booked. Get ready to work on your game!</p>
                <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #f0f0ee;">${rows}</table>
                <div style="margin-top: 20px; padding: 14px 16px; background: #5B6DCD0A; border: 1px solid #5B6DCD22; border-radius: 10px;">
                  <p style="font-size: 12px; color: #555; margin: 0; line-height: 1.6;">Late cancellation (within 24 hrs) will incur a fee. Credits are not restored for late cancellations.</p>
                </div>
              </div>
              ${footer}
            </div>`;
        } else if (emailType === "membership") {
          subject = `Membership Confirmed - ${details.plan}`;
          const rows = [
            row("Plan", details.plan || ""),
            row("Monthly Rate", details.price || ""),
            row("Next Renewal", details.renewal || ""),
          ].join("");
          html = `
            <div style="${baseStyle} max-width: 560px; margin: 0 auto; border: 1px solid #e8e8e6; border-radius: 12px;">
              ${header}
              <div style="padding: 28px 32px;">
                <h2 style="font-size: 20px; font-weight: 700; color: #0B2E1A; margin: 0 0 6px;">Welcome to the Club</h2>
                <p style="font-size: 14px; color: #555; margin: 0 0 24px;">Hi ${customer_name}, your membership is now active. Enjoy your member benefits!</p>
                <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #f0f0ee;">${rows}</table>
                <div style="margin-top: 20px; padding: 14px 16px; background: #2D8A5E0A; border: 1px solid #2D8A5E22; border-radius: 10px;">
                  <p style="font-size: 12px; color: #555; margin: 0; line-height: 1.6;">7-day cancellation notice required before your renewal date. To manage your membership, visit the app or contact us.</p>
                </div>
              </div>
              ${footer}
            </div>`;
        } else if (emailType === "lesson_package") {
          subject = `Lesson Package Purchased - ${details.package}`;
          const rows = [
            row("Package", details.package || ""),
            row("Credits", `${details.credits} lessons`),
            row("Instructor", details.coach || ""),
            row("Total Charged", details.total || ""),
            row("Expires", details.expiry || ""),
          ].join("");
          html = `
            <div style="${baseStyle} max-width: 560px; margin: 0 auto; border: 1px solid #e8e8e6; border-radius: 12px;">
              ${header}
              <div style="padding: 28px 32px;">
                <h2 style="font-size: 20px; font-weight: 700; color: #0B2E1A; margin: 0 0 6px;">Package Purchased</h2>
                <p style="font-size: 14px; color: #555; margin: 0 0 24px;">Hi ${customer_name}, your lesson credits are ready to use!</p>
                <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #f0f0ee;">${rows}</table>
              </div>
              ${footer}
            </div>`;
        } else {
          result = { error: "Unknown email type" };
          break;
        }

        // Admin notification (plain summary)
        const adminHtml = `
          <div style="${baseStyle} max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e8e8e6; border-radius: 12px;">
            <p style="font-family: monospace; font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #2D8A5E; margin: 0 0 16px;">BIRDIE GOLF STUDIOS — ADMIN</p>
            <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 12px;">${subject}</h3>
            <p style="font-size: 13px; color: #555; margin: 0 0 6px;"><strong>Customer:</strong> ${customer_name}</p>
            <p style="font-size: 13px; color: #555; margin: 0 0 6px;"><strong>Email:</strong> ${customer_email}</p>
            ${Object.entries(details).map(([k, v]) => v ? `<p style="font-size: 13px; color: #555; margin: 0 0 4px;"><strong>${k}:</strong> ${v}</p>` : "").join("")}
          </div>`;

        // Send customer email
        const customerRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [customer_email],
            subject,
            html,
          }),
        });

        // Send admin notification
        const adminRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [ADMIN_EMAIL],
            subject: `[BGS Admin] ${subject} — ${customer_name}`,
            html: adminHtml,
          }),
        });

        result = {
          customer: await customerRes.json(),
          admin: await adminRes.json(),
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

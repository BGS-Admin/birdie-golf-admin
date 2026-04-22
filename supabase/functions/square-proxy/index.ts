import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SQUARE_ACCESS_TOKEN = "EAAAl2a0bCEOqL9B5-mRLy46pBbgTCboDNScOGe9wKkCIzACgzXQ7TtLCpTSnBkv";
const SQUARE_BASE_URL = "https://connect.squareupsandbox.com/v2";
const LOCATION_ID = "LHYS7H99XC8WD";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "";
const FROM_EMAIL = "Birdie Golf Studios <info@birdiegolfstudios.com>";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
        <tr><td style="background:#0B2E1A;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <p style="margin:0;font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:3px;color:#ffffff;">BIRDIE GOLF STUDIOS</p>
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
  `<p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0B2E1A;">Hey ${name.split(" ")[0]} 👋</p>`;

const confirmBadge = (text: string, color = "#2D8A5E") =>
  `<div style="display:inline-block;background:${color}18;border:1px solid ${color}44;border-radius:8px;padding:6px 14px;margin-bottom:20px;">
    <span style="font-size:12px;font-weight:700;color:${color};">${text}</span>
  </div>`;

const ctaButton = (text: string, url = "https://birdie-golf-booking.vercel.app") =>
  `<div style="text-align:center;margin-top:24px;">
    <a href="${url}" style="background:#2D8A5E;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block;">
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
        ${confirmBadge("✓ Lesson Confirmed", "#5B6DCD")}
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
        ${confirmBadge("✓ Package Purchased", "#5B6DCD")}
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

    default:
      return { subject: "Birdie Golf Studios", html: emailBase("<p>Thank you for choosing Birdie Golf Studios.</p>") };
  }
}

async function sendEmail(to: string, type: string, params: any) {
  const { subject, html } = buildEmail(type, params);

  // Send to customer
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  // Send admin notification
  if (ADMIN_EMAIL) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `[BGS Admin] ${subject}`,
        html: emailBase(`
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#888;">ADMIN NOTIFICATION</p>
          <p style="margin:0 0 16px;font-size:14px;color:#1a1a1a;">
            <strong>${params.customer_name}</strong> — ${type.replace(/_/g, " ")}
          </p>
          ${html}
        `),
      }),
    });
  }
}


/* ─── SMS helper (Twilio) ─── */
async function sendSms(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const form = new URLSearchParams({ To: to.startsWith('+') ? to : `+1${to}`, From: TWILIO_PHONE_NUMBER, Body: body });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { action, ...params } = await req.json();
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
        // Build line items from params.line_items: [{ name, amount }]
        const lineItems = (params.line_items || []).map((item: { name: string; amount: number }) => ({
          name: item.name,
          quantity: "1",
          base_price_money: { amount: Math.round(item.amount * 100), currency: "USD" },
        }));
        const orderBody: any = {
          idempotency_key: crypto.randomUUID(),
          order: {
            location_id: LOCATION_ID,
            customer_id: params.square_customer_id || undefined,
            line_items: lineItems,
            taxes: [{
              uid: "bgs-tax",
              name: "Sales Tax",
              percentage: "7",
              scope: "ORDER",
            }],
          },
        };
        result = await squareRequest("/orders", "POST", orderBody);
        break;
      }
      case "payment.create": result = await squareRequest("/payments", "POST", { idempotency_key: crypto.randomUUID(), source_id: params.card_id || params.source_id, amount_money: { amount: Math.round(params.amount * 100), currency: "USD" }, customer_id: params.square_customer_id, location_id: LOCATION_ID, order_id: params.order_id || undefined, reference_id: params.booking_id || undefined, note: params.note || undefined, autocomplete: true }); break;
      case "payment.refund": result = await squareRequest("/refunds", "POST", { idempotency_key: crypto.randomUUID(), payment_id: params.payment_id, amount_money: { amount: Math.round(params.amount * 100), currency: "USD" }, reason: params.reason || "Booking cancellation" }); break;
      case "subscription.create": result = await squareRequest("/subscriptions", "POST", { idempotency_key: crypto.randomUUID(), location_id: LOCATION_ID, customer_id: params.square_customer_id, plan_variation_id: params.plan_id, card_id: params.card_id, start_date: params.start_date || new Date().toISOString().split("T")[0] }); break;
      case "subscription.cancel": result = await squareRequest(`/subscriptions/${params.subscription_id}/cancel`, "POST", {}); break;
      case "location.get": result = await squareRequest(`/locations/${LOCATION_ID}`, "GET"); break;

      case "sms.send": {
        // Send OTP code via Twilio
        const smsResult = await sendSms(params.phone, `Your Birdie Golf Studios verification code is: ${params.code}`);
        result = { sent: true, sid: smsResult?.sid };
        break;
      }

      case "email.send":
        if (params.customer_email) {
          await sendEmail(params.customer_email, params.type, params);
        }
        result = { sent: true };
        break;

      default: return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

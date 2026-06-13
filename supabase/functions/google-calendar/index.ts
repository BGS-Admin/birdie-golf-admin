// ═══════════════════════════════════════════════════════════
// BGS Google Calendar Edge Function
// Supabase Edge Function: google-calendar
// Adds/updates/deletes lesson events on Santiago's calendar
// + sends email notification to coach on each action
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bgs-key",
};

// ── Coach email map ───────────────────────────────────────────────────────────
const COACH_EMAILS: Record<string, string> = {
  "TMiznwW3c_E9-NTW": "santiespinosa.golf@gmail.com",
  "TMa5N23NEiU89Spy": "nicolas@birdiegolfstudios.com", // update when Nicolas is added
};

// ── Google JWT auth ───────────────────────────────────────────────────────────

async function getGoogleAccessToken(): Promise<string> {
  const credentials = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") || "{}");

  const now    = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim  = {
    iss:   credentials.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const headerB64  = encode(header);
  const claimB64   = encode(claim);
  const sigInput   = `${headerB64}.${claimB64}`;

  const pemBody  = credentials.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(sigInput)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${sigInput}.${sigB64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get Google access token: " + JSON.stringify(data));
  return data.access_token;
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

function toISODateTime(date: string, time: string): string {
  const [t, ap] = time.split(" ");
  let [h, m]    = t.split(":").map(Number);
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${date}T${hh}:${mm}:00`;
}

function buildEvent(params: {
  customerName: string;
  date: string;
  startTime: string;
  bay: number;
  bookingId: string;
  coachName: string;
}) {
  const { customerName, date, startTime, bay, bookingId, coachName } = params;
  const start = toISODateTime(date, startTime);
  const [datePart, timePart] = start.split("T");
  const [hh, mm]             = timePart.split(":");
  const endH                 = String(Number(hh) + 1).padStart(2, "0");
  const end                  = `${datePart}T${endH}:${mm}:00`;

  return {
    summary:     `🏌️ Lesson — ${customerName}`,
    description: `Coach: ${coachName}\nBay: ${bay}\nBooking ID: ${bookingId}\n\nManaged by BGS Booking System`,
    start:       { dateTime: start, timeZone: "America/New_York" },
    end:         { dateTime: end,   timeZone: "America/New_York" },
    colorId:     "2",
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 1440 }, // 24hrs before
        { method: "email", minutes: 60  },  // 1hr before
        { method: "popup", minutes: 30  },  // popup on phone
      ],
    },
  };
}

// ── Format date for email display ─────────────────────────────────────────────
function fmtDateDisplay(date: string, time: string): string {
  const d = new Date(date + "T12:00:00");
  const dateStr = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return `${dateStr} at ${time}`;
}

// ── Send coach notification email via Resend ──────────────────────────────────
async function sendCoachEmail(params: {
  action: string;
  coachId: string;
  booking: {
    customerName: string;
    date: string;
    startTime: string;
    bay: number;
    coachName: string;
    bookingId: string;
  };
}) {
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_KEY) return; // skip if not configured

  const { action, coachId, booking } = params;
  const coachEmail = COACH_EMAILS[coachId];
  if (!coachEmail) return;

  const dateDisplay = fmtDateDisplay(booking.date, booking.startTime);
  const bayDisplay  = `Bay ${booking.bay}`;

  let subject = "";
  let bodyText = "";

  if (action === "event.create") {
    subject  = `[BGS] New Lesson — ${booking.customerName} · ${dateDisplay}`;
    bodyText = `Hi ${booking.coachName.split(" ")[0]},\n\nYou have a new lesson booked:\n\nCustomer: ${booking.customerName}\nDate & Time: ${dateDisplay}\nBay: ${bayDisplay}\n\nThis has been added to your Google Calendar.\n\n— Birdie Golf Studios`;
  } else if (action === "event.update") {
    subject  = `[BGS] Lesson Updated — ${booking.customerName} · ${dateDisplay}`;
    bodyText = `Hi ${booking.coachName.split(" ")[0]},\n\nA lesson has been updated:\n\nCustomer: ${booking.customerName}\nNew Date & Time: ${dateDisplay}\nBay: ${bayDisplay}\n\nYour Google Calendar has been updated.\n\n— Birdie Golf Studios`;
  } else if (action === "event.delete") {
    subject  = `[BGS] Lesson Cancelled — ${booking.customerName} · ${dateDisplay}`;
    bodyText = `Hi ${booking.coachName.split(" ")[0]},\n\nA lesson has been cancelled:\n\nCustomer: ${booking.customerName}\nDate & Time: ${dateDisplay}\nBay: ${bayDisplay}\n\nThis has been removed from your Google Calendar.\n\n— Birdie Golf Studios`;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    "Birdie Golf Studios <info@birdiegolfstudios.com>",
      to:      [coachEmail],
      subject,
      text:    bodyText,
    }),
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const bgsKey = req.headers.get("x-bgs-key");
    if (bgsKey !== Deno.env.get("BGS_API_SECRET")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const body   = await req.json();
    const { action, calendarId, eventId, booking, coachId } = body;

    const token   = await getGoogleAccessToken();
    const calId   = encodeURIComponent(calendarId);
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`;
    const authHdr = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

    // ── Create event ──────────────────────────────────────────────────────────
    if (action === "event.create") {
      const event = buildEvent(booking);
      const res   = await fetch(baseUrl, {
        method:  "POST",
        headers: authHdr,
        body:    JSON.stringify(event),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Calendar create failed: " + JSON.stringify(data));

      // Send coach email (fire and forget)
      sendCoachEmail({ action, coachId, booking }).catch(console.error);

      return new Response(JSON.stringify({ ok: true, eventId: data.id }), { headers: CORS });
    }

    // ── Update event ──────────────────────────────────────────────────────────
    if (action === "event.update") {
      if (!eventId) throw new Error("eventId required for update");
      const event = buildEvent(booking);
      const res   = await fetch(`${baseUrl}/${eventId}`, {
        method:  "PUT",
        headers: authHdr,
        body:    JSON.stringify(event),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Calendar update failed: " + JSON.stringify(data));

      sendCoachEmail({ action, coachId, booking }).catch(console.error);

      return new Response(JSON.stringify({ ok: true, eventId: data.id }), { headers: CORS });
    }

    // ── Delete event ──────────────────────────────────────────────────────────
    if (action === "event.delete") {
      if (!eventId) throw new Error("eventId required for delete");
      const res = await fetch(`${baseUrl}/${eventId}`, {
        method:  "DELETE",
        headers: authHdr,
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error("Calendar delete failed: " + JSON.stringify(data));
      }

      // For delete, booking details are passed in so we can still email
      if (booking) sendCoachEmail({ action, coachId, booking }).catch(console.error);

      return new Response(JSON.stringify({ ok: true }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: CORS });

  } catch (err) {
    console.error("google-calendar error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

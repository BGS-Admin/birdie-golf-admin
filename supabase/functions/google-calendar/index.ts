// ═══════════════════════════════════════════════════════════
// BGS Google Calendar Edge Function
// Supabase Edge Function: google-calendar
// Adds/updates/deletes lesson events on Santiago's calendar
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bgs-key",
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

  // Import private key
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

  // Exchange JWT for access token
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

// Converts a date string (YYYY-MM-DD) + time string (e.g. "10:00 AM") → ISO 8601 in ET
function toISODateTime(date: string, time: string): string {
  const [t, ap] = time.split(" ");
  let [h, m]    = t.split(":").map(Number);
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  // Eastern Time — lessons are always at BGS in Miami (ET = UTC-4 in summer, UTC-5 in winter)
  // We store as local time with ET offset; Google Calendar will display correctly
  return `${date}T${hh}:${mm}:00`;
}

// Build the Google Calendar event body
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
  // Lessons are always 1 hour
  const [datePart, timePart] = start.split("T");
  const [hh, mm]             = timePart.split(":");
  const endH                 = String(Number(hh) + 1).padStart(2, "0");
  const end                  = `${datePart}T${endH}:${mm}:00`;

  return {
    summary:     `🏌️ Lesson — ${customerName}`,
    description: `Coach: ${coachName}\nBay: ${bay}\nBooking ID: ${bookingId}\n\nManaged by BGS Booking System`,
    start:       { dateTime: start, timeZone: "America/New_York" },
    end:         { dateTime: end,   timeZone: "America/New_York" },
    colorId:     "2", // sage green — fits the BGS brand
    reminders: {
      useDefault: false,
      overrides:  [{ method: "popup", minutes: 30 }],
    },
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Auth check
    const bgsKey = req.headers.get("x-bgs-key");
    if (bgsKey !== Deno.env.get("BGS_API_SECRET")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const body   = await req.json();
    const { action, calendarId, eventId, booking } = body;
    // calendarId — the coach's Google Calendar ID
    // booking    — { bookingId, customerName, date, startTime, bay, coachName }

    const token    = await getGoogleAccessToken();
    const calId    = encodeURIComponent(calendarId);
    const baseUrl  = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`;
    const authHdr  = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

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
      return new Response(JSON.stringify({ ok: true }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: CORS });

  } catch (err) {
    console.error("google-calendar error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});

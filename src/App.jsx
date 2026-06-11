import React, { useState, useRef, useCallback, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════
   BIRDIE GOLF STUDIOS — Customer Booking Website
   Responsive React app with Supabase backend
   ═══════════════════════════════════════════════════════════ */

/* ─── Supabase Client ─── */
const SUPABASE_URL = "https://dvaviudmsofyqttcazpw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXZpdWRtc29meXF0dGNhenB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODc1MTgsImV4cCI6MjA5MDM2MzUxOH0.SWrAlnKZ33cIAQmn0dAQFfcAZ6b8qBZcp6Dyq2gMb2g";

/* ─── Public tables readable directly with anon key (no sensitive data) ─── */
const PUBLIC_TABLES = ["admin_settings", "pricing_config", "coaches", "coach_schedules"];

const sb = {
  headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
  async get(table, query = "") {
    try {
      if (PUBLIC_TABLES.includes(table)) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: this.headers });
        return r.ok ? await r.json() : [];
      }
      return await square("db.get", { table, query });
    } catch { return []; }
  },
  async post(table, data) {
    try {
      if (PUBLIC_TABLES.includes(table)) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: this.headers, body: JSON.stringify(data) });
        return r.ok ? await r.json() : null;
      }
      return await square("db.post", { table, data });
    } catch { return null; }
  },
  async patch(table, query, data) {
    try {
      if (PUBLIC_TABLES.includes(table)) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { method: "PATCH", headers: this.headers, body: JSON.stringify(data) });
        return r.ok ? await r.json() : null;
      }
      return await square("db.patch", { table, query, data });
    } catch { return null; }
  },
  async del(table, query) {
    try {
      if (PUBLIC_TABLES.includes(table)) {
        await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { method: "DELETE", headers: this.headers });
        return true;
      }
      return await square("db.delete", { table, query });
    } catch { return false; }
  }
};

/* ─── Square Integration ─── */
// Analytics helpers
const trackMeta = (event, params = {}) => { try { if (window.fbq) window.fbq("track", event, params); } catch(e) {} };
const trackGA   = (event, params = {}) => { try { if (window.gtag) window.gtag("event", event, params); } catch(e) {} };

// Error reporting — sends alert email to staff
const reportError = async (type, context, error, square) => {
  try {
    const SUPABASE_URL = "https://dvaviudmsofyqttcazpw.supabase.co";
    const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXZpdWRtc29meXF0dGNhenB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODc1MTgsImV4cCI6MjA5MDM2MzUxOH0.SWrAlnKZ33cIAQmn0dAQFfcAZ6b8qBZcp6Dyq2gMb2g";
    await fetch(`${SUPABASE_URL}/functions/v1/square-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}`, "x-bgs-key": "bgs-app-2026-x9k3m7p" },
      body: JSON.stringify({
        action: "email.send",
        type: "app_error",
        error_type: type,
        context,
        error_detail: typeof error === "object" ? JSON.stringify(error) : String(error || ""),
        square_error: square ? JSON.stringify(square) : null,
        timestamp: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        url: window.location.href,
      }),
    });
  } catch(e) { /* never block the UI for a reporting failure */ }
};

const SQUARE_APP_ID = "sq0idp-prGGxuOWteVLYPoXaawqlQ";
const SQUARE_LOCATION_ID = "LTNVZZ9PJH2K8";
const SQUARE_FN_URL = `${SUPABASE_URL}/functions/v1/square-proxy`;
const BGS_API_KEY = "bgs-app-2026-x9k3m7p";

const square = async (action, params = {}) => {
  try {
    const r = await fetch(SQUARE_FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}`, "x-bgs-key": BGS_API_KEY },
      body: JSON.stringify({ action, ...params }),
    });
    const json = await r.json().catch(() => null);
    return json;
  } catch { return null; }
};

/* ─── Fonts & Icons ─── */
const ff = "'DM Sans',sans-serif", mono = "'JetBrains Mono',monospace";
const Ic = ({ d, z = 18 }) => <svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const X = {
  grid: z => <Ic z={z} d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
  cal: z => <Ic z={z} d="M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2zM16 2v4M8 2v4M3 10h18" />,
  user: z => <Ic z={z} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z" />,
  crown: z => <svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20M4 20l2-14 4 6 2-8 2 8 4-6 2 14" /></svg>,
  chk: z => <Ic z={z} d="M20 6L9 17l-5-5" />,
  card: z => <Ic z={z} d="M1 4h22a2 2 0 012 2v12a2 2 0 01-2 2H1a2 2 0 01-2-2V6a2 2 0 012-2zM1 10h22" />,
  x: z => <Ic z={z} d="M18 6L6 18M6 6l12 12" />,
  clock: z => <Ic z={z} d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2" />,
  mail: z => <Ic z={z} d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6" />,
  phone: z => <Ic z={z} d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />,
  whatsapp: z => <svg width={z} height={z} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  edit: z => <Ic z={z} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />,
  out: z => <Ic z={z} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  coach: z => <svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><path d="M9 13a5 5 0 00-5 5v2h10v-2a5 5 0 00-5-5z"/><circle cx="17" cy="10" r="2.5"/><path d="M17 14.5c-2 0-3.5 1.5-3.5 3.5v2H21v-2c0-2-1.5-3.5-3.5-3.5z"/></svg>,
  chevL: z => <Ic z={z} d="M15 18l-6-6 6-6" />,
  plus: z => <Ic z={z} d="M12 5v14M5 12h14" />,
  trash: z => <Ic z={z} d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />,
};

/* ─── Business Constants ─── */
const TIERS = {
  starter:      { n: "Starter",      c: "#C7BCA8", badge: "STR", price: 45,  hrs: 0,  disc: 0.20, perks: ["20% off hourly bay rate", "Club storage", "Members-only invites"] },
  early_birdie: { n: "Early Birdie", c: "#2D6A4F", badge: "EBD", price: 150, hrs: 0, enrollmentFee: 50, perks: ["Up to 2 non-peak hours per day", "20% off additional non-peak hours beyond 2 hrs", "20% off lessons", "15% off food & beverage", "10% off retail", "Club storage", "Members-only invites"] },
  player:       { n: "Player",       c: "#072814", badge: "PLR", price: 200, hrs: 8,  disc: 0.20, enrollmentFee: 75, perks: ["8 hours / month", "20% off additional hours", "20% off lessons", "15% off food & beverage", "10% off retail", "Club storage", "Members-only invites"] },
  champion:     { n: "Champion",     c: "#000000", badge: "CHP", price: 600, hrs: -1, disc: 0, maxBk: 2, perks: ["Unlimited hours", "20% off lessons", "15% off food & beverage", "10% off retail", "Club storage", "Members-only invites"] },
};

/* Default: coaches available all operating hours. Admin updates override via Supabase. */
const ALL_WD_SLOTS = ["8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM","9:30 PM"];
const ALL_WE_SLOTS = ["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM"];
const FULL_AV = { Mon: ALL_WD_SLOTS, Tue: ALL_WD_SLOTS, Wed: ALL_WD_SLOTS, Thu: ALL_WD_SLOTS, Fri: ALL_WD_SLOTS, Sat: ALL_WE_SLOTS, Sun: ALL_WE_SLOTS };

const COACHES = [
  { id: "TMiznwW3c_E9-NTW", n: "Santiago Espinoza", ini: "SE", av: { ...FULL_AV } },
  { id: "TMa5N23NEiU89Spy", n: "Nicolas Cavero", ini: "NC", av: { ...FULL_AV } },
];

/* ─── Time / Date Helpers ─── */
const ALL_TIMES = ["7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM","9:30 PM"];
const WK_TIMES = ALL_TIMES.filter(t => { const h = toH(t); return h >= 9 && h < 21; });
function toH(s) { const [t, ap] = s.split(" "); let [h, m] = t.split(":").map(Number); if (ap === "PM" && h !== 12) h += 12; if (ap === "AM" && h === 12) h = 0; return h + m / 60; }
function fmtDate(d) { return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
function fmtDateLong(d) { return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
function dateKey(d) { return d.toISOString().split("T")[0]; }
function dayName(d) { return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]; }
function isWeekend(d) { return d.getDay() === 0 || d.getDay() === 6; }
function gen14() { const a = [], t = new Date(); t.setHours(0,0,0,0); for (let i = 0; i < 14; i++) { const d = new Date(t); d.setDate(t.getDate() + i); a.push(d); } return a; }
function getHours(d, hoursConfig) {
  if (hoursConfig) {
    const wknd = isWeekend(d);
    const open  = toH(wknd ? (hoursConfig.weekend_open  || "9:00 AM")  : (hoursConfig.weekday_open  || "8:00 AM"));
    const close = toH(wknd ? (hoursConfig.weekend_close || "9:00 PM")  : (hoursConfig.weekday_close || "10:00 PM"));
    return ALL_TIMES.filter(s => { const h = toH(s); return h >= open && h < close; });
  }
  return isWeekend(d) ? WK_TIMES : ALL_TIMES.filter(t => { const h = toH(t); return h >= 8 && h < 22; });
}

/* ─── Availability Logic ─── */
function isBayBlocked(bayId, dt, slot, bayBlocks) {
  const dk = dateKey(dt);
  return bayBlocks.some(b => {
    if (!b.bays.includes(bayId)) return false;
    if (dk < b.from_date && dk < b.from) return false;
    if (dk > b.to_date && dk > b.to) return false;
    const from = b.from_date || b.from, to = b.to_date || b.to;
    if (dk < from || dk > to) return false;
    if (b.all_day || b.allDay) return true;
    const tf = b.time_from || b.timeFrom, tt = b.time_to || b.timeTo;
    if (!tf || !tt) return true;
    const sh = toH(tf), eh = toH(tt), th = toH(slot);
    return th >= sh && th < eh;
  });
}

function getBk(dt, slot, realBookings) {
  const dk = dt.toISOString().split("T")[0];
  const occupied = [];
  (realBookings || []).forEach(b => {
    if (b.status === "cancelled" || b.date !== dk || !b.bay) return;
    const allT = ["7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM","9:30 PM"];
    const bsi = allT.indexOf(b.start_time), si = allT.indexOf(slot);
    if (bsi >= 0 && si >= bsi && si < bsi + (b.duration_slots || 2)) occupied.push(b.bay);
  });
  return occupied;
}

function getAvailBays(dt, startSlot, durSlots, bayBlocks, realBookings, hoursConfig) {
  const hrs = getHours(dt, hoursConfig); const si = hrs.indexOf(startSlot);
  if (si === -1) return [];
  const needed = hrs.slice(si, si + durSlots);
  if (needed.length < durSlots) return [];
  return [1,2,3,4,5].map(bay => ({ bay, ok: needed.every(s => !getBk(dt, s, realBookings).includes(bay) && !isBayBlocked(bay, dt, s, bayBlocks)) }));
}

function isSameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function getAllTimes(dt, durSlots, bayBlocks, realBookings, hoursConfig) {
  const hrs = getHours(dt, hoursConfig), result = [];
  const now = new Date();
  const isToday = isSameLocalDay(dt, now);
  const currentH = now.getHours() + now.getMinutes() / 60;
  for (let i = 0; i <= hrs.length - durSlots; i++) {
    const needed = hrs.slice(i, i + durSlots);
    const consecutive = needed.every((s, j) => j === 0 || toH(s) - toH(needed[j - 1]) === 0.5);
    if (!consecutive) continue;
    if (isToday && toH(hrs[i]) <= currentH) { result.push({ time: hrs[i], open: false }); continue; }
    const anyBayFree = [1,2,3,4,5].some(bay => needed.every(s => !getBk(dt, s, realBookings).includes(bay) && !isBayBlocked(bay, dt, s, bayBlocks)));
    result.push({ time: hrs[i], open: anyBayFree });
  }
  return result;
}

/* Pricing */
function isPeak(dt, slot) { return !isWeekend(dt) && toH(slot) >= 17; }
function slotRate(dt, slot, cfg) { return isWeekend(dt) ? cfg.wk : isPeak(dt, slot) ? cfg.pk : cfg.op; }
const TAX_RATE = 0.07;
const applyTax = (subtotal) => Math.round(subtotal * TAX_RATE * 100) / 100;

function calcPrice(dt, startSlot, durSlots, tier, bayCredits, cfg, hoursConfig, ebUsedToday = 0) {
  const hrs = getHours(dt, hoursConfig), si = hrs.indexOf(startSlot), needed = hrs.slice(si, si + durSlots), durHrs = durSlots * 0.5;
  if (tier === "champion") return { total: 0, disc: 0, credits: durHrs, base: 0, tax: 0, subtotal: 0 };
  let base = 0; needed.forEach(s => { base += slotRate(dt, s, cfg) * 0.5; });
  if (tier === "early_birdie") {
    // Up to 2 hrs/day (4 slots) free Mon-Fri 8am-4pm
    // Additional non-peak slots in that window → 20% discount
    // Outside window (peak or weekend) → full rate
    const ebUsed = ebUsedToday;
    let freeSlots = 0, discBase = 0, paidBase = 0;
    let ebRemaining = Math.max(0, 4 - ebUsed);
    needed.forEach(s => {
      const h = toH(s);
      const inWindow = !isWeekend(dt) && h >= 8 && h < 16;
      if (inWindow && ebRemaining > 0) {
        freeSlots += 1; ebRemaining--;
      } else if (inWindow) {
        discBase += cfg.op * 0.5; // 20% discount on non-peak rate
      } else {
        paidBase += slotRate(dt, s, cfg) * 0.5; // full rate outside window
      }
    });
    const disc = discBase * 0.20;
    const subtotal = (discBase - disc) + paidBase;
    const tax = applyTax(subtotal);
    return { total: subtotal + tax, disc, credits: freeSlots * 0.5, base, tax, subtotal };
  }
  if (tier === "player") {
    const credHrs = Math.min(bayCredits, durHrs), credSlots = credHrs * 2;
    let paidBase = 0; needed.slice(credSlots).forEach(s => { paidBase += slotRate(dt, s, cfg) * 0.5; });
    const disc = paidBase * 0.20;
    const subtotal = paidBase - disc;
    const tax = applyTax(subtotal);
    return { total: subtotal + tax, disc, credits: credHrs, base, tax, subtotal };
  }
  if (tier === "starter") {
    const disc = base * 0.20;
    const subtotal = base - disc;
    const tax = applyTax(subtotal);
    return { total: subtotal + tax, disc, credits: 0, base, tax, subtotal };
  }
  const tax = applyTax(base);
  return { total: base + tax, disc: 0, credits: 0, base, tax, subtotal: base };
}

function lessonPrice(tier, hasCredits, creditCoachId, selCoach) {
  if (hasCredits && creditCoachId === selCoach) return { total: 0, credit: true, label: "$0 (1 credit)" };
  return { total: (tier && tier !== "none") ? 120 : 150, credit: false, label: "$" + ((tier && tier !== "none") ? 120 : 150) + ".00" };
}

/* Lesson helpers */
function getLessonTimes(dt, coachFilter, bayBlocks, realBookings, hoursConfig) {
  const dn = dayName(dt), hrs = getHours(dt, hoursConfig), times = new Set();
  const now = new Date();
  const isToday = isSameLocalDay(dt, now);
  const currentH = now.getHours() + now.getMinutes() / 60;
  (coachFilter ? [coachFilter] : COACHES).forEach(c => {
    const avSlots = c.av[dn] || [];
    avSlots.forEach((s, si) => {
      const next = avSlots[si + 1];
      if (!next || toH(next) - toH(s) !== 0.5) return;
      if (isToday && toH(s) <= currentH) return;
      if ([1,2,3,4,5].some(bay => [s, next].every(sl => !getBk(dt, sl, realBookings).includes(bay) && !isBayBlocked(bay, dt, sl, bayBlocks))) && hrs.includes(s)) times.add(s);
    });
  });
  return [...times].sort((a, b) => toH(a) - toH(b));
}
function getCoachesAt(dt, time, bayBlocks, realBookings) {
  const dn = dayName(dt);
  return COACHES.filter(c => {
    const avSlots = c.av[dn] || [], si = avSlots.indexOf(time);
    if (si === -1) return false;
    const next = avSlots[si + 1];
    if (!next || toH(next) - toH(time) !== 0.5) return false;
    return [1,2,3,4,5].some(bay => [time, next].every(sl => !getBk(dt, sl, realBookings).includes(bay) && !isBayBlocked(bay, dt, sl, bayBlocks)));
  });
}
function autoAssignBay(dt, time, bayBlocks, realBookings, hoursConfig) {
  const hrs = getHours(dt, hoursConfig), si = hrs.indexOf(time), needed = [time, hrs[si + 1]];
  for (let bay = 1; bay <= 5; bay++) { if (needed.every(s => !getBk(dt, s, realBookings).includes(bay) && !isBayBlocked(bay, dt, s, bayBlocks))) return bay; }
  return 1;
}

/* ─── Responsive hook ─── */
function useWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return w;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
/* ─── Add Card Form (isolated to prevent focus loss on re-render) ─── */
const AddCardForm = React.memo(({ onSave, onCancel, appId, locationId, saveLabel }) => {
  const containerRef = React.useRef();
  const cardRef = React.useRef(null);
  const paymentsRef = React.useRef(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    let destroyed = false;

    const loadSdk = async () => {
      // Load Square Web Payments SDK if not already loaded
      if (!window.Square) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://web.squarecdn.com/v1/square.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (destroyed) return;

      // Wait for container to be in DOM and visible
      await new Promise(resolve => setTimeout(resolve, 500));
      if (destroyed || !containerRef.current) return;

      // Extra check: wait until container is actually in the DOM
      let attempts = 0;
      while (!document.contains(containerRef.current) && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (destroyed || !containerRef.current || !document.contains(containerRef.current)) return;

      try {
        const payments = window.Square.payments(appId, locationId);
        paymentsRef.current = payments;
        const card = await payments.card();
        if (destroyed) { card.destroy(); return; }
        if (!containerRef.current) { card.destroy(); return; }
        await card.attach(containerRef.current);
        cardRef.current = card;
        setLoading(false);
      } catch (e) {
        console.error("Square card form error:", e);
        if (!destroyed) setErr("Failed to load card form. Please refresh and try again.");
        setLoading(false);
      }
    };

    loadSdk();
    return () => {
      destroyed = true;
      cardRef.current?.destroy();
    };
  }, [appId, locationId]);

  const handleSave = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    setErr("");
    try {
      const result = await cardRef.current.tokenize();
      if (result.status === "OK") {
        const nonce = result.token;
        const details = result.details?.card || {};
        const brand = details.brand || "Card";
        const last4 = details.last4 || "····";
        const expMonth = details.expMonth ? String(details.expMonth).padStart(2, "0") : "";
        const expYear = details.expYear ? String(details.expYear).slice(-2) : "";
        const exp = expMonth && expYear ? expMonth + "/" + expYear : "";
        await onSave({ nonce, brand, last4, exp });
      } else {
        const msg = result.errors?.[0]?.message || "Card verification failed. Please check your details.";
        setErr(msg);
      }
    } catch (e) {
      setErr("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {loading && <p style={{ fontSize: 13, color: "#888", textAlign: "center", padding: "20px 0" }}>Loading secure card form…</p>}
      {err && <p style={{ fontSize: 12, color: "#E03928", marginBottom: 8 }}>{err}</p>}
      <div style={{ position: "relative", marginBottom: 12 }}><div ref={containerRef} style={{ minHeight: 60 }} />{loading && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f8f6", borderRadius: 10 }}><span style={{ fontSize: 12, color: "#888" }}>Loading card form…</span></div>}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button style={{ background: "#f0f0ee", color: "#1a1a1a", border: "none", borderRadius: 12, padding: "14px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", flex: 1 }} onClick={onCancel}>Cancel</button>
        <button style={{ background: "#072814", color: "#fff", border: "none", borderRadius: 12, padding: "14px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", flex: 2, opacity: loading || saving ? 0.5 : 1 }} disabled={loading || saving} onClick={handleSave}>{saving ? "Processing…" : (saveLabel || "Save Card")}</button>
      </div>
      <p style={{ fontSize: 10, color: "#ccc", textAlign: "center", marginTop: 8 }}>Secured by Square</p>
    </div>
  );
});

export default function BirdieGolfWebsite() {
  const width = useWidth();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;

  /* Auth */
  const [authStep, setAuthStep] = useState("phone");
  const [logged, setLogged] = useState(false);
  const [ph, setPh] = useState("");
  const [otp, setOtp] = useState(["","","","","",""]);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [verifySid, setVerifySid] = useState("");
  const [onbF, setOnbF] = useState("");
  const [onbL, setOnbL] = useState("");
  const [onbE, setOnbE] = useState("");
  const [customerId, setCustomerId] = useState(null);
  const [sqCustId, setSqCustId] = useState(null); // Square customer ID
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const editOtpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const cardExpRef = useRef(); const cardCvcRef = useRef();

  /* Nav & Toast */
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState(null);
  const fire = useCallback(m => { setToast(m); setTimeout(() => setToast(null), 3200); }, []);

  /* Config — loaded from Supabase */
  const [cfg, setCfg] = useState({ pk: 75, op: 50, wk: 50 });
  const [hoursConfig, setHoursConfig] = useState(null);
  const [enrollmentFeeEnabled, setEnrollmentFeeEnabled] = useState(true);
  const [bayBlocks, setBayBlocks] = useState([
    { id: 1, bays: [2], from: "2026-03-20", to: "2026-03-22", allDay: true, reason: "Trackman calibration" },
    { id: 2, bays: [1, 3], from: "2026-03-25", to: "2026-03-25", timeFrom: "5:00 PM", timeTo: "9:00 PM", allDay: false, reason: "Private event" },
  ]);

  /* Profile */
  const [profPhone, setProfPhone] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [editModal, setEditModal] = useState(null);
  const [cards, setCards] = useState([]);
  const [addCard, setAddCard] = useState(false);
  const [showAllTxn, setShowAllTxn] = useState(false);
  const [newCard, setNewCard] = useState({ num: "", exp: "", cvc: "" });

  /* Membership */
  const [tier, setTier] = useState("none");
  const [bayCredits, setBayCredits] = useState(0);
  const [memTab, setMemTab] = useState(tier && tier !== "none" ? "current" : "memberships");
  const [memModal, setMemModal] = useState(null);
  const [renewDate, setRenewDate] = useState(null);
  const [memberSince, setMemberSince] = useState(null);
  const [pendingTier, setPendingTier] = useState(null);

  /* Bay booking */
  const [bkStep, setBkStep] = useState(0);
  const [bkDate, setBkDate] = useState(null);
  const [bkDur, setBkDur] = useState(null);
  const [bkTime, setBkTime] = useState(null);
  const [bkBay, setBkBay] = useState(null);
  const [ebSlotsToday, setEbSlotsToday] = useState(0); // Early Birdie slots already booked today
  const [bkAgree, setBkAgree] = useState(false);
  const [bkProcessing, setBkProcessing] = useState(false);
  const [lesProcessing, setLesProcessing] = useState(false);
  const [pkgProcessing, setPkgProcessing] = useState(false);
  const [memProcessing, setMemProcessing] = useState(false);
  const [bkOverridePastRenewal, setBkOverridePastRenewal] = useState(false);

  /* Lesson booking */
  const [lesTab, setLesTab] = useState("book");
  const [lesMode, setLesMode] = useState("date");
  const [lesDate, setLesDate] = useState(null);
  const [lesTime, setLesTime] = useState(null);
  const [lesCoach, setLesCoach] = useState(null);
  const [lesStep, setLesStep] = useState(0);
  const [lesAgree, setLesAgree] = useState(false);
  const [pkgCoach, setPkgCoach] = useState(null);
  const [selPkg, setSelPkg] = useState(null);

  /* Lesson credits */
  const [totL, setTotL] = useState(0);
  const [maxL, setMaxL] = useState(0);
  const [creditCoachId, setCreditCoachId] = useState(null);
  const [creditPkg, setCreditPkg] = useState(null);
  const [creditExp, setCreditExp] = useState(null);
  const [creditPurchaseDate, setCreditPurchaseDate] = useState(null);
  const [lesHistory, setLesHistory] = useState([]);
  const [creditUsage, setCreditUsage] = useState([]);

  /* Upcoming & Transactions */
  const [upcomingBk, setUpcomingBk] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [manageBk, setManageBk] = useState(null); // booking being managed (edit/cancel)
  const [transactions, setTransactions] = useState([]);
  const [memHistory] = useState([]);

  /* Promo codes */
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoApplied, setPromoApplied] = useState(null);

  const days14 = gen14();
  const creditCoach = COACHES.find(c => c.id === creditCoachId);
  const tierData = TIERS[tier] || null;
  const resetPromo = () => { setPromoOpen(false); setPromoInput(""); setPromoLoading(false); setPromoApplied(null); };
  const resetBk = () => { setBkStep(0); setBkDate(null); setBkDur(null); setBkTime(null); setBkBay(null); setBkAgree(false); setBkOverridePastRenewal(false); setEbSlotsToday(0); setBkProcessing(false); resetPromo(); };
  const hasCard = cards.length > 0;
  const resetLes = () => { setLesStep(0); setLesDate(null); setLesTime(null); setLesCoach(null); setLesAgree(false); setLesProcessing(false); resetPromo(); };

  /* ─── Load data from Supabase on mount ─── */
  useEffect(() => {
    (async () => {
      const pricing = await sb.get("pricing_config", "select=*");
      if (pricing?.[0]) setCfg({ pk: pricing[0].peak_rate, op: pricing[0].off_peak_rate, wk: pricing[0].weekend_rate });
      const blocks = await sb.get("bay_blocks", "select=*");
      if (blocks?.length) setBayBlocks(blocks);
      const allBks = await sb.get("bookings", "select=id,bay,date,start_time,duration_slots,status,type&status=neq.cancelled");
      if (allBks?.length) setAllBookings(allBks);
      const settings = await sb.get("admin_settings", "select=*&limit=1");
      if (settings?.[0]) {
        const s = settings[0];
        if (s.weekday_open) setHoursConfig({
          weekday_open:  s.weekday_open,
          weekday_close: s.weekday_close,
          weekend_open:  s.weekend_open,
          weekend_close: s.weekend_close,
        });
        if (s.enrollment_fee_enabled !== undefined) setEnrollmentFeeEnabled(s.enrollment_fee_enabled !== false);
      }
    })();
  }, []);

  /* Load user-specific data (transactions, bookings, membership, lesson credits) */
  const loadUserData = useCallback(async (cid) => {
    if (!cid) return;
    // Transactions
    const txns = await sb.get("transactions", `select=*&customer_id=eq.${cid}&order=created_at.desc`);
    if (txns?.length) setTransactions(txns.map(t => ({
      desc: t.description, date: new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      method: t.payment_label || "Card", amt: "$" + Number(t.amount).toFixed(2),
    })));
    // Upcoming bookings — always overwrite from Supabase
    const today = new Date(); today.setHours(0,0,0,0);
    const bks = await sb.get("bookings", `select=*&customer_id=eq.${cid}&status=eq.confirmed&order=date.asc`);
    const upcoming = (bks || []).filter(b => new Date(b.date + "T23:59:59") >= today);
    setUpcomingBk(upcoming.map(b => ({
      id: b.id, type: b.type, label: b.type === "lesson" ? "Lesson · " + (b.coach_name || "") : "Bay " + b.bay,
      sub: new Date(b.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · " + b.start_time + " · " + (b.duration_slots * 0.5) + "hr" + (b.duration_slots > 2 ? "s" : ""),
    })));
    // Membership — always reload from Supabase (reflects admin changes)
    const custData = await sb.get("customers", `id=eq.${cid}&select=tier,bay_credits_remaining,bay_credits_total,renewal_date,member_since,pending_tier`);
    if (custData?.[0]) {
      const c = custData[0];
      setTier(c.tier || "none");
      setBayCredits(c.tier === "player" ? Math.min(c.bay_credits_remaining || 0, 8) : (c.bay_credits_remaining || 0));
      if (c.renewal_date) setRenewDate(new Date(c.renewal_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
      if (c.member_since) setMemberSince(new Date(c.member_since + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
      setPendingTier(c.pending_tier || null);
    }
    // Active lesson package
    const pkgs = await sb.get("lesson_packages", `customer_id=eq.${cid}&status=eq.active&select=*&order=purchase_date.desc`);
    if (pkgs?.length) {
      const pkg = pkgs[0];
      setTotL(pkg.remaining_credits || 0);
      setMaxL(pkg.total_credits || 0);
      setCreditCoachId(pkg.coach_id || null);
      setCreditPkg(pkg.name || "");
      if (pkg.purchase_date) setCreditPurchaseDate(new Date(pkg.purchase_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
      if (pkg.expiry_date) setCreditExp(new Date(pkg.expiry_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    }
  }, []);

  /* Load saved cards from Supabase */
  const loadCards = useCallback(async (cid) => {
    if (!cid) return;
    const saved = await sb.get("payment_methods", `customer_id=eq.${cid}&select=*&order=created_at.asc`);
    if (saved?.length) setCards(saved.map(c => ({ id: c.id, brand: c.brand, last4: c.last4, exp: c.exp, square_card_id: c.square_card_id })));
  }, []);

  /* ─── Email notifications ─── */
  const sendEmail = async (type, data) => {
    try {
      await square("email.send", { type, ...data });
    } catch(e) { console.error("Email failed:", e); }
  };

  /* ─── Save booking to Supabase ─── */
  const saveBayBooking = async (bookingData) => {
    // 1. Square transaction — always create for tracking, even if $0 (credit utilization)
    let sqPaymentId = null;
    if (sqCustId) {
      const cardId = cards?.[0]?.square_card_id;
      if (bookingData.total > 0 && cardId) {
        // Paid booking — charge card
        const chargeRes = await square("bay.charge", {
          square_customer_id: sqCustId,
          card_id: cardId,
          slots: bookingData.durSlots,
          is_peak: bookingData.isPeak === true,
          tier: tier || "public",
          note: `Bay ${bookingData.bay} · ${bookingData.time} · ${bookingData.durSlots * 0.5}hr`,
          promo_catalog_id: bookingData.promoCatalogId || null,
        });
        sqPaymentId = chargeRes?.payment?.id;
        if (!sqPaymentId) {
          fire("Payment failed — please check your card and try again.");
          reportError("Payment declined", `Bay booking · Bay ${bookingData.bay} · ${bookingData.time} · ${bookingData.date}`, chargeRes?.error, chargeRes);
          return;
        }
      } else if (bookingData.credits > 0) {
        // $0 credit booking — create $0 order in Square for member credit utilization tracking
        const orderRes = await square("order.create", {
          square_customer_id: sqCustId,
          apply_tax: false,
          line_items: [{
            name: `Bay ${bookingData.bay} · Member Credit · ${bookingData.credits}hr`,
            quantity: "1",
            base_price_money: { amount: 0, currency: "USD" },
          }],
        });
        sqPaymentId = orderRes?.order?.id; // store order ID as reference
      }
    }
    // 2. Save booking to Supabase
    const result = await sb.post("bookings", {
      customer_id: customerId, type: "bay", bay: bookingData.bay,
      date: dateKey(bookingData.date), start_time: bookingData.time,
      duration_slots: bookingData.durSlots, status: "confirmed",
      amount: bookingData.total, credits_used: bookingData.credits, discount: bookingData.disc,
      square_payment_id: sqPaymentId,
    });
    // Deduct credits if used
    if (bookingData.credits > 0) {
      const newCredits = Math.max(0, bayCredits - bookingData.credits);
      sb.patch("customers", `id=eq.${customerId}`, { bay_credits_remaining: newCredits });
      setBayCredits(newCredits);
    }
    // Save transaction to Supabase (fire and forget)
    sb.post("transactions", {
      customer_id: customerId, description: "Bay Rental · Bay " + bookingData.bay + " · " + bookingData.time,
      date: dateKey(bookingData.date), amount: bookingData.total, payment_label: bookingData.cardLabel || "Card",
      square_payment_id: sqPaymentId,
    });
    if (bookingData.promoDiscountId && bookingData.promoSavings > 0 && customerId) {
      sb.post("promo_redemptions", { customer_id: customerId, discount_id: bookingData.promoDiscountId, discount_name: bookingData.promoCode || "", amount_saved: bookingData.promoSavings, booking_type: "bay" });
    }
    // Always update local display
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setTransactions(p => [{ desc: "Bay Rental · Bay " + bookingData.bay + " · " + bookingData.time, date: today, method: bookingData.cardLabel || "Card", amt: "$" + bookingData.total.toFixed(2) }, ...p]);
    // Send confirmation emails
    const emailData = {
      customer_name: onbF + " " + onbL,
      customer_email: profEmail || onbE,
      date: fmtDateLong(bookingData.date),
      time: bookingData.time,
      duration: bookingData.durSlots * 0.5 + " hr" + (bookingData.durSlots > 2 ? "s" : ""),
      bay: "Bay " + bookingData.bay,
      total: "$" + bookingData.total.toFixed(2),
      credits_used: bookingData.credits > 0 ? bookingData.credits + " hr credit" + (bookingData.credits > 1 ? "s" : "") : null,
    };
    sendEmail("bay_booking", emailData);
    return result;
  };

  const saveLessonBooking = async (bookingData) => {
    // 1. Square transaction — always create for tracking, even if $0 (credit utilization)
    let sqPaymentId = null;
    if (sqCustId) {
      if (bookingData.total > 0 && !bookingData.credit) {
        const cardId = cards?.[0]?.square_card_id;
        const chargeRes = await square("lesson.purchase", {
          square_customer_id: sqCustId,
          card_id: cardId,
          coach_id: bookingData.coachId,
          hours: 1,
          is_member: !!tier && tier !== "none",
        });
        sqPaymentId = chargeRes?.payment?.id;
        if (chargeRes?.error) { console.error("Lesson charge failed:", chargeRes.error); }
      } else if (bookingData.credit) {
        // $0 credit lesson — create $0 order for tracking
        const orderRes = await square("order.create", {
          square_customer_id: sqCustId,
          apply_tax: false,
          line_items: [{
            name: `Lesson Credit · ${bookingData.coachName}`,
            quantity: "1",
            base_price_money: { amount: 0, currency: "USD" },
          }],
        });
        sqPaymentId = orderRes?.order?.id;
      }
    }
    // 2. Save booking to Supabase
    const result = await sb.post("bookings", {
      customer_id: customerId, type: "lesson", bay: bookingData.bay,
      date: dateKey(bookingData.date), start_time: bookingData.time,
      duration_slots: 2, coach_id: bookingData.coachId, coach_name: bookingData.coachName,
      status: "confirmed", amount: bookingData.total, credits_used: bookingData.credit ? 1 : 0,
      square_payment_id: sqPaymentId,
    });
    // Save transaction to Supabase (fire and forget)
    sb.post("transactions", {
      customer_id: customerId, description: "Lesson · " + bookingData.coachName + " · " + bookingData.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      date: dateKey(bookingData.date), amount: bookingData.total, payment_label: bookingData.credit ? "Credit" : (bookingData.cardLabel || "Card"),
    });
    if (bookingData.promoDiscountId && bookingData.promoSavings > 0 && customerId) {
      sb.post("promo_redemptions", { customer_id: customerId, discount_id: bookingData.promoDiscountId, discount_name: bookingData.promoCode || "", amount_saved: bookingData.promoSavings, booking_type: "lesson" });
    }
    // Always update local display
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setTransactions(p => [{ desc: "Lesson · " + bookingData.coachName + " · " + bookingData.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), date: today, method: bookingData.credit ? "Credit" : (bookingData.cardLabel || "Card"), amt: "$" + bookingData.total.toFixed(2) }, ...p]);
    // Send confirmation emails
    const emailData = {
      customer_name: onbF + " " + onbL,
      customer_email: profEmail || onbE,
      date: fmtDateLong(bookingData.date),
      time: bookingData.time,
      coach: bookingData.coachName,
      bay: "Bay " + bookingData.bay,
      total: bookingData.credit ? "1 Lesson Credit" : "$" + bookingData.total.toFixed(2),
      payment_method: bookingData.credit ? "Lesson Credit" : "Card on file",
    };
    sendEmail("lesson_booking", emailData);
    return result;
  };

  /* ─── AUTH ─── */
  if (!logged) {
    const authCard = (content) => (
      <div style={LS.w}><style>{CSS}</style>
        <div style={{ ...LS.c, maxWidth: isDesktop ? 460 : 420 }}>{content}</div>
      </div>
    );

    if (authStep === "phone") return authCard(
      <>
        <div style={LS.br}>
          <h1 style={LS.bn}>BIRDIE GOLF STUDIOS</h1>
          <p style={LS.bs}>Wynwood, Miami, FL</p>
        </div>

        <div style={LS.divider} />
        <p style={LS.signInLabel}>Sign in or create an account to book</p>
        <label style={LS.label}>PHONE NUMBER</label>
        <div style={LS.phRow}>
          <span style={LS.phPre}>+1</span>
          <input style={LS.phIn} type="tel" placeholder="(305) 555-0000" value={ph.length > 6 ? `(${ph.slice(0,3)}) ${ph.slice(3,6)}-${ph.slice(6)}` : ph.length > 3 ? `(${ph.slice(0,3)}) ${ph.slice(3)}` : ph.length > 0 ? `(${ph}` : ""} onChange={e => { const digits = e.target.value.replace(/[^0-9]/g, ""); setPh(digits.slice(0, 10)); }} />
        </div>
        <button style={{ ...S.b1, marginTop: 16, opacity: ph.length >= 10 && !otpSending ? 1 : 0.4 }} disabled={otpSending} onClick={async () => {
          if (ph.length < 10 || otpSending) return;
          setOtpSending(true);
          try {
            const res = await square("otp.send", { phone: ph });
            if (res && res.sent) {
              if (res.sid) setVerifySid(res.sid);
              setAuthStep("otp");
            } else {
              fire(res?.error || "Failed to send code. Please try again.");
            }
          } catch {
            fire("Failed to send code. Please try again.");
          } finally {
            setOtpSending(false);
          }
        }}>{otpSending ? "Sending code…" : "Continue"}</button>
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#aaa", lineHeight: 1.7, margin: 0 }}>
            Need help? Contact us via{" "}
            <a href="https://wa.me/13054221222" target="_blank" rel="noopener noreferrer" style={{ color: "#3AE58D", fontWeight: 600, textDecoration: "none" }}>WhatsApp</a>
            {" "}or call us at{" "}
            <a href="tel:+13054561449" style={{ color: "#aaa", textDecoration: "none" }}>+1 (305) 456-4149</a>
          </p>
        </div>
        <div style={LS.footer}>
          <span style={LS.footerText}>45 NE 26th St, Unit C, Miami, FL 33145</span>
          <span style={LS.footerText}>Mon–Fri 8am–10pm · Sat–Sun 9am–9pm</span>
        </div>
        <p style={{ fontSize: 10, color: "#bbb", textAlign: "center", lineHeight: 1.6, margin: "8px 0 0", padding: "0 8px" }}>
          By signing up you consent to receive SMS messages from Birdie Golf Studios about your bookings and use of our space. Message &amp; data rates may apply. Message frequency varies. Reply STOP to opt out.
        </p>
      </>
    );

    if (authStep === "otp") return authCard(
      <>
        <div style={LS.br}>
          <h1 style={LS.bn}>BIRDIE GOLF STUDIOS</h1>
          <p style={LS.bs}>Wynwood, Miami, FL</p>
        </div>
        <p style={{ fontSize: 14, color: "#555", textAlign: "center", marginBottom: 20 }}>Code sent to +1 {ph.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")}</p>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Enter 6-digit code"
          value={otpCode}
          onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          className="otp-input"
          style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 15, letterSpacing: otpCode.length > 0 ? 6 : 0, textAlign: "center", fontFamily: ff, outline: "none", boxSizing: "border-box", marginBottom: 4 }}
          autoComplete="one-time-code"
          autoFocus
        />
        <button style={{ ...S.b1, marginTop: 16, opacity: otpCode.length === 6 ? 1 : 0.4 }} onClick={async () => {
          if (otpCode.length < 6) return;
          const verifyRes = await square("otp.verify", { phone: ph, code: otpCode, sid: verifySid });
          if (!verifyRes || !verifyRes.approved) {
            fire("Incorrect code — please try again");
            setOtpCode("");
            return;
          }
          // Look up phone in Supabase — skip onboarding if existing customer
          const existing = await sb.get("customers", `phone=eq.${ph}&select=*`);
          if (existing?.length) {
            const cust = existing[0];
            setCustomerId(cust.id);
            setOnbF(cust.first_name || "");
            setOnbL(cust.last_name || "");
            setOnbE(cust.email || "");
            setProfPhone(cust.phone || "");
            setProfEmail(cust.email || "");
            setTier(cust.tier || "none");
            setBayCredits(cust.tier === "player" ? Math.min(cust.bay_credits_remaining || 0, 8) : (cust.bay_credits_remaining || 0));
            if (cust.renewal_date) setRenewDate(new Date(cust.renewal_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
            if (cust.member_since) setMemberSince(new Date(cust.member_since + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
            // If no Square customer ID, search Square first then create if not found
            let sqId = cust.square_customer_id || null;
            if (!sqId) {
              const searchRes = await square("customer.search", { phone: cust.phone });
              sqId = searchRes?.customers?.[0]?.id || null;
              if (!sqId) {
                const sqResult = await square("customer.create", { first_name: cust.first_name, last_name: cust.last_name, phone: cust.phone, email: cust.email, supabase_id: cust.id });
                sqId = sqResult?.customer?.id || null;
              }
              if (sqId) await sb.patch("customers", `id=eq.${cust.id}`, { square_customer_id: sqId });
            }
            setSqCustId(sqId);
            loadUserData(cust.id);
            loadCards(cust.id);
            setLogged(true);
          } else {
            setAuthStep("onboard");
          }
        }}>Verify</button>
        <button style={{ ...S.lk, marginTop: 12, display: "block", textAlign: "center", width: "100%" }} onClick={() => { setAuthStep("phone"); setOtp(["","","","","",""]); setOtpCode(""); }}>← Back</button>
      </>
    );

    if (authStep === "onboard") return authCard(
      <>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#072814", textAlign: "center", marginBottom: 4 }}>Welcome to Birdie Golf!</h2>
        <p style={{ fontSize: 13, color: "#888", textAlign: "center", marginBottom: 20 }}>Let's set up your account</p>
        <div style={LS.nameRow}>
          <div style={{ flex: 1 }}><label style={LS.label}>FIRST NAME</label><input style={LS.onbIn} placeholder="First" value={onbF} onChange={e => setOnbF(e.target.value)} /></div>
          <div style={{ flex: 1 }}><label style={LS.label}>LAST NAME</label><input style={LS.onbIn} placeholder="Last" value={onbL} onChange={e => setOnbL(e.target.value)} /></div>
        </div>
        <label style={LS.label}>PHONE</label>
        <input style={{ ...LS.onbIn, background: "#f8f8f6", color: "#888" }} value={"+1 " + ph.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")} readOnly />
        <label style={{ ...LS.label, marginTop: 12 }}>EMAIL</label>
        <input style={LS.onbIn} type="email" placeholder="you@email.com" value={onbE} onChange={e => setOnbE(e.target.value)} />
        <p style={{ fontSize: 11, color: "#aaa", marginTop: 14, lineHeight: 1.5 }}>By creating an account, you agree to our Privacy Policy and Terms of Service.</p>
        <button style={{ ...S.b1, marginTop: 16, opacity: onbF && onbL && onbE ? 1 : 0.4 }} onClick={async () => {
          if (!onbF || !onbL || !onbE) return;
          // 1. Create customer in Supabase
          const result = await sb.post("customers", { phone: ph, first_name: onbF, last_name: onbL, email: onbE, tier: "none", bay_credits_remaining: 0, bay_credits_total: 0 });
          const sbId = result?.[0]?.id;
          if (sbId) setCustomerId(sbId);
          // 2. Check if customer already exists in Square (by phone), create if not
          let sqId = null;
          const sqSearch = await square("customer.search", { phone: ph });
          const existingSqCust = sqSearch?.customers?.[0];
          if (existingSqCust) {
            sqId = existingSqCust.id;
          } else {
            const sqResult = await square("customer.create", { first_name: onbF, last_name: onbL, phone: ph, email: onbE, supabase_id: sbId });
            sqId = sqResult?.customer?.id;
          }
          if (sqId) {
            setSqCustId(sqId);
            if (sbId) await sb.patch("customers", `id=eq.${sbId}`, { square_customer_id: sqId });
          }
          setLogged(true); if (sbId) { loadUserData(sbId); loadCards(sbId); }
          fire("Welcome to Birdie Golf Studios, " + onbF + "!");
          trackMeta("Lead", { content_name: "Signup" });
          trackGA("sign_up", { method: "phone" });
        }}>Create Account</button>
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN APP — Responsive Layout
     ═══════════════════════════════════════════════════════════ */

  /* Navigation items */
  const navItems = [
    { k: "home", l: "Home", ic: X.grid },
    { k: "book", l: "Book", ic: X.cal },
    { k: "lessons", l: "Lessons", ic: X.coach },
    { k: "membership", l: "Membership", ic: X.crown },
    { k: "profile", l: "Profile", ic: X.user },
  ];

  const handleNav = async (k) => {
    setTab(k);
    if (k === "book" || k === "lessons") {
      const fresh = await sb.get("bookings", "select=id,bay,date,start_time,duration_slots,status,type&status=neq.cancelled");
      if (fresh?.length) setAllBookings(fresh);
    }
    if (k === "home" && customerId) {
      const today = new Date(); today.setHours(0,0,0,0);
      const bks = await sb.get("bookings", `select=*&customer_id=eq.${customerId}&status=eq.confirmed&order=date.asc`);
      const upcoming = (bks || []).filter(b => new Date(b.date + "T23:59:59") >= today);
      setUpcomingBk(upcoming.map(b => ({
        id: b.id, type: b.type,
        label: b.type === "lesson" ? "Lesson · " + (b.coach_name || "") : "Bay " + b.bay,
        sub: new Date(b.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · " + b.start_time + " · " + (b.duration_slots * 0.5) + "hr" + (b.duration_slots > 2 ? "s" : ""),
        date: b.date, start_time: b.start_time, bay: b.bay,
        duration_slots: b.duration_slots, credits_used: b.credits_used || 0,
        amount: b.amount || 0, square_payment_id: b.square_payment_id || null,
        square_customer_id: b.square_customer_id || null, coach_name: b.coach_name || "",
      })));
    }
    if (k === "book") resetBk();
    if (k === "lessons") { resetLes(); setLesTab("book"); }
  };

  /* ─── TOP NAV (Desktop/Tablet) ─── */
  const TopNav = () => (
    <div style={S.topNav}>
      <div style={S.topNavInner}>
        <div style={S.topNavBrand}>
          <span style={{ fontFamily: ff, fontSize: 11, fontWeight: 700, letterSpacing: "2.5px", color: "#fff" }}>
            BIRDIE <span style={{ color: "#3AE58D" }}>GOLF</span> STUDIOS
          </span>
        </div>
        <div style={S.topNavLinks}>
          {navItems.map(n => (
            <button key={n.k} style={{ ...S.topNavBtn, ...(tab === n.k ? S.topNavBtnActive : {}) }} onClick={() => handleNav(n.k)}>
              {n.ic(18)}<span>{n.l}</span>
            </button>
          ))}
        </div>
        {tierData && <button style={S.tierBadge} onClick={() => setTab("membership")}>{tierData.badge}</button>}
      </div>
    </div>
  );

  /* ─── BOTTOM NAV (Mobile) ─── */
  const BottomNav = () => (
    <div style={S.nav}>
      <div style={S.navPill}>
        {navItems.map(n => (
          <button key={n.k} style={{ ...S.navBtn, ...(tab === n.k ? S.navBtnActive : {}) }} onClick={() => handleNav(n.k)}>
            <span style={{ color: tab === n.k ? "#3AE58D" : "rgba(255,255,255,0.35)", display: "flex" }}>{n.ic(22)}</span>
          </button>
        ))}
      </div>
    </div>
  );

  /* ─── Content wrapper ─── */
  const Page = ({ children, wide }) => (
    <div style={{ ...S.page, maxWidth: wide ? 960 : 680 }}>{children}</div>
  );

  /* ─── RENDER TABS ─── */
  /* All tab render functions use the same business logic as before,
     but with responsive-aware spacing and grid columns */

  const renderContent = () => {
    /* Using the same rendering logic from the mobile app, adapted for responsive layout.
       For brevity in this file, the core rendering stays the same — the responsive magic
       happens through CSS media queries in the stylesheet and the Page wrapper. */

    if (tab === "home") return <Page>{renderHome()}</Page>;
    if (tab === "book") return <Page>{renderBook()}</Page>;
    if (tab === "lessons") return <Page>{renderLessons()}</Page>;
    if (tab === "membership") return <Page wide>{renderMembership()}</Page>;
    if (tab === "profile") return <Page>{renderProfile()}</Page>;
    return null;
  };

  /* ─── HOME ─── */
  const renderHome = () => (
    <>
      {!isDesktop && (
        <div style={{ background: "#072814", margin: "-24px -20px 20px", padding: "22px 20px 26px" }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "2px", color: "#3AE58D", marginBottom: 7, textTransform: "uppercase" }}>
            {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.15 }}>Hey, {onbF}.</h2>
            {tierData && <button style={S.tierBadge} onClick={() => setTab("membership")}>{tierData.badge}</button>}
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>Ready to hit the bays?</p>
        </div>
      )}
      {isDesktop && (
        <div style={S.greetRow}>
          <div style={{ flex: 1 }}>
            <h2 style={S.greetH}>Hey, {onbF}.</h2>
            <p style={S.greetS}>Ready to hit the bays?</p>
          </div>
          {tierData && <button style={S.tierBadge} onClick={() => setTab("membership")}>{tierData.badge}</button>}
        </div>
      )}

      <div style={{ ...S.qGrid, gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(4, 1fr)" }}>
        {[{ l: "Book Bay", ic: X.cal, t: "book" }, { l: "Lessons", ic: X.coach, t: "lessons" }, { l: "Membership", ic: X.crown, t: "membership" }, { l: "Profile", ic: X.user, t: "profile" }].map(a => (
          <button key={a.l} style={S.qBtn} onClick={() => handleNav(a.t)}>
            <div style={S.qIc}>{a.ic(20)}</div><span style={S.qL}>{a.l}</span>
          </button>
        ))}
      </div>

      <h3 style={S.sh}>Upcoming Bookings</h3>
      {upcomingBk.length === 0 ? (
        <div style={S.emptyCard}>
          <p style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>No upcoming reservations</p>
          <button style={{ ...S.b2, padding: "10px 24px" }} onClick={() => { resetBk(); setTab("book"); }}>Book a Bay</button>
        </div>
      ) : upcomingBk.map((b, i) => (
        <div key={i} style={S.upCard}>
          <div style={{ ...S.upIc, color: b.type === "lesson" ? "#C7BCA8" : "#3AE58D", background: b.type === "lesson" ? "#00305B" : "#072814" }}>
            {b.type === "lesson" ? X.coach(18) : X.cal(18)}
          </div>
          <div style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 600 }}>{b.label}</p><p style={{ fontSize: 12, color: "#888" }}>{b.sub}</p></div>
          <button
            style={{ fontSize: 11, fontWeight: 600, color: "#072814", background: "none", border: "1px solid rgba(7,40,20,0.25)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: ff, flexShrink: 0 }}
            onClick={() => setManageBk(b)}
          >
            Manage
          </button>
        </div>
      ))}

      {/* Active Membership & Lesson Package cards — side by side */}
      {(tierData || totL > 0) && <>
        <h3 style={S.sh}>My Plans</h3>
        <div style={{ display: "grid", gridTemplateColumns: (tierData && tier !== "none" && totL > 0) ? "1fr 1fr" : "1fr", gap: 12, alignItems: "stretch" }}>
          {tierData && tier !== "none" && (
            <div style={{ ...S.mc, background: tierData.c, display: "flex", flexDirection: "column" }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: tier === "starter" ? "#072814" : "#fff" }}>{tierData.n} Plan</p>
                <p style={{ fontSize: 11, color: tier === "starter" ? "rgba(7,40,20,0.55)" : "rgba(255,255,255,0.5)", marginTop: 2 }}>${tierData.price}/mo{renewDate ? ` · Renews ${renewDate}` : ""}</p>
                {pendingTier && TIERS[pendingTier] && <p style={{ fontSize: 11, color: tier === "starter" ? "rgba(7,40,20,0.7)" : "rgba(255,255,255,0.8)", marginTop: 3, fontWeight: 600 }}>⟶ Switching to {TIERS[pendingTier].n} on {renewDate}</p>}
              </div>
              <div style={{ marginTop: "auto", paddingTop: 12 }}>
                {tier === "player" && <p style={{ fontSize: 11, color: "#3AE58D", fontWeight: 600 }}>{bayCredits} out of 8 bay credits remaining</p>}
                {tier === "early_birdie" && <p style={{ fontSize: 11, color: "#95D5B2", fontWeight: 600 }}>Up to 2 hrs/day · Mon–Fri 8am–4pm</p>}
                {tier === "champion" && <p style={{ fontSize: 11, color: "#3AE58D", fontWeight: 600 }}>Unlimited credits</p>}
                {tier === "starter" && <p style={{ fontSize: 11, color: "#072814", fontWeight: 600 }}>Pay-as-you-go</p>}
              </div>
            </div>
          )}
          {totL > 0 && creditCoach && (
            <div style={{ background: "rgba(45,106,79,0.08)", border: "0.5px solid rgba(45,106,79,0.2)", borderRadius: 12, padding: "18px", display: "flex", flexDirection: "column" }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#2D6A4F" }}>{creditPkg}</p>
                <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{creditCoach.n} · Expires {creditExp}</p>
              </div>
              <div style={{ marginTop: "auto", paddingTop: 12 }}>
                <p style={{ fontSize: 11, color: "#2D6A4F", fontWeight: 600 }}>{totL} out of {maxL} lesson credits remaining</p>
              </div>
            </div>
          )}
        </div>
      </>}

      {/* Credits (bay) for members without the "My Plans" section covering it */}
      {tierData && tier !== "none" && tier !== "starter" && !((tierData || totL > 0)) ? null : null}

      <h3 style={{ ...S.sh, marginTop: 24 }}>About Us</h3>
      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <div style={{ ...S.aboutCard, gridColumn: isDesktop ? "auto" : "1 / -1" }}>
          <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: "0.5px", color: "#072814", textTransform: "uppercase" }}>Bay Rates</p>
          <p style={{ fontSize: 11, color: "#555", lineHeight: 1.75 }}><span style={{ color: "#072814", fontWeight: 700 }}>${cfg.op}/hr</span> Non-Peak · Mon–Fri 8am–5pm, Sat–Sun all day</p>
          <p style={{ fontSize: 11, color: "#555", lineHeight: 1.75, marginTop: 3 }}><span style={{ color: "#84271A", fontWeight: 700 }}>${cfg.pk}/hr</span> Peak · Mon–Fri 5–10pm</p>
        </div>
        <div style={S.aboutCard}>
          <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: "0.5px", color: "#072814", textTransform: "uppercase" }}>Hours</p>
          <p style={{ fontSize: 11, color: "#555", lineHeight: 1.75 }}>Mon–Fri 8am–10pm</p>
          <p style={{ fontSize: 11, color: "#555", lineHeight: 1.75 }}>Sat–Sun 9am–9pm</p>
        </div>
        <div style={S.aboutCard}>
          <p style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: "0.5px", color: "#072814", textTransform: "uppercase" }}>Location</p>
          <a href="https://maps.apple.com/?q=45+NE+26th+St+Miami+FL+33137" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <p style={{ fontSize: 11, color: "#555", lineHeight: 1.75 }}>45 NE 26th St., Unit C</p>
            <p style={{ fontSize: 11, color: "#555", lineHeight: 1.75 }}>Miami, FL 33137</p>
          </a>
        </div>
      </div>

      <h3 style={S.sh}>Contact</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <a href="https://wa.me/13055421222" target="_blank" rel="noopener noreferrer" style={S.contactBtn}>{X.whatsapp(16)} WhatsApp</a>
        <a href="mailto:info@birdiegolfstudios.com" style={S.contactBtn}>{X.mail(16)} Email</a>
        <a href="tel:+13054564149" style={S.contactBtn}>{X.phone(16)} Call</a>
      </div>

      <button style={{ width: "100%", padding: "12px 18px", background: "none", border: "0.5px solid #e0ddd6", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#bbb", cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 40 }} onClick={() => { setLogged(false); setAuthStep("phone"); setPh(""); setOtp(["","","","","",""]); setOtpCode(""); setVerifySid(""); setOnbF(""); setOnbL(""); setOnbE(""); }}>
        {X.out(16)} Sign Out
      </button>
    </>
  );

  /* ─── BAY BOOKING ─── */
  const durs = [{ slots: 1, l: "30 min" },{ slots: 2, l: "1 hr" },{ slots: 3, l: "1.5 hrs" },{ slots: 4, l: "2 hrs" },{ slots: 5, l: "2.5 hrs" },{ slots: 6, l: "3 hrs" },{ slots: 7, l: "3.5 hrs" },{ slots: 8, l: "4 hrs" }];
  const champMax = (tier === "champion" || pendingTier === "champion") ? 4 : 999;

  // Returns the tier, credits, and any warning for a given booking date.
  // Handles two cases:
  //   1. Pending membership switch — use the new tier/credits after renewDate
  //   2. Player member booking past renewDate — credits will have reset, so
  //      we cannot assume current credits carry over. Warn and price at full rate.
  const effectiveTierOn = (bookingDate) => {
    if (!renewDate) return { eTier: tier, eCredits: bayCredits, warn: null };
    const bkD = new Date(bookingDate); bkD.setHours(12, 0, 0, 0);
    const rdDate = new Date(renewDate); rdDate.setHours(0, 0, 0, 0);
    const isPastRenewal = bkD >= rdDate;

    if (isPastRenewal && pendingTier) {
      // Switching to a new plan — use pending tier with fresh credits
      const newTierData = TIERS[pendingTier];
      const eCredits = pendingTier === "champion" ? 999 : pendingTier === "player" ? (newTierData?.hrs || 8) : 0;
      return { eTier: pendingTier, eCredits, warn: "switch" };
    }

    if (isPastRenewal && tier === "player") {
      // Still on Player but booking past renewal — credits will reset on renewal day.
      // We cannot count on current remaining credits, so price at full rate and warn.
      return { eTier: tier, eCredits: 0, warn: "past_renewal_player" };
    }

    if (isPastRenewal && tier === "champion") {
      // Champion stays unlimited past renewal — no issue
      return { eTier: tier, eCredits: 999, warn: null };
    }

    return { eTier: tier, eCredits: bayCredits, warn: null };
  };

  const renderBook = () => {
    if (bkStep === 1 && bkDate && bkDur && bkTime && bkBay) {
      const { eTier, eCredits, warn } = effectiveTierOn(bkDate);
      const price = calcPrice(bkDate, bkTime, bkDur, eTier, eCredits, cfg, hoursConfig, eTier === "early_birdie" ? ebSlotsToday : 0);
      const durHrs = bkDur * 0.5;

      // Past-renewal Player warning — show blocking screen unless user has overridden
      if (warn === "past_renewal_player" && !bkOverridePastRenewal) return <>
        <div style={S.hd}><button style={S.bk} onClick={() => setBkStep(0)}>{X.chevL(18)}</button><h2 style={S.ht}>Confirm Booking</h2></div>
        <div style={{ background: "#FFF5E5", border: "1px solid #E8890C55", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#E8890C", marginBottom: 8 }}>Heads Up — Booking Past Your Renewal Date</p>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 12 }}>
            You're booking for <strong>{fmtDateLong(bkDate)}</strong>, which is after your membership renews on <strong>{renewDate}</strong>.
          </p>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 12 }}>
            Your Player credits reset on renewal day, so we can't apply your current credits to this booking — it will be charged at the <strong>full hourly rate</strong>. If you cancel after the renewal date, you won't be eligible for a credit refund.
          </p>
          <p style={{ fontSize: 13, color: "#072814", fontWeight: 600, lineHeight: 1.6 }}>
            💡 We recommend waiting until after <strong>{renewDate}</strong> to make this booking so your fresh credits apply automatically.
          </p>
        </div>
        <div style={{ background: "#f7f7f5", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          {[[fmtDateLong(bkDate), null], [durHrs + " hr" + (durHrs > 1 ? "s" : ""), null], [bkTime, null], ["Bay " + bkBay, null]].filter(r => r[0]).map(([v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee" }}>
              <span style={{ fontSize: 13, color: "#888" }}>{["Date","Duration","Time","Bay"][i]}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Total (full rate)</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E8890C" }}>${price.total.toFixed(2)}</span>
          </div>
        </div>
        <button style={{ ...S.b1, background: "#E8890C", marginBottom: 10 }} onClick={() => setBkOverridePastRenewal(true)}>Book Anyway at Full Rate</button>
        <button style={S.b2} onClick={() => setBkStep(0)}>Go Back</button>
      </>;

      return <>
        <div style={S.hd}><button style={S.bk} onClick={() => setBkStep(0)}>{X.chevL(18)}</button><h2 style={S.ht}>Confirm Booking</h2></div>
        <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={S.confCard}>
              {[["Date", fmtDateLong(bkDate)], ["Duration", durHrs + " hr" + (durHrs > 1 ? "s" : "")], ["Time", bkTime], ["Bay", "Bay " + bkBay]].map(([l, v]) => <div key={l} style={S.confRow}><span style={S.confL}>{l}</span><span style={S.confV}>{v}</span></div>)}
              {price.credits > 0 && <div style={S.confRow}><span style={S.confL}>{eTier === "early_birdie" ? "Included (EB)" : "Credits Used"}</span><span style={{ ...S.confV, color: "#072814" }}>{price.credits} hr{price.credits > 1 ? "s" : ""}</span></div>}
              {price.disc > 0 && <div style={S.confRow}><span style={S.confL}>Member Discount</span><span style={{ ...S.confV, color: "#072814" }}>-${price.disc.toFixed(2)}</span></div>}
              {(() => {
                const promoDisc = promoApplied?.savings || 0;
                const discountedSubtotal = Math.max(0, price.subtotal - promoDisc);
                const recalcTax = Math.round(discountedSubtotal * 0.07 * 100) / 100;
                const finalTotal = discountedSubtotal + recalcTax;
                return <>
                  {price.tax > 0 && <div style={S.confRow}><span style={S.confL}>Tax (7%)</span><span style={S.confV}>${(promoApplied ? recalcTax : price.tax).toFixed(2)}</span></div>}
                  {eTier !== tier && <div style={{ background: "#FFF5E5", border: "1px solid #E8890C33", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                    <p style={{ fontSize: 11, color: "#E8890C", fontWeight: 600 }}>Priced as {TIERS[eTier]?.n} — your new plan starting {renewDate}</p>
                  </div>}
                  <div style={S.confDiv} />
                  {promoApplied && <div style={S.confRow}><span style={S.confL}>Promo ({promoApplied.code})</span><span style={{ ...S.confV, color: "#3AE58D" }}>-${promoDisc.toFixed(2)}</span></div>}
                  <div style={S.confRow}><span style={{ ...S.confL, fontWeight: 700 }}>Total</span><span style={{ ...S.confV, fontSize: 15, fontWeight: 700 }}>${(promoApplied ? finalTotal : price.total).toFixed(2)}</span></div>
                </>;
              })()}
            </div>
            {(() => {
              const applyPromo = async () => {
                const code = promoInput.trim().toUpperCase();
                if (!code) return;
                setPromoLoading(true);
                const res = await square("promo.validate", { code, customer_id: customerId });
                setPromoLoading(false);
                if (!res?.valid) {
                  if (res?.reason === "already_used") fire("You’ve already used this promo code.");
                  else if (res?.reason === "limit_reached") fire("This promo code is no longer available.");
                  else fire("Promo code not found. Please check and try again.");
                  return;
                }
                let savings = 0;
                // Calculate discount on pre-tax subtotal so tax is applied on discounted amount
                if (res.discount_type === "FIXED_PERCENTAGE") savings = Math.round(price.subtotal * (res.percentage / 100) * 100) / 100;
                else savings = Math.min(price.subtotal, (res.amount_cents || 0) / 100);
                setPromoApplied({ code, discount_id: res.discount_id, promo_catalog_id: res.discount_id, discount_type: res.discount_type, percentage: res.percentage, amount_cents: res.amount_cents, label: res.label, savings });
                setPromoOpen(false);
              };
              return (
                <div style={{ marginTop: 10, marginBottom: 4 }}>
                  {!promoApplied ? (
                    !promoOpen ? (
                      <button style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "#3AE58D", fontWeight: 600, cursor: "pointer", fontFamily: ff }} onClick={() => setPromoOpen(true)}>Have a promo code?</button>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={promoInput} onChange={e => setPromoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && applyPromo()} placeholder="Enter code" style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, fontFamily: mono, textTransform: "uppercase", outline: "none" }} autoFocus />
                        <button style={{ ...S.b1, padding: "9px 16px", fontSize: 13, minWidth: 72, opacity: promoLoading ? 0.6 : 1 }} onClick={applyPromo} disabled={promoLoading}>{promoLoading ? "…" : "Apply"}</button>
                        <button style={{ background: "none", border: "none", fontSize: 18, color: "#aaa", cursor: "pointer", lineHeight: 1 }} onClick={() => { setPromoOpen(false); setPromoInput(""); }}>×</button>
                      </div>
                    )
                  ) : (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#072814", borderRadius: 20, padding: "5px 12px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#3AE58D", fontFamily: mono }}>{promoApplied.code}</span>
                      <span style={{ fontSize: 12, color: "#3AE58D" }}>· -{promoApplied.label}</span>
                      <button style={{ background: "none", border: "none", color: "#3AE58D", fontSize: 14, cursor: "pointer", lineHeight: 1, padding: "0 0 0 4px" }} onClick={() => setPromoApplied(null)}>×</button>
                    </div>
                  )}
                </div>
              );
            })()}
            <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>Up to 4 players per bay. No additional charge.</p>
          </div>
          <div>
            <div style={S.polBox}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Cancellation Policy</p>
              <p style={{ fontSize: 12, color: "#8B6914", lineHeight: 1.5, marginBottom: 12 }}>Cancellations within 24 hours are non-refundable.</p>
              <label style={S.chkRow}><input type="checkbox" checked={bkAgree} onChange={() => setBkAgree(!bkAgree)} style={{ marginRight: 8, accentColor: "#072814" }} /><span style={{ fontSize: 12 }}>I agree to the cancellation policy</span></label>
            </div>
            {(() => {
              const promoDisc = promoApplied?.savings || 0;
              const discountedSubtotal = Math.max(0, price.subtotal - promoDisc);
              const recalcTax = price.tax > 0 ? Math.round(discountedSubtotal * 0.07 * 100) / 100 : 0;
              const bayTotal = promoApplied ? discountedSubtotal + recalcTax : price.total;
              const needsCard = bayTotal > 0 && cards.length === 0;
              const doBook = async (cardLabel) => {
                if (bkProcessing) return;
                setBkProcessing(true);
                await saveBayBooking({ bay: bkBay, date: bkDate, time: bkTime, durSlots: bkDur, total: bayTotal, credits: price.credits, disc: price.disc, isPeak: isPeak(bkDate, bkTime), cardLabel: cardLabel || (cards?.[0] ? (cards[0].brand + " ···" + cards[0].last4) : "Card"), promoSavings: promoApplied?.savings || 0, promoDiscountId: promoApplied?.discount_id || null, promoCatalogId: promoApplied?.promo_catalog_id || null, promoCode: promoApplied?.code || null });
                setAllBookings(p => [...p, { id: Date.now().toString(), bay: bkBay, date: bkDate ? bkDate.toISOString().split("T")[0] : "", start_time: bkTime, duration_slots: bkDur, status: "confirmed", type: "bay" }]);
                if (customerId) { const today = new Date(); today.setHours(0,0,0,0); const bks = await sb.get("bookings", `select=*&customer_id=eq.${customerId}&status=eq.confirmed&order=date.asc`); const upcoming = (bks || []).filter(b => new Date(b.date + "T23:59:59") >= today); setUpcomingBk(upcoming.map(b => ({ id: b.id, type: b.type, label: b.type === "lesson" ? "Lesson · " + (b.coach_name || "") : "Bay " + b.bay, sub: new Date(b.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · " + b.start_time + " · " + (b.duration_slots * 0.5) + "hr" + (b.duration_slots > 2 ? "s" : ""), date: b.date, start_time: b.start_time, bay: b.bay, duration_slots: b.duration_slots, credits_used: b.credits_used || 0, amount: b.amount || 0, square_payment_id: b.square_payment_id || null, square_customer_id: b.square_customer_id || null, coach_name: b.coach_name || "" }))); }
                trackMeta("Purchase", { content_name: "Bay Booking", content_category: "Bay", value: bayTotal, currency: "USD" });
                trackGA("purchase", { transaction_id: Date.now().toString(), value: bayTotal, currency: "USD", item_category: "bay" });
                fire("Bay booked!"); resetBk(); setTab("home");
              };
              return needsCard ? (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Enter your card — it will be saved to your profile for future bookings.</p>
                  <AddCardForm
                    appId={SQUARE_APP_ID}
                    locationId={SQUARE_LOCATION_ID}
                    saveLabel={`Confirm & Pay $${bayTotal.toFixed(2)}`}
                    onCancel={() => setBkStep(0)}
                    onSave={async ({ nonce, brand, last4, exp }) => {
                      let activeSqCustId = sqCustId;
                      if (!activeSqCustId) {
                        // Customer missing Square ID — create on the fly then retry
                        const sqR = await square("customer.search", { phone: String(customerId), email: "" });
                        let foundId = sqR?.customers?.[0]?.id;
                        if (!foundId) {
                          const created = await square("customer.create", { first_name: onbF, last_name: onbL, phone: String(customerId), email: profEmail || onbE, supabase_id: customerId });
                          foundId = created?.customer?.id;
                        }
                        if (foundId) {
                          setSqCustId(foundId);
                          activeSqCustId = foundId;
                          await sb.patch("customers", `id=eq.${customerId}`, { square_customer_id: foundId });
                        }
                      }
                      if (!activeSqCustId) { fire("Could not link your account. Please contact us."); reportError("Square customer link failed", "No sqCustId at checkout", null); return; }
                      // Duplicate check
                      const dupCheck = cards.find(c => c.last4 === last4 && c.brand === brand && c.exp === exp);
                      if (dupCheck) { fire("This card is already saved to your profile."); return; }
                      const res = await square("card.create", { square_customer_id: activeSqCustId, source_id: nonce });
                      if (res?.card?.id) {
                        const saved = await sb.post("payment_methods", { customer_id: customerId, brand, last4, exp, square_card_id: res.card.id });
                        const newCard = saved?.[0] ? { id: saved[0].id, brand, last4, exp, square_card_id: res.card.id } : { id: Date.now(), brand, last4, exp, square_card_id: res.card.id };
                        setCards([newCard]);
                        await doBook(brand + " ···" + last4);
                      } else { fire("Could not save card. Please try again."); reportError("Card save failed", "Checkout card save", res); }
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button style={S.b2} onClick={() => setBkStep(0)}>Back</button>
                  <button style={{ ...S.b1, flex: 2, opacity: (bkAgree && !bkProcessing) ? 1 : 0.4 }} disabled={!bkAgree || bkProcessing} onClick={async () => { if (!bkAgree || bkProcessing) return; await doBook(); }}>{bkProcessing ? "Processing…" : "Confirm & Pay"}</button>
                </div>
              );
            })()}
          </div>
        </div>
      </>;
    }

    return <>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Book a Bay</h2>
      {tier === "champion" && <div style={S.creditBanner}><span style={{ fontSize: 13, fontWeight: 600, color: "#124A2B" }}>Unlimited · Max 2hrs/booking</span></div>}
      {tier === "early_birdie" && <div style={{ ...S.creditBanner, borderColor: "rgba(7,40,20,0.2)", background: "rgba(7,40,20,0.03)" }}><span style={{ fontSize: 13, fontWeight: 600, color: "#072814" }}>Unlimited Mon–Fri 8am–4pm · Full rate outside window</span></div>}
      {tier === "player" && <div style={S.creditBanner}><span style={{ fontSize: 13, fontWeight: 600, color: "#072814" }}>{bayCredits > 0 ? bayCredits + " hrs of credits remaining this cycle" : "No bay credits remaining this cycle"}</span></div>}

      <><h4 style={S.stepH}>Select Date</h4>
      <div style={S.dateScroll}>
        {days14.map(d => {
          const sel = bkDate && dateKey(bkDate) === dateKey(d);
          const isToday = dateKey(d) === dateKey(new Date());
          return <button key={dateKey(d)} style={{ ...S.dateBtn, ...(sel ? S.dateSel : {}), ...(isToday && !sel ? { borderColor: "#072814" } : {}) }}
            onClick={async () => {
              setBkDate(d); setBkDur(null); setBkTime(null); setBkBay(null);
              if (tier === "early_birdie") {
                const dateStr = d.toISOString().split("T")[0];
                const todayBks = await sb.get("bookings", `customer_id=eq.${customerId}&date=eq.${dateStr}&status=eq.confirmed&type=eq.bay&select=start_time,duration_slots`);
                // Count slots already booked in the EB window (Mon-Fri 8am-4pm)
                let used = 0;
                (todayBks || []).forEach(bk => {
                  const h = toH(bk.start_time);
                  const isWkday = !isWeekend(d);
                  for (let i = 0; i < bk.duration_slots; i++) {
                    const slotH = h + i * 0.5;
                    if (isWkday && slotH >= 8 && slotH < 16) used++;
                  }
                });
                setEbSlotsToday(used);
              }
            }}>
            <span style={{ fontSize: 11, color: sel ? "#fff" : "#888" }}>{dayName(d)}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: sel ? "#fff" : "#1a1a1a" }}>{d.getDate()}</span>
            <span style={{ fontSize: 10, color: sel ? "#ffffffcc" : "#aaa" }}>{d.toLocaleDateString("en-US", { month: "short" })}</span>
          </button>;
        })}
      </div></>

      {bkDate && <><h4 style={S.stepH}>Select Duration</h4>
        <div style={{ ...S.durGrid, gridTemplateColumns: isDesktop ? "repeat(8, 1fr)" : "repeat(4, 1fr)" }}>
          {durs.filter(d => d.slots <= champMax).map(d => {
            const sel = bkDur === d.slots;
            return <button key={d.slots} style={{ ...S.durBtn, ...(sel ? S.durSel : {}) }} onClick={() => { setBkDur(d.slots); setBkTime(null); setBkBay(null); }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: sel ? "#fff" : "#1a1a1a" }}>{d.l}</span>
            </button>;
          })}
        </div>
      </>}

      {bkDate && bkDur && <><h4 style={S.stepH}>Select Start Time</h4>
        <div style={{ ...S.timeGrid, gridTemplateColumns: isDesktop ? "repeat(6, 1fr)" : "repeat(4, 1fr)" }}>
          {getAllTimes(bkDate, bkDur, bayBlocks, allBookings, hoursConfig).map(({ time: t, open }) => {
            const sel = bkTime === t, pk = isPeak(bkDate, t), wk = isWeekend(bkDate);
            return <button key={t} style={{ ...S.timeBtn, ...(sel ? S.timeSel : {}), ...(!open ? { opacity: 0.35, cursor: "not-allowed" } : {}) }}
              onClick={() => { if (open) { setBkTime(t); setBkBay(null); } }} disabled={!open}>
              <span style={{ fontSize: 12, fontWeight: 600, color: sel ? "#fff" : !open ? "#ccc" : "#1a1a1a" }}>{t}</span>
              {!open && <span style={{ fontSize: 8, fontWeight: 700, color: "#ccc" }}>FULL</span>}
            </button>;
          })}
        </div>
      </>}

      {bkDate && bkDur && bkTime && <><h4 style={S.stepH}>Select Bay</h4>
        <div style={S.bayGrid}>
          {getAvailBays(bkDate, bkTime, bkDur, bayBlocks, allBookings, hoursConfig).map(b => {
            const sel = bkBay === b.bay;
            return <button key={b.bay} style={{ ...S.bayBtn, ...(sel ? S.baySel : {}), ...(b.ok ? {} : S.bayOff) }} onClick={() => { if (b.ok) setBkBay(b.bay); }} disabled={!b.ok}>
              <span style={{ fontSize: 14, fontWeight: 700, color: sel ? "#fff" : b.ok ? "#1a1a1a" : "#ccc" }}>Bay {b.bay}</span>
              {!b.ok && <span style={{ fontSize: 9, color: "#ccc" }}>Unavailable</span>}
            </button>;
          })}
        </div>
      </>}

      {bkDate && bkDur && bkTime && bkBay && (() => {
        const { eTier: pvTier, eCredits: pvCredits, warn: pvWarn } = effectiveTierOn(bkDate);
        const price = calcPrice(bkDate, bkTime, bkDur, pvTier, pvCredits, cfg, hoursConfig, pvTier === "early_birdie" ? ebSlotsToday : 0);
        return <div style={{ ...S.pricePreview, ...(pvWarn === "past_renewal_player" ? { borderColor: "#E8890C44", background: "#FFF5E508" } : {}) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: pvWarn === "past_renewal_player" ? "#E8890C" : "#072814" }}>${price.total.toFixed(2)}</span>
          </div>
          {pvWarn === "past_renewal_player" && <p style={{ fontSize: 11, color: "#E8890C", marginTop: 4, fontWeight: 600 }}>⚠ Full rate — booking past your {renewDate} renewal</p>}
          {price.credits > 0 && <p style={{ fontSize: 11, color: "#072814", marginTop: 4 }}>{price.credits} hr credit{price.credits > 1 ? "s" : ""} applied</p>}
          {pvTier === "early_birdie" && price.credits > 0 && <p style={{ fontSize: 11, color: "#072814", marginTop: 2 }}>Free window: {price.credits}hr covered</p>}
          {pvWarn === "switch" && pvTier !== tier && <p style={{ fontSize: 11, color: "#E8890C", marginTop: 4 }}>Priced as {TIERS[pvTier]?.n} — new plan from {renewDate}</p>}
          {price.disc > 0 && <p style={{ fontSize: 11, color: "#072814", marginTop: 2 }}>Member discount: -${price.disc.toFixed(2)}</p>}
          {price.tax > 0 && <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Includes ${price.tax.toFixed(2)} tax (7%)</p>}
        </div>;
      })()}
      {bkDate && bkDur && bkTime && bkBay && <button style={{ ...S.b1, marginTop: 14 }} onClick={async () => {
        const now = new Date();
        const isToday = bkDate && isSameLocalDay(bkDate, now);
        const currentH = now.getHours() + now.getMinutes() / 60;
        if (isToday && bkTime && toH(bkTime) <= currentH) { fire("That time slot has passed — please select a new time."); setBkTime(null); setBkBay(null); return; }
        // Block second same-day credit booking — must pay by card
        const { eTier } = effectiveTierOn(bkDate);
        const usesCredits = eTier === "early_birdie" || eTier === "player" || eTier === "champion";
        if (usesCredits) {
          const dateStr = dateKey(bkDate);
          const sameDayCreditBks = allBookings.filter(b => b.date === dateStr && b.type === "bay" && b.status === "confirmed" && (b.credits_used > 0 || eTier === "champion"));
          if (sameDayCreditBks.length > 0 && cards.length === 0) { fire("Add a card to make additional same-day bookings."); setTab("profile"); return; }
        }
        setBkStep(1);
              trackMeta("InitiateCheckout", { content_name: "Bay Booking", content_category: "Bay" });
              trackGA("begin_checkout", { item_category: "bay" });
      }}>Continue to Confirm</button>}
    </>;
  };

  /* ─── LESSONS ─── */
  const renderLessons = () => {
    if (lesTab === "book" && lesStep === 1 && lesDate && lesTime && lesCoach) {
      const coach = COACHES.find(c => c.id === lesCoach);
      const lp = lessonPrice(tier, totL > 0, creditCoachId, lesCoach);
      const bayAssigned = autoAssignBay(lesDate, lesTime, bayBlocks, allBookings, hoursConfig);
      const wrongCoach = totL > 0 && lesCoach !== creditCoachId;
      const cancelFee = (tier && tier !== "none") ? (slotRate(lesDate, lesTime, cfg) * 0.8).toFixed(2) : slotRate(lesDate, lesTime, cfg).toFixed(2);
      return <>
        <div style={S.hd}><button style={S.bk} onClick={() => setLesStep(0)}>{X.chevL(18)}</button><h2 style={S.ht}>Confirm Lesson</h2></div>
        <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={S.confCard}>
              {[["Coach", coach?.n], ["Date", fmtDateLong(lesDate)], ["Time", lesTime + " · 1 hr"], ["Bay", "Bay " + bayAssigned]].map(([l, v]) => <div key={l} style={S.confRow}><span style={S.confL}>{l}</span><span style={S.confV}>{v}</span></div>)}
              <div style={S.confDiv} />
              <div style={S.confRow}><span style={{ ...S.confL, fontWeight: 700 }}>Total</span><span style={{ ...S.confV, fontSize: 15, fontWeight: 700, color: lp.credit ? "#072814" : "#1a1a1a" }}>{lp.label}</span></div>
            </div>
            {wrongCoach && <div style={{ ...S.polBox, background: "#FFF0F0", borderColor: "#E0392822" }}><p style={{ fontSize: 12, color: "#E03928", lineHeight: 1.5 }}>Credits only valid with {creditCoach?.n}. Full rate applies.</p></div>}
          </div>
          <div>
            <div style={S.polBox}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Cancellation Policy</p>
              <div style={{ fontSize: 12, color: "#8B6914", lineHeight: 1.6, marginBottom: 12 }}>
                <p style={{ marginBottom: 6 }}><strong>Within 24 hours or no-show:</strong> No refund. You will be charged the bay rental cost for that hour (${slotRate(lesDate, lesTime, cfg).toFixed(2)}).</p>
                <p><strong>More than 24 hours in advance:</strong> Full refund — lesson credits returned to your account, or refund to your credit card on file.</p>
              </div>
              <label style={S.chkRow}><input type="checkbox" checked={lesAgree} onChange={() => setLesAgree(!lesAgree)} style={{ marginRight: 8, accentColor: "#00305B" }} /><span style={{ fontSize: 12 }}>I have read and agree to the cancellation policy</span></label>
            </div>
            {(() => {
              const needsCard = lp.total > 0 && cards.length === 0;
              const doBook = async (cardLabel) => {
                if (lesProcessing) return;
                setLesProcessing(true);
                await saveLessonBooking({ bay: bayAssigned, date: lesDate, time: lesTime, coachId: lesCoach, coachName: coach?.n, total: lp.total, credit: lp.credit, cardLabel: cardLabel || (cards?.[0] ? (cards[0].brand + " ···" + cards[0].last4) : "Card") });
                setUpcomingBk(p => [...p, { type: "lesson", label: "Lesson · " + coach?.n, sub: fmtDate(lesDate) + " · " + lesTime + " · 1hr" }]);
                if (lp.credit) { setTotL(c => Math.max(0, c - 1)); setCreditUsage(p => [...p, { date: fmtDate(new Date()), desc: "Lesson with " + coach?.n }]); }
                setLesHistory(p => [...p, { type: "lesson", desc: "Lesson with " + coach?.n, date: fmtDate(new Date()), amt: lp.credit ? "1 credit" : lp.label }]);
                setAllBookings(p => [...p, { id: Date.now().toString(), bay: bayAssigned, date: lesDate ? lesDate.toISOString().split("T")[0] : "", start_time: lesTime, duration_slots: 2, status: "confirmed", type: "lesson" }]);
                if (customerId) { const today = new Date(); today.setHours(0,0,0,0); const bks = await sb.get("bookings", `select=*&customer_id=eq.${customerId}&status=eq.confirmed&order=date.asc`); const upcoming = (bks || []).filter(b => new Date(b.date + "T23:59:59") >= today); setUpcomingBk(upcoming.map(b => ({ id: b.id, type: b.type, label: b.type === "lesson" ? "Lesson · " + (b.coach_name || "") : "Bay " + b.bay, sub: new Date(b.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · " + b.start_time + " · " + (b.duration_slots * 0.5) + "hr" + (b.duration_slots > 2 ? "s" : ""), date: b.date, start_time: b.start_time, bay: b.bay, duration_slots: b.duration_slots, credits_used: b.credits_used || 0, amount: b.amount || 0, square_payment_id: b.square_payment_id || null, square_customer_id: b.square_customer_id || null, coach_name: b.coach_name || "" }))); }
                trackMeta("Purchase", { content_name: "Lesson Booking", content_category: "Lesson", value: lp.total, currency: "USD" });
                trackGA("purchase", { transaction_id: Date.now().toString(), value: lp.total, currency: "USD", item_category: "lesson" });
                fire("Lesson booked!"); resetLes(); setTab("home");
              };
              if (needsCard) return (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Enter your card — it will be saved to your profile for future bookings.</p>
                  <AddCardForm
                    appId={SQUARE_APP_ID}
                    locationId={SQUARE_LOCATION_ID}
                    saveLabel={`Confirm & Book · ${lp.label}`}
                    onCancel={() => setLesStep(0)}
                    onSave={async ({ nonce, brand, last4, exp }) => {
                      let activeSqCustId = sqCustId;
                      if (!activeSqCustId) {
                        // Customer missing Square ID — create on the fly then retry
                        const sqR = await square("customer.search", { phone: String(customerId), email: "" });
                        let foundId = sqR?.customers?.[0]?.id;
                        if (!foundId) {
                          const created = await square("customer.create", { first_name: onbF, last_name: onbL, phone: String(customerId), email: profEmail || onbE, supabase_id: customerId });
                          foundId = created?.customer?.id;
                        }
                        if (foundId) {
                          setSqCustId(foundId);
                          activeSqCustId = foundId;
                          await sb.patch("customers", `id=eq.${customerId}`, { square_customer_id: foundId });
                        }
                      }
                      if (!activeSqCustId) { fire("Could not link your account. Please contact us."); reportError("Square customer link failed", "No sqCustId at checkout", null); return; }
                      // Duplicate check
                      const dupCheck = cards.find(c => c.last4 === last4 && c.brand === brand && c.exp === exp);
                      if (dupCheck) { fire("This card is already saved to your profile."); return; }
                      const res = await square("card.create", { square_customer_id: activeSqCustId, source_id: nonce });
                      if (res?.card?.id) {
                        const saved = await sb.post("payment_methods", { customer_id: customerId, brand, last4, exp, square_card_id: res.card.id });
                        setCards([saved?.[0] ? { id: saved[0].id, brand, last4, exp, square_card_id: res.card.id } : { id: Date.now(), brand, last4, exp, square_card_id: res.card.id }]);
                        await doBook(brand + " ···" + last4);
                      } else { fire("Could not save card. Please try again."); reportError("Card save failed", "Checkout card save", res); }
                    }}
                  />
                </div>
              );
              return (
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button style={S.b2} onClick={() => setLesStep(0)}>Back</button>
                  <button style={{ ...S.b1, flex: 2, background: "#00305B", opacity: (lesAgree && !lesProcessing) ? 1 : 0.4 }} disabled={!lesAgree || lesProcessing} onClick={async () => { if (!lesAgree || lesProcessing) return; await doBook(); }}>{lesProcessing ? "Processing…" : "Confirm & Book"}</button>
                </div>
              );
            })()}
          </div>
        </div>
      </>;
    }

    const CoachCard = ({ c, sel, locked, onClick }) => (
      <button style={{ ...S.coachCard, ...(sel ? { borderColor: "#00305B", background: "#00305B0A" } : {}), ...(locked ? { opacity: 0.4, cursor: "not-allowed" } : {}) }} onClick={onClick} disabled={locked}>
        <div style={S.coachAv}>{c.ini}</div>
        <div><p style={{ fontSize: 13, fontWeight: 600 }}>{c.n}</p>
          {locked && <p style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>Credits with {creditCoach?.n.split(" ")[0]}</p>}</div>
      </button>
    );

    const DateBtn = ({ d, sel, disabled: dis, color = "#00305B" }) => (
      <button style={{ ...S.dateBtn, ...(sel ? { ...S.dateSel, background: color } : {}), ...(dateKey(d) === dateKey(new Date()) && !sel ? { borderColor: color } : {}), ...(dis ? { opacity: 0.35 } : {}) }}
        onClick={() => { if (!dis) { setLesDate(d); setLesTime(null); if (lesMode === "date") setLesCoach(null); } }} disabled={dis}>
        <span style={{ fontSize: 11, color: sel ? "#fff" : "#888" }}>{dayName(d)}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: sel ? "#fff" : "#1a1a1a" }}>{d.getDate()}</span>
        <span style={{ fontSize: 10, color: sel ? "#ffffffcc" : "#aaa" }}>{d.toLocaleDateString("en-US", { month: "short" })}</span>
      </button>
    );

    return <>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Lessons</h2>
      <div style={S.tabs}>
        {["book", "packages"].map(t => <button key={t} style={{ ...S.tabBtn, ...(lesTab === t ? S.tabSel : {}) }} onClick={() => { setLesTab(t); setSelPkg(null); setPkgCoach(null); }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {lesTab === "book" && <>
        {totL > 0 && <div style={{ ...S.creditBanner, background: "rgba(0,48,91,0.07)", borderColor: "rgba(0,48,91,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ background: "#00305B", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{totL}</span><span style={{ fontSize: 13, fontWeight: 600, color: "#00305B" }}>Lesson Credits Available</span></div>
          <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{creditPkg} · {creditCoach?.n}</p>
        </div>}
        <div style={S.modeToggle}>
          <button style={{ ...S.modeBtn, ...(lesMode === "date" ? S.modeSel : {}) }} onClick={() => { setLesMode("date"); resetLes(); }}>By Date & Time</button>
          <button style={{ ...S.modeBtn, ...(lesMode === "instructor" ? S.modeSel : {}) }} onClick={() => { setLesMode("instructor"); resetLes(); }}>By Instructor</button>
        </div>

        {lesMode === "date" ? <>
          <h4 style={S.stepH}>Select Date</h4>
          <div style={S.dateScroll}>{days14.map(d => { const dn = dayName(d); const hasCoach = COACHES.some(c => (c.av[dn] || []).length > 0); return <DateBtn key={dateKey(d)} d={d} sel={lesDate && dateKey(lesDate) === dateKey(d)} disabled={!hasCoach} />; })}</div>
          {lesDate && <><h4 style={S.stepH}>Select Start Time</h4><div style={{ ...S.timeGrid, gridTemplateColumns: isDesktop ? "repeat(6,1fr)" : "repeat(4,1fr)" }}>
            {getLessonTimes(lesDate, null, bayBlocks, allBookings, hoursConfig).map(t => { const sel = lesTime === t; return <button key={t} style={{ ...S.timeBtn, ...(sel ? { ...S.timeSel, background: "#00305B", borderColor: "#00305B" } : { borderColor: "rgba(0,48,91,0.25)" }) }} onClick={() => { setLesTime(t); setLesCoach(null); }}><span style={{ fontSize: 12, fontWeight: 600, color: sel ? "#fff" : "#1a1a1a" }}>{t}</span></button>; })}
          </div></>}
          {lesDate && lesTime && <><h4 style={S.stepH}>Select Instructor</h4><div style={{ display: "flex", gap: 10 }}>
            {getCoachesAt(lesDate, lesTime, bayBlocks, allBookings).map(c => <CoachCard key={c.id} c={c} sel={lesCoach === c.id} locked={totL > 0 && c.id !== creditCoachId} onClick={() => { if (!(totL > 0 && c.id !== creditCoachId)) setLesCoach(c.id); }} />)}
          </div></>}
        </> : <>
          <h4 style={S.stepH}>Select Instructor</h4>
          <div style={{ display: "flex", gap: 10 }}>{COACHES.map(c => <CoachCard key={c.id} c={c} sel={lesCoach === c.id} locked={totL > 0 && c.id !== creditCoachId} onClick={() => { if (!(totL > 0 && c.id !== creditCoachId)) { setLesCoach(c.id); setLesDate(null); setLesTime(null); } }} />)}</div>
          {lesCoach && <><h4 style={S.stepH}>Select Date</h4><div style={S.dateScroll}>{days14.map(d => { const coach = COACHES.find(c => c.id === lesCoach); const hasSlots = (coach?.av[dayName(d)] || []).length > 0; return <DateBtn key={dateKey(d)} d={d} sel={lesDate && dateKey(lesDate) === dateKey(d)} disabled={!hasSlots} />; })}</div></>}
          {lesCoach && lesDate && <><h4 style={S.stepH}>Select Start Time</h4><div style={{ ...S.timeGrid, gridTemplateColumns: isDesktop ? "repeat(6,1fr)" : "repeat(4,1fr)" }}>
            {getLessonTimes(lesDate, COACHES.find(c => c.id === lesCoach), bayBlocks, allBookings, hoursConfig).map(t => { const sel = lesTime === t; return <button key={t} style={{ ...S.timeBtn, ...(sel ? { ...S.timeSel, background: "#00305B", borderColor: "#00305B" } : { borderColor: "rgba(0,48,91,0.25)" }) }} onClick={() => setLesTime(t)}><span style={{ fontSize: 12, fontWeight: 600, color: sel ? "#fff" : "#1a1a1a" }}>{t}</span></button>; })}
          </div></>}
        </>}

        {lesDate && lesTime && lesCoach && (() => {
          const coach = COACHES.find(c => c.id === lesCoach), lp = lessonPrice(tier, totL > 0, creditCoachId, lesCoach);
          return <div style={{ ...S.pricePreview, borderColor: "rgba(0,48,91,0.2)", background: "#00305B08", marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><p style={{ fontSize: 13, fontWeight: 600 }}>{coach?.n} · 1 hr</p><p style={{ fontSize: 11, color: "#888" }}>Bay {autoAssignBay(lesDate, lesTime, bayBlocks, allBookings, hoursConfig)}</p></div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: lp.credit ? "#072814" : "#00305B" }}>{lp.label}</span>
                {(!tier || tier === "none") && !lp.credit && <p style={{ fontSize: 10, color: "#3AE58D", marginTop: 2, fontWeight: 600 }}>Members pay $120 · Join to save</p>}
              </div>
            </div></div>;
        })()}
        {lesDate && lesTime && lesCoach && <button style={{ ...S.b1, marginTop: 12, background: "#00305B" }} onClick={async () => {
          const now = new Date();
          const isToday = lesDate && isSameLocalDay(lesDate, now);
          const currentH = now.getHours() + now.getMinutes() / 60;
          if (isToday && lesTime && toH(lesTime) <= currentH) { fire("That time slot has passed — please select a new time."); setLesTime(null); setLesCoach(null); return; }
          // Block same-day duplicate lessons
          const dateStr = dateKey(lesDate);
          const existingLessons = allBookings.filter(b => b.date === dateStr && b.type === "lesson" && b.status === "confirmed" && b.start_time === lesTime);
          if (existingLessons.length > 0) { fire("You already have a lesson booked at this time today."); return; }
          setLesStep(1);
        }}>Continue to Confirm</button>}
      </>}

      {lesTab === "packages" && <>
        {totL > 0 ? <>
          <div style={S.creditDetailCard}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><p style={{ fontSize: 15, fontWeight: 700 }}>{creditPkg}</p><span style={{ background: "#00305B", color: "#fff", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 10 }}>{totL}/{maxL}</span></div>
            <p style={{ fontSize: 12, color: "#888" }}>{creditCoach?.n}</p>
            <p style={{ fontSize: 13, color: "#00305B", fontWeight: 600, marginTop: 8 }}>{totL} out of {maxL} lesson credits remaining</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "#888" }}><span>Purchased {creditPurchaseDate}</span><span>Expires {creditExp}</span></div>
            <button style={{ ...S.b1, background: "#00305B", marginTop: 14 }} onClick={() => { setLesTab("book"); setLesCoach(creditCoachId); setLesMode("instructor"); }}>Book with Credits</button>
          </div>
          {creditUsage.length > 0 && <><h4 style={{ ...S.stepH, marginTop: 20 }}>Credit Usage</h4>
            {creditUsage.map((u, i) => <div key={i} style={S.histRow}><div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 500 }}>{u.desc}</p><p style={{ fontSize: 11, color: "#888" }}>{u.date}</p></div><span style={{ fontSize: 12, fontWeight: 700, color: "#E03928" }}>-1</span></div>)}</>}
        </> : <>
          {!selPkg ? <>
            <h4 style={S.stepH}>Select a Package</h4><p style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>Purchase a lesson package to save on hourly rates.</p>
            {(() => { const isMem = tier && tier !== "none";
              const pkgs = [{ name: "3-Hour Package", credits: 3, price: isMem ? 300 : 360, memberPrice: 300, months: 2 }, { name: "5-Hour Package", credits: 5, price: isMem ? 400 : 500, memberPrice: 400, months: 3 }];
              return pkgs.map(p => <div key={p.name} style={{ ...S.pkgCard, marginBottom: 12 }}>
                <button style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%", padding: 0, fontFamily: ff }} onClick={() => setSelPkg(p)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div><p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{p.name}</p><p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{p.credits} lesson credits</p></div>
                    <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>${p.price}</p>
                  </div>
                </button>
                {!isMem && <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid #f0ede8", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Members pay <strong style={{ color: "#072814" }}>${p.memberPrice}</strong></p>
                  <button style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#072814", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: ff, flexShrink: 0 }} onClick={() => { setTab("membership"); setMemTab("memberships"); }}>Join now →</button>
                </div>}
              </div>); })()}
          </> : !pkgCoach ? <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><button style={S.bk} onClick={() => { setSelPkg(null); setPkgCoach(null); }}>{X.chevL(18)}</button><div><p style={{ fontSize: 15, fontWeight: 700 }}>{selPkg.name}</p><p style={{ fontSize: 12, color: "#888" }}>{selPkg.credits} credits · ${selPkg.price}</p></div></div>
            <h4 style={S.stepH}>Select Instructor</h4><div style={{ display: "flex", gap: 10 }}>{COACHES.map(c => <CoachCard key={c.id} c={c} sel={pkgCoach === c.id} locked={false} onClick={() => setPkgCoach(c.id)} />)}</div>
          </> : (() => { const coach = COACHES.find(c => c.id === pkgCoach);
            const doPkgPurchase = async (coach) => {
              if (pkgProcessing) return;
              setPkgProcessing(true);
              const today = new Date(), expDate = new Date(today); expDate.setMonth(expDate.getMonth() + (selPkg.months || 3));
              const fmtShort = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              const existingPkg = await sb.get("lesson_packages", `customer_id=eq.${customerId}&status=eq.active&select=id`);
              if (existingPkg?.length > 0) { fire("You already have an active lesson package. Use your remaining credits first."); setSelPkg(null); setPkgCoach(null); return; }
              let sqPaymentId = null;
              if (sqCustId && cards?.[0]?.square_card_id) {
                const isMem = !!tier && tier !== "none";
                const chargeRes = await square("lesson.purchase", {
                  square_customer_id: sqCustId,
                  card_id: cards[0].square_card_id,
                  coach_id: pkgCoach,
                  hours: selPkg.credits,
                  is_member: isMem,
                });
                sqPaymentId = chargeRes?.payment?.id;
                if (chargeRes?.error || !sqPaymentId) { fire("Payment failed — please try again."); reportError("Payment declined", `Lesson package · ${selPkg?.name}`, chargeRes?.error, chargeRes); return; }
              }
              await sb.post("lesson_packages", { customer_id: customerId, name: selPkg.name, total_credits: selPkg.credits, remaining_credits: selPkg.credits, coach_id: pkgCoach, coach_name: coach?.n, price: selPkg.price, expiry_date: dateKey(expDate), status: "active", purchase_date: dateKey(today), square_payment_id: sqPaymentId });
              await sb.post("transactions", { customer_id: customerId, description: selPkg.name + " · " + coach?.n, date: dateKey(today), amount: selPkg.price, payment_label: cards?.[0] ? (cards[0].brand + " ···" + cards[0].last4) : "Card", square_payment_id: sqPaymentId });
              setTotL(selPkg.credits); setMaxL(selPkg.credits); setCreditCoachId(pkgCoach); setCreditPkg(selPkg.name); setCreditPurchaseDate(fmtShort(today)); setCreditExp(fmtShort(expDate)); setCreditUsage([]);
              setTransactions(p => [{ desc: selPkg.name + " · " + coach?.n, date: fmtShort(today), method: cards?.[0] ? (cards[0].brand + " ···" + cards[0].last4) : "Card", amt: "$" + selPkg.price + ".00" }, ...p]);
              sendEmail("lesson_package", {
                customer_name: onbF + " " + onbL,
                customer_email: profEmail || onbE,
                package: selPkg.name,
                credits: selPkg.credits,
                coach: coach?.n,
                total: "$" + selPkg.price + ".00",
                expiry: fmtShort(expDate),
              });
              trackMeta("Purchase", { content_name: selPkg.name, content_category: "Lesson Package", value: selPkg.price, currency: "USD" });
              trackGA("purchase", { transaction_id: Date.now().toString(), value: selPkg.price, currency: "USD", item_category: "lesson_package", item_name: selPkg.name });
              fire("Package purchased!"); setSelPkg(null); setPkgCoach(null);
              setPkgProcessing(false);
            };
            return <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><button style={S.bk} onClick={() => setPkgCoach(null)}>{X.chevL(18)}</button><div><p style={{ fontSize: 15, fontWeight: 700 }}>{selPkg.name}</p><p style={{ fontSize: 12, color: "#888" }}>{selPkg.credits} credits · {coach?.n}</p></div></div>
              <div style={S.confCard}>
                  {[["Package", selPkg.name], ["Credits", selPkg.credits + " lessons"], ["Instructor", coach?.n]].map(([l, v]) => <div key={l} style={S.confRow}><span style={S.confL}>{l}</span><span style={S.confV}>{v}</span></div>)}
                  <div style={S.confDiv} />
                  <div style={S.confRow}><span style={{ ...S.confL, fontWeight: 700 }}>Total</span><span style={{ ...S.confV, fontSize: 15, fontWeight: 700 }}>${selPkg.price}</span></div>
                  <p style={{ fontSize: 11, color: "#888", marginTop: 10, lineHeight: 1.5 }}>⏱ Expires {selPkg.months} month{selPkg.months > 1 ? "s" : ""} from purchase date.</p>
                </div>
              {cards.length === 0 ? (
                <div style={{ marginTop: 16, background: "#f8f8f6", border: "1px solid #e0ddd6", borderRadius: 14, padding: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#072814", marginBottom: 4 }}>Save a card to complete purchase</p>
                  <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Your card will be saved to your profile for future use.</p>
                  <AddCardForm
                    appId={SQUARE_APP_ID}
                    locationId={SQUARE_LOCATION_ID}
                    saveLabel={`Confirm & Buy · $${selPkg.price}`}
                    onCancel={() => setPkgCoach(null)}
                    onSave={async ({ nonce, brand, last4, exp }) => {
                      let activeSqCustId = sqCustId;
                      if (!activeSqCustId) {
                        // Customer missing Square ID — create on the fly then retry
                        const sqR = await square("customer.search", { phone: String(customerId), email: "" });
                        let foundId = sqR?.customers?.[0]?.id;
                        if (!foundId) {
                          const created = await square("customer.create", { first_name: onbF, last_name: onbL, phone: String(customerId), email: profEmail || onbE, supabase_id: customerId });
                          foundId = created?.customer?.id;
                        }
                        if (foundId) {
                          setSqCustId(foundId);
                          activeSqCustId = foundId;
                          await sb.patch("customers", `id=eq.${customerId}`, { square_customer_id: foundId });
                        }
                      }
                      if (!activeSqCustId) { fire("Could not link your account. Please contact us."); reportError("Square customer link failed", "No sqCustId at checkout", null); return; }
                      // Duplicate check
                      const dupCheck = cards.find(c => c.last4 === last4 && c.brand === brand && c.exp === exp);
                      if (dupCheck) { fire("This card is already saved to your profile."); return; }
                      const res = await square("card.create", { square_customer_id: activeSqCustId, source_id: nonce });
                      if (res?.card?.id) {
                        const saved = await sb.post("payment_methods", { customer_id: customerId, brand, last4, exp, square_card_id: res.card.id });
                        const newCard = saved?.[0] ? { id: saved[0].id, brand, last4, exp, square_card_id: res.card.id } : { id: Date.now(), brand, last4, exp, square_card_id: res.card.id };
                        setCards([newCard]);
                        fire("Card saved! Completing your purchase…");
                        await doPkgPurchase(coach);
                      } else { fire("Could not save card. Please try again."); reportError("Card save failed", "Checkout card save", res); }
                    }}
                  />
                </div>
              ) : (
                <button style={{ ...S.b1, background: "#00305B", marginTop: 14, opacity: pkgProcessing ? 0.5 : 1 }} disabled={pkgProcessing} onClick={() => doPkgPurchase(coach)}>{pkgProcessing ? "Processing…" : "Buy"}</button>
              )}
            </div>; })()}
        </>}
      </>}

    </>;
  };

  /* ─── MEMBERSHIP ─── */
  const renderMembership = () => {
    const td = TIERS[tier];
    return <>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Membership</h2>
      <div style={S.tabs}>{["current", "memberships"].map(t => <button key={t} style={{ ...S.tabBtn, ...(memTab === t ? S.tabSel : {}) }} onClick={() => setMemTab(t)}>{t === "memberships" ? "Types" : "Current"}</button>)}</div>

      {memTab === "current" && (!td || tier === "none") && (
        <div style={S.emptyCard}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No active membership</p>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>Browse our membership plans to unlock bay credits, discounts, and more.</p>
          <button style={{ ...S.b1, maxWidth: 200, margin: "0 auto" }} onClick={() => setMemTab("memberships")}>View Plans</button>
        </div>
      )}

      {memTab === "current" && td && tier !== "none" && <>
        <div style={{ ...S.mc, background: `linear-gradient(135deg, ${td.c}, ${td.c}cc)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div><span style={S.mcBadge}>{td.badge}</span><p style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 8 }}>{td.n} Plan</p><p style={{ fontSize: 14, color: "#ffffffbb" }}>${td.price}/mo</p></div>
            <button style={S.mcManage} onClick={() => setMemTab("memberships")}>Manage →</button>
          </div>
          {tier === "player" && <p style={{ fontSize: 12, color: "#fff", fontWeight: 600, marginTop: 14 }}>{bayCredits} out of 8 bay credits remaining</p>}
          {tier === "early_birdie" && <p style={{ fontSize: 13, color: "#ffffffcc", marginTop: 14 }}>Up to 2 hrs/day · Mon–Fri 8am–4pm</p>}
          {tier === "champion" && <p style={{ fontSize: 13, color: "#ffffffcc", marginTop: 14 }}>Unlimited credits</p>}
          {totL > 0 && <p style={{ fontSize: 11, color: "#ffffffaa", marginTop: 10 }}>{totL} lesson credit{totL > 1 ? "s" : ""} active</p>}
          <p style={{ fontSize: 11, color: "#ffffff88", marginTop: 10 }}>Renews {renewDate}</p>
          {pendingTier && TIERS[pendingTier] && <div style={{ marginTop: 10, background: "#ffffff22", borderRadius: 8, padding: "8px 12px" }}>
            <p style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>⟶ Switching to {TIERS[pendingTier].n} Plan on {renewDate}</p>
            <p style={{ fontSize: 11, color: "#ffffffbb", marginTop: 2 }}>Your current plan stays active until then.</p>
          </div>}
        </div>
        <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={S.detailCard}><h4 style={S.detailH}>Plan Details</h4>
            {[["Plan", td.n], ["Monthly Rate", "$" + td.price], ["Member Since", memberSince], ["Next Renewal", renewDate], ...(tier === "champion" ? [["Bay Hours", "Unlimited (max 2hr/booking)"]] : tier === "early_birdie" ? [["Bay Hours", "2 non-peak hrs/day · Mon–Fri 8am–4pm"]] : tier === "player" ? [["Bay Hours", bayCredits + " of 8 remaining"]] : [])].map(([l, v]) => <div key={l} style={S.detailRow}><span style={S.detailL}>{l}</span><span style={S.detailV}>{v}</span></div>)}</div>
          <div style={S.detailCard}><h4 style={S.detailH}>Perks</h4>
            {td.perks.map(p => <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}><span style={{ color: "#072814" }}>{X.chk(16)}</span><span style={{ fontSize: 13 }}>{p}</span></div>)}</div>
        </div>
        <div style={S.detailCard}><h4 style={S.detailH}>Cancellation Policy</h4>
          <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 12 }}>Next renewal: {renewDate}. Cancelling more than 7 days before renewal — access continues through {renewDate}. Cancelling within 7 days — one final charge applies on {renewDate}, with access through the following cycle.</p>
          <button style={{ ...S.b1, background: "#E03928" }} onClick={() => setMemModal("cancel")}>Cancel Membership</button></div>
      </>}


      {memTab === "memberships" && <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {Object.entries(TIERS).map(([k, t]) => <div key={k} style={{ ...S.pkgCard, borderLeft: `3px solid ${t.c}`, display: "flex", flexDirection: "column" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ background: t.c, color: k === "starter" ? "#072814" : "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, fontFamily: ff, letterSpacing: 1 }}>{t.badge}</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{t.n}</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>${t.price}<span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>/mo</span></p>
            <div style={{ borderTop: "0.5px solid #f0ede8", paddingTop: 10, marginBottom: 8 }}>
              {t.perks.map(p => <div key={p} style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "4px 0" }}>
                <span style={{ color: "#3AE58D", flexShrink: 0, marginTop: 1 }}>{X.chk(13)}</span>
                <span style={{ fontSize: 12, color: "#444", lineHeight: 1.4 }}>{p}</span>
              </div>)}
            </div>
            {t.enrollmentFee && enrollmentFeeEnabled && <p style={{ fontSize: 11, color: "#888", marginTop: 4, lineHeight: 1.5 }}>One-time ${t.enrollmentFee} enrollment fee at sign-up.</p>}
          </div>
          <div style={{ marginTop: "auto", paddingTop: 14 }}>
            {k === tier ? <div style={{ textAlign: "center", padding: "10px 0", fontSize: 13, fontWeight: 600, color: t.c }}>✓ Current Plan</div>
            : k === pendingTier ? <div style={{ textAlign: "center", padding: "10px 0", fontSize: 12, fontWeight: 600, color: t.c }}>Switching on {renewDate}</div>
            : cards.length > 0 ? <button style={{ ...S.b1, background: pendingTier ? "#aaa" : t.c, color: k === "starter" ? "#072814" : "#fff" }} disabled={!!pendingTier} onClick={() => !pendingTier && setMemModal({ type: (!tier || tier === "none") ? "join" : "switch", to: k })}>
                {(!tier || tier === "none") ? "Join" : Object.keys(TIERS).indexOf(k) > Object.keys(TIERS).indexOf(tier) ? "Upgrade" : "Switch"}
              </button>
            : <button style={{ ...S.b1, background: "#ccc" }} onClick={() => { setTab("profile"); fire("Please add a card first"); }}>Add Card to Join</button>}
          </div>
        </div>)}
      </div>}

      {memModal?.type === "join" && (() => {
        const t = TIERS[memModal.to];
        const ef = enrollmentFeeEnabled ? (t?.enrollmentFee || 0) : 0;
        const subtotal = (t?.price || 0) + ef;
        const tax = applyTax(subtotal);
        const total = subtotal + tax;
        const cardLabel = cards?.[0] ? (cards[0].brand + " ..." + cards[0].last4) : "card on file";
        const sqCardId = cards?.[0]?.square_card_id;
        return <div style={S.ov} onClick={() => setMemModal(null)}><div style={S.mod} onClick={e => e.stopPropagation()}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t?.n} Membership</h3>
          <p style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>Joining the {t?.n} plan. Here is what you will be charged today:</p>
          <div style={{ background: "#f7f7f5", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#555" }}>First Month ({t?.n})</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>${t?.price}.00</span>
            </div>
            {ef > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#555" }}>One-time Enrollment Fee</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>${ef}.00</span>
            </div>}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#555" }}>Tax (7%)</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>${tax.toFixed(2)}</span>
            </div>
            <div style={{ borderTop: "1px solid #e8e8e6", marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Total Due Today</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: t?.c }}>${total.toFixed(2)}</span>
            </div>
          </div>
          {memModal.to === "early_birdie" && <div style={{ background: "rgba(7,40,20,0.04)", border: "1px solid #4A8B6E33", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#072814", marginBottom: 4 }}>Time Restriction</p>
            <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>Early Birdie credits apply Mon–Fri 8am–4pm only. Bookings outside that window are charged at the full hourly rate + tax.</p>
          </div>}
          {cards.length === 0 ? (
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Enter your card — it will be saved to your profile for future use.</p>
              <AddCardForm
                appId={SQUARE_APP_ID}
                locationId={SQUARE_LOCATION_ID}
                saveLabel={`Confirm & Pay $${total.toFixed(2)}`}
                onCancel={() => setMemModal(null)}
                onSave={async ({ nonce, brand, last4, exp }) => {
                  if (memProcessing) return;
                  setMemProcessing(true);
                  let activeSqCustId = sqCustId;
                  if (!activeSqCustId) {
                    const sqR = await square("customer.search", { phone: String(customerId), email: "" });
                    let foundId = sqR?.customers?.[0]?.id;
                    if (!foundId) { const cr = await square("customer.create", { first_name: onbF, last_name: onbL, phone: String(customerId), email: profEmail || onbE, supabase_id: customerId }); foundId = cr?.customer?.id; }
                    if (foundId) { setSqCustId(foundId); activeSqCustId = foundId; await sb.patch("customers", `id=eq.${customerId}`, { square_customer_id: foundId }); }
                  }
                  if (!activeSqCustId) { fire("Could not link your account. Please contact us."); setMemProcessing(false); return; }
                  const res = await square("card.create", { square_customer_id: activeSqCustId, source_id: nonce });
                  if (!res?.card?.id) { fire("Could not save card. Please try again."); reportError("Card save failed", "Membership checkout", res); setMemProcessing(false); return; }
                  const saved = await sb.post("payment_methods", { customer_id: customerId, brand, last4, exp, square_card_id: res.card.id });
                  const newCard = saved?.[0] ? { id: saved[0].id, brand, last4, exp, square_card_id: res.card.id } : { id: Date.now(), brand, last4, exp, square_card_id: res.card.id };
                  setCards([newCard]);
                  const newSqCardId = res.card.id;
                  const newCardLabel = brand + " ..." + last4;
                  const chargeRes = await square("membership.charge", { square_customer_id: activeSqCustId, card_id: newSqCardId, tier: memModal.to });
                  const sqPaymentId = chargeRes?.payment?.id;
                  if (!sqPaymentId) { fire("Payment failed. Please try again."); reportError("Payment declined", `Membership · ${memModal?.to}`, chargeRes?.error, chargeRes); setMemProcessing(false); return; }
                  const freshCust = await sb.get("customers", `id=eq.${customerId}&select=tier`);
                  if (freshCust?.[0]?.tier && freshCust[0].tier !== "none") { fire("You already have an active membership."); setMemModal(null); setMemProcessing(false); return; }
                  const rd = new Date(); rd.setMonth(rd.getMonth() + 1);
                  await sb.patch("customers", "id=eq." + customerId, { tier: memModal.to, bay_credits_remaining: t?.hrs === -1 ? 999 : (t?.hrs || 0), bay_credits_total: t?.hrs === -1 ? 999 : (t?.hrs || 0), member_since: dateKey(new Date()), renewal_date: dateKey(rd) });
                  await sb.post("membership_history", { customer_id: customerId, action: "join", tier: memModal.to, amount: total, date: dateKey(new Date()) });
                  await sb.post("transactions", { customer_id: customerId, description: t?.n + " Membership - First Month", date: dateKey(new Date()), amount: t?.price, payment_label: newCardLabel, square_payment_id: sqPaymentId });
                  if (ef > 0) await sb.post("transactions", { customer_id: customerId, description: t?.n + " Enrollment Fee (one-time)", date: dateKey(new Date()), amount: ef, payment_label: newCardLabel, square_payment_id: sqPaymentId });
                  await sb.post("transactions", { customer_id: customerId, description: "Tax (7%)", date: dateKey(new Date()), amount: tax, payment_label: newCardLabel, square_payment_id: sqPaymentId });
                  setTier(memModal.to); setBayCredits(t?.hrs === -1 ? 999 : (t?.hrs || 0));
                  setMemberSince(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
                  setRenewDate(rd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
                  loadUserData(customerId);
                  sendEmail("membership", { customer_email: profEmail || onbE, customer_name: (onbF + " " + onbL).trim(), plan: t?.n + " Plan", price: "$" + t?.price + "/mo", renewal: rd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), enrollment_fee: ef > 0 ? "$" + ef + " (one-time)" : null });
                  trackMeta("Subscribe", { content_name: t?.n + " Membership", value: total, currency: "USD", predicted_ltv: t?.price * 12 });
                  trackGA("purchase", { transaction_id: Date.now().toString(), value: total, currency: "USD", item_category: "membership", item_name: t?.n });
                  fire("Welcome to " + t?.n + "!"); setMemModal(null); setMemTab("current"); setMemProcessing(false);
                }}
              />
            </div>
          ) : (
            <>
              <p style={{ fontSize: 11, color: "#aaa", marginBottom: 16 }}>Charged to {cardLabel}. Renews monthly at ${t?.price}/mo + tax.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={S.b2} onClick={() => setMemModal(null)}>Cancel</button>
                <button style={{ ...S.b1, flex: 2, background: t?.c, opacity: memProcessing ? 0.5 : 1 }} disabled={memProcessing} onClick={async () => {
                  if (memProcessing) return;
                  setMemProcessing(true);
                  let sqPaymentId = null;
                  if (total > 0 && sqCustId && sqCardId) {
                    const chargeRes = await square("membership.charge", { square_customer_id: sqCustId, card_id: sqCardId, tier: memModal.to });
                    sqPaymentId = chargeRes?.payment?.id;
                    if (!sqPaymentId) { fire("Payment failed. Please try again."); reportError("Payment declined", `Membership · ${memModal?.to}`, chargeRes?.error, chargeRes); setMemProcessing(false); return; }
                  }
                  const freshCust = await sb.get("customers", `id=eq.${customerId}&select=tier`);
                  if (freshCust?.[0]?.tier && freshCust[0].tier !== "none") { fire("You already have an active membership."); setMemModal(null); setMemProcessing(false); return; }
                  const rd = new Date(); rd.setMonth(rd.getMonth() + 1);
                  await sb.patch("customers", "id=eq." + customerId, { tier: memModal.to, bay_credits_remaining: t?.hrs === -1 ? 999 : (t?.hrs || 0), bay_credits_total: t?.hrs === -1 ? 999 : (t?.hrs || 0), member_since: dateKey(new Date()), renewal_date: dateKey(rd) });
                  await sb.post("membership_history", { customer_id: customerId, action: "join", tier: memModal.to, amount: total, date: dateKey(new Date()) });
                  await sb.post("transactions", { customer_id: customerId, description: t?.n + " Membership - First Month", date: dateKey(new Date()), amount: t?.price, payment_label: cardLabel, square_payment_id: sqPaymentId });
                  if (ef > 0) await sb.post("transactions", { customer_id: customerId, description: t?.n + " Enrollment Fee (one-time)", date: dateKey(new Date()), amount: ef, payment_label: cardLabel, square_payment_id: sqPaymentId });
                  await sb.post("transactions", { customer_id: customerId, description: "Tax (7%)", date: dateKey(new Date()), amount: tax, payment_label: cardLabel, square_payment_id: sqPaymentId });
                  setTier(memModal.to); setBayCredits(t?.hrs === -1 ? 999 : (t?.hrs || 0));
                  setMemberSince(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
                  setRenewDate(rd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
                  loadUserData(customerId);
                  sendEmail("membership", { customer_email: profEmail || onbE, customer_name: (onbF + " " + onbL).trim(), plan: t?.n + " Plan", price: "$" + t?.price + "/mo", renewal: rd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), enrollment_fee: ef > 0 ? "$" + ef + " (one-time)" : null });
                  fire("Welcome to " + t?.n + "!"); setMemModal(null); setMemTab("current"); setMemProcessing(false);
                }}>{ memProcessing ? "Processing…" : `Confirm and Pay $${total.toFixed(2)}` }</button>
              </div>
            </>
          )}
        </div></div>;
      })()}

      {memModal === "cancel" && (() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const rd = renewDate ? new Date(renewDate) : null;
        const daysToRenewal = rd ? Math.ceil((rd - today) / 86400000) : 999;
        const withinWindow = daysToRenewal >= 0 && daysToRenewal <= 7;
        const nextRd = rd ? new Date(rd) : null;
        if (nextRd) nextRd.setMonth(nextRd.getMonth() + 1);
        const nextRdStr = nextRd ? nextRd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
        return <div style={S.ov} onClick={() => setMemModal(null)}><div style={S.mod} onClick={e => e.stopPropagation()}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Cancel Membership?</h3>
          {withinWindow ? (
            <div style={{ background: "#FFF8E8", border: "1px solid #E8890C44", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#E8890C", marginBottom: 6 }}>Within 7-Day Renewal Window</p>
              <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>Your renewal date is {renewDate} — within 7 days. Your membership will be <strong>charged one final time</strong> on {renewDate}, and you retain full access and credits through <strong>{nextRdStr}</strong>. After that, your membership ends and no further charges occur.</p>
            </div>
          ) : (
            <div style={{ background: "#F5F5F5", border: "1px solid #e8e8e6", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>You retain full access to your {td?.n} benefits and credits through your current renewal date — <strong>{renewDate}</strong>. After that, your membership ends and you will not be charged again.</p>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.b2} onClick={() => setMemModal(null)}>Keep Plan</button>
            <button style={{ ...S.b1, flex: 2, background: "#E03928" }} onClick={async () => {
              await sb.post("membership_history", { customer_id: customerId, action: "cancel", tier, amount: 0, date: dateKey(new Date()) });
              await sb.post("transactions", { customer_id: customerId, description: `Membership Cancellation Scheduled — ${td?.n || ""} Plan — Access until ${renewDate} — No further charges · Cancelled by customer`, date: dateKey(new Date()), amount: 0, payment_label: "System" });
              sendEmail("cancellation_membership", {
                customer_email: profEmail || onbE,
                customer_name: (onbF + " " + onbL).trim(),
                tier: td?.n || tier,
                renewal_date: withinWindow ? nextRdStr : renewDate,
                within_window: withinWindow,
              });
              fire(withinWindow ? "Cancellation scheduled. Access continues through " + nextRdStr : "Cancellation scheduled. Access continues through " + renewDate);
              setMemModal(null);
            }}>Schedule Cancellation</button>
          </div>
        </div></div>;
      })()}

      {memModal?.type === "switch" && (() => {
        const newT = TIERS[memModal.to];
        const today = new Date(); today.setHours(0,0,0,0);
        const rd = renewDate ? new Date(renewDate) : null;
        const daysToRenewal = rd ? Math.ceil((rd - today) / 86400000) : 999;
        const within7 = daysToRenewal <= 7;
        return <div style={S.ov} onClick={() => setMemModal(null)}><div style={S.mod} onClick={e => e.stopPropagation()}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Switch to {newT?.n}?</h3>
          {within7 ? <>
            <div style={{ background: "#FFF5E5", border: "1px solid #E8890C44", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#E8890C", marginBottom: 6 }}>Within 7 Days of Renewal</p>
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>Given you are within 7 days of your renewal date, if you want to switch memberships, please give us a call at <strong>+1 (305) 456-4149</strong> or contact us through WhatsApp at <strong>+1 (305) 542-1222</strong>.</p>
            </div>
            <button style={S.b2} onClick={() => setMemModal(null)}>Close</button>
          </> : <>
            <div style={{ background: "#f7f7f5", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>You will stay on your <strong>current {TIERS[tier]?.n} Plan</strong> until <strong>{renewDate}</strong>. Starting on that date, you will be switched to the <strong>{newT?.n} Plan</strong> at ${newT?.price}/mo.</p>
            </div>
            <p style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>No charge today. Your next billing cycle will reflect the new plan.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.b2} onClick={() => setMemModal(null)}>Cancel</button>
              <button style={{ ...S.b1, flex: 2, background: newT?.c }} onClick={async () => {
                await sb.patch("customers", `id=eq.${customerId}`, { pending_tier: memModal.to });
                await sb.post("membership_history", { customer_id: customerId, action: "switch_scheduled", tier: memModal.to, amount: newT?.price, date: dateKey(new Date()) });
                setPendingTier(memModal.to);
                sendEmail("membership_switch", {
                  customer_name: onbF + " " + onbL,
                  customer_email: profEmail || onbE,
                  current_plan: TIERS[tier]?.n,
                  new_plan: newT?.n,
                  new_price: "$" + newT?.price + "/mo",
                  switch_date: renewDate,
                });
                fire("Switch scheduled for " + renewDate); setMemModal(null); setMemTab("current");
              }}>Confirm Switch</button>
            </div>
          </>}
        </div></div>;
      })()}
    </>;
  };

  /* ─── PROFILE ─── */
  const renderProfile = () => <>
    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Profile</h2>
    <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div style={S.sec}><h4 style={S.secL}>Personal Information</h4>
        {[{ l: "First Name", v: onbF }, { l: "Last Name", v: onbL }, { l: "Phone", v: profPhone ? ("+1 " + profPhone.replace(/\D/g,"").replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")) : ("+1 " + ph.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")), edit: "phone" }, { l: "Email", v: profEmail || onbE, edit: "email" }].map(f =>
          <div key={f.l} style={S.fRow}><div style={{ flex: 1 }}><p style={S.fL}>{f.l}</p><p style={S.fV}>{f.v}</p></div>
            {f.edit && <button style={S.editBtn} onClick={() => setEditModal({ type: f.edit, val: "", step: "edit", otp: ["","","","","",""] })}>{X.edit(14)}</button>}</div>)}
      </div>
      <div style={S.sec}><h4 style={S.secL}>Payment Methods</h4>
        {cards.map(c => <div key={c.id} style={S.fRow}><div style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 600 }}>{c.brand} ····{c.last4}</p><p style={{ fontSize: 11, color: "#888" }}>Exp {c.exp}</p></div>
          {cards.length > 1 ? <button style={S.delCardBtn} onClick={() => { setCards(p => p.filter(x => x.id !== c.id)); fire("Card removed"); }}>{X.trash(14)}</button> : <span style={{ fontSize: 10, color: "#aaa", fontWeight: 600 }}>Required</span>}</div>)}
        {addCard ? <AddCardForm appId={SQUARE_APP_ID} locationId={SQUARE_LOCATION_ID} onCancel={() => setAddCard(false)} onSave={async ({ nonce, brand, last4, exp }) => {
            // Tokenize via Square Web Payments SDK — nonce is a one-time secure token
            // Duplicate check
            const dupCard = cards.find(c => c.last4 === last4 && c.brand === brand && c.exp === exp);
            if (dupCard) { fire("This card is already saved to your profile."); return; }
            const sqResult = await square("card.create", {
              square_customer_id: sqCustId,
              source_id: nonce,
            });
            if (!sqResult?.card?.id) { fire("Failed to save card. Please try again."); reportError("Card save failed", "Profile card add", sqResult); return; }
            const sqCardId = sqResult.card.id;
            const saved = await sb.post("payment_methods", { customer_id: customerId, brand, last4, exp, square_card_id: sqCardId });
            const savedId = Array.isArray(saved) ? saved[0]?.id : saved?.id;
            setCards(p => [...p, { id: savedId || Date.now(), brand, last4, exp, square_card_id: sqCardId }]);
            setAddCard(false); fire("Card added"); setTab("home");
          }} />
        : <button style={S.addCardBtn} onClick={() => setAddCard(true)}>{X.plus(14)} Add Card</button>}
      </div>
    </div>

    <div style={S.sec}><h4 style={S.secL}>Transaction History</h4>
      {transactions.length === 0 ? <p style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "12px 0" }}>No transactions yet</p> : <>
      {(showAllTxn ? transactions : transactions.slice(0, 5)).map((t, i) => <div key={i} style={S.fRow}><div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 500 }}>{t.desc}</p><p style={{ fontSize: 11, color: "#888" }}>{t.date} · {t.method}</p></div><span style={{ fontSize: 13, fontWeight: 600, color: t.amt === "$0.00" ? "#072814" : "#1a1a1a" }}>{t.amt}</span></div>)}
      {transactions.length > 5 && <button style={{ ...S.lk, width: "100%", textAlign: "center", padding: "10px 0", fontSize: 13 }} onClick={() => setShowAllTxn(p => !p)}>{showAllTxn ? "Show less" : "Show all " + transactions.length + " transactions"}</button>}
      </>}
      <p style={{ fontSize: 10, color: "#ccc", textAlign: "center", marginTop: 14 }}>Powered by Square</p></div>

    <button style={{ ...S.b1, background: "#E03928", marginTop: 8 }} onClick={() => { setLogged(false); setAuthStep("phone"); setPh(""); setOtp(["","","","","",""]); setOtpCode(""); setVerifySid(""); setOnbF(""); setOnbL(""); setOnbE(""); }}>{X.out(16)} Sign Out</button>

    {editModal && <div style={S.ov} onClick={() => setEditModal(null)}><div style={S.mod} onClick={e => e.stopPropagation()}>
      {editModal.step === "edit" ? <>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Update {editModal.type === "phone" ? "Phone Number" : "Email Address"}</h3>
        <input style={S.profIn} placeholder={editModal.type === "phone" ? "+1 (305) 555-0000" : "you@email.com"} value={editModal.val} onChange={e => setEditModal(p => ({ ...p, val: e.target.value }))} />
        {editModal.type === "email"
          ? <button style={{ ...S.b1, marginTop: 12 }} disabled={editModal.sending} onClick={async () => {
              if (!editModal.val || !editModal.val.includes("@")) { fire("Please enter a valid email"); return; }
              setEditModal(p => ({ ...p, sending: true }));
              const code = Math.floor(100000 + Math.random() * 900000).toString();
              // Send verification code via Resend
              try {
                await fetch(SQUARE_FN_URL, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}`, "x-bgs-key": BGS_API_KEY },
                  body: JSON.stringify({ action: "email.send", type: "verification_code", customer_name: onbF, customer_email: editModal.val, code }) });
              } catch(e) { console.warn("Verification email failed", e); }
              setEditModal(p => ({ ...p, step: "otp", code, sending: false }));
            }}>{editModal.sending ? "Sending…" : "Send Verification Code"}</button>
          : <button style={{ ...S.b1, marginTop: 12 }} onClick={async () => {
              if (!editModal.val) { fire("Please enter a phone number"); return; }
              setProfPhone(editModal.val);
              await sb.patch("customers", `id=eq.${customerId}`, { phone: editModal.val });
              if (sqCustId) await square("customer.update", { square_customer_id: sqCustId, phone: editModal.val.replace(/\D/g,"") });
              fire("Phone number updated"); setEditModal(null);
            }}>Save Phone Number</button>
        }
      </> : <>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Check Your Email</h3>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 14 }}>We sent a 6-digit code to {editModal.val}</p>
        <div style={{ ...LS.otpRow, justifyContent: "center" }}>{editModal.otp.map((v, i) => <input key={i} ref={editOtpRefs[i]} style={{ ...LS.otpIn, width: 40, height: 44 }} type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={1} value={v} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, "").slice(-1); const next = [...editModal.otp]; next[i] = val; setEditModal(p => ({ ...p, otp: next })); if (val && i < 5) editOtpRefs[i + 1].current?.focus(); }} onKeyDown={e => { if (e.key === "Backspace" && !editModal.otp[i] && i > 0) editOtpRefs[i - 1].current?.focus(); }} />)}</div>
        <button style={{ ...S.b1, marginTop: 12 }} onClick={async () => {
          const entered = editModal.otp.join("");
          if (entered.length < 6) { fire("Enter the full 6-digit code"); return; }
          if (entered !== editModal.code) { fire("Incorrect code — please try again"); return; }
          setProfEmail(editModal.val);
          await sb.patch("customers", `id=eq.${customerId}`, { email: editModal.val });
          if (sqCustId) await square("customer.update", { square_customer_id: sqCustId, email: editModal.val });
          fire("Email updated"); setEditModal(null);
        }}>Verify & Save</button>
      </>}
      <button style={{ ...S.lk, marginTop: 10, display: "block", textAlign: "center", width: "100%" }} onClick={() => setEditModal(null)}>Cancel</button>
    </div></div>}
    <div style={{ height: 40 }} />
  </>;

  /* ─── LAYOUT ─── */
  return (
    <div style={S.shell}><style>{CSS}</style>
      {!isMobile && <TopNav />}
      <div style={S.scroll}>{renderContent()}</div>
      {isMobile && <BottomNav />}
      {/* ══ MANAGE BOOKING MODAL ══ */}
      {manageBk && <ManageBookingModal
        bk={manageBk}
        onClose={() => setManageBk(null)}
        customerId={customerId}
        tier={tier}
        bayCredits={bayCredits}
        setBayCredits={setBayCredits}
        cfg={cfg}
        sb={sb}
        square={square}
        cards={cards}
        fire={fire}
        profEmail={profEmail}
        onbE={onbE}
        onbF={onbF}
        onbL={onbL}
        onRefresh={() => {
          if (customerId) {
            const today = new Date(); today.setHours(0,0,0,0);
            sb.get("bookings", `select=*&customer_id=eq.${customerId}&status=eq.confirmed&order=date.asc`).then(bks => {
              const upcoming = (bks || []).filter(b => new Date(b.date + "T23:59:59") >= today);
              setUpcomingBk(upcoming.map(b => ({
                id: b.id, type: b.type,
                label: b.type === "lesson" ? "Lesson · " + (b.coach_name || "") : "Bay " + b.bay,
                sub: new Date(b.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · " + b.start_time + " · " + (b.duration_slots * 0.5) + "hr" + (b.duration_slots > 2 ? "s" : ""),
                date: b.date, start_time: b.start_time, bay: b.bay,
                duration_slots: b.duration_slots, credits_used: b.credits_used || 0,
                amount: b.amount || 0, square_payment_id: b.square_payment_id || null,
                square_customer_id: b.square_customer_id || null, coach_name: b.coach_name || "",
              })));
            });
            sb.get("bookings", "select=id,bay,date,start_time,duration_slots,status,type&status=neq.cancelled").then(a => { if (a?.length) setAllBookings(a); });
          }
        }}
        SUPABASE_KEY={SUPABASE_KEY}
        SQUARE_FN_URL={SQUARE_FN_URL}
        ff={ff}
        mono={mono}
      />}
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MANAGE BOOKING MODAL — Cancel bay & lesson bookings
   ═══════════════════════════════════════════════════════════ */

function ManageBookingModal({ bk, onClose, customerId, tier, bayCredits, setBayCredits, cfg, sb, square, cards, fire, onRefresh, SUPABASE_KEY, SQUARE_FN_URL, ff, mono, profEmail, onbE, onbF, onbL }) {
  const [saving, setSaving] = React.useState(false);

  const toH = s => { const [t,ap]=s.split(" "); let [h,m]=t.split(":").map(Number); if(ap==="PM"&&h!==12)h+=12; if(ap==="AM"&&h===12)h=0; return h+m/60; };

  // Parse booking start time into a proper local Date
  const bkStart = (() => {
    const [t,ap] = (bk.start_time||"9:00 AM").split(" ");
    let [h,m] = t.split(":").map(Number);
    if(ap==="PM"&&h!==12) h+=12; if(ap==="AM"&&h===12) h=0;
    const d = new Date(bk.date + "T00:00:00");
    d.setHours(h, m, 0, 0);
    return d;
  })();

  const hoursUntil = (bkStart - new Date()) / 3600000;
  const within24   = hoursUntil <= 24 && hoursUntil > 0;
  const isPast     = hoursUntil <= 0;

  // Rate for this booking slot
  const d    = new Date(bk.date + "T12:00:00");
  const isWk = d.getDay() === 0 || d.getDay() === 6;
  const hour = toH(bk.start_time || "9:00 AM");
  const isPeak = !isWk && hour >= 17;
  const rate = isPeak ? cfg.pk : cfg.op;

  const creditsUsed = bk.credits_used || 0;
  const isMember    = tier && tier !== "none" && tier !== "starter";
  const isLesson    = bk.type === "lesson";
  const lateFee     = rate; // 1hr bay rate for lesson late cancel

  // Send cancellation email
  const sendCancelEmail = async (refundDesc) => {
    const customerEmail = profEmail || onbE;
    const customerName = (onbF + " " + onbL).trim();
    const payload = {
      customer_email: customerEmail,
      customer_name: customerName,
      booking_type: isLesson ? "Lesson" : "Bay Booking",
      bay: bk.bay ? "Bay " + bk.bay : null,
      date: bk.date,
      time: bk.start_time,
      refund_info: refundDesc,
    };
    // Email to customer
    sendEmail("cancellation", payload);
    // Notification to staff
    sendEmail("cancellation", { ...payload, customer_email: "info@birdiegolfstudios.com", customer_name: "Staff" });
  };

  /* ── Cancel booking ── */
  const cancelBooking = async () => {
    setSaving(true);
    try {

    // 1. Mark booking cancelled — this immediately frees the bay
    await sb.patch("bookings", `id=eq.${bk.id}`, {
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    });

    let refundDesc = "No refund (within 24-hour cancellation window).";

    if (within24 && isLesson) {
      // Lesson within 24h: charge late fee
      const defaultCard = cards[0];
      let sqPaymentId = null;
      if (defaultCard?.square_card_id && bk.square_customer_id) {
        const payment = await square("payment.create", {
          square_customer_id: bk.square_customer_id,
          card_id: defaultCard.square_card_id,
          amount: lateFee,
          note: `Late cancellation fee · Lesson ${bk.date}`,
        });
        sqPaymentId = payment?.payment?.id || null;
      }
      await sb.post("transactions", {
        customer_id: customerId,
        description: `Cancellation · Lesson · ${bk.date} · ${bk.start_time || ""} — Late fee charged (within 24h window) · Cancelled by customer`,
        date: new Date().toISOString().split("T")[0],
        amount: lateFee,
        payment_label: "Card",
        square_payment_id: sqPaymentId,
      });
      refundDesc = `Late cancellation fee of $${lateFee.toFixed(2)} charged.`;
      fire(`Lesson cancelled · $${lateFee.toFixed(2)} fee charged`);

    } else if (!within24) {
      // Outside 24h window: full refund — handle credits AND card simultaneously
      const refundParts = [];

      // Refund credits if any were used
      if (creditsUsed > 0 && isMember) {
        const newCredits = tier === "player" ? Math.min(bayCredits + creditsUsed, 8) : bayCredits + creditsUsed;
        await sb.patch("customers", `id=eq.${customerId}`, { bay_credits_remaining: newCredits });
        setBayCredits(newCredits);
        await sb.post("transactions", {
          customer_id: customerId,
          description: `Cancellation · ${isLesson ? "Lesson" : "Bay " + bk.bay} · ${bk.date} · ${bk.start_time || ""} — ${creditsUsed} credit${creditsUsed!==1?"s":""} refunded · Cancelled by customer`,
          date: new Date().toISOString().split("T")[0],
          amount: 0,
          payment_label: "Credits",
        });
        refundParts.push(`${creditsUsed} credit${creditsUsed !== 1 ? "s" : ""} returned`);
      }

      // Refund card charge if any money was paid
      if (bk.square_payment_id && bk.amount > 0) {
        await square("payment.refund", {
          payment_id: bk.square_payment_id,
          amount: bk.amount,
          reason: "Customer cancellation",
        });
        await sb.post("transactions", {
          customer_id: customerId,
          description: `Cancellation · ${isLesson ? "Lesson" : "Bay " + bk.bay} · ${bk.date} · ${bk.start_time || ""} — $${bk.amount.toFixed(2)} refunded to card · Cancelled by customer`,
          date: new Date().toISOString().split("T")[0],
          amount: -(bk.amount),
          payment_label: "Refund",
        });
        refundParts.push(`$${bk.amount.toFixed(2)} refunded to card`);
      }

      if (refundParts.length > 0) {
        refundDesc = refundParts.join(" + ") + ".";
        fire("Cancelled · " + refundParts.join(" + "));
      } else {
        // No payment on file — still log cancellation
        await sb.post("transactions", {
          customer_id: customerId,
          description: `Cancellation · ${isLesson ? "Lesson" : "Bay " + (bk.bay || bk.label || "")} · ${bk.date} · ${bk.start_time || ""} — No refund applicable · Cancelled by customer`,
          date: new Date().toISOString().split("T")[0],
          amount: 0,
          payment_label: "N/A",
        });
        fire("Booking cancelled");
      }
    } else {
      // Bay within 24h: no refund — still log cancellation
      await sb.post("transactions", {
        customer_id: customerId,
        description: `Cancellation · ${isLesson ? "Lesson" : "Bay " + (bk.bay || bk.label || "")} · ${bk.date} · ${bk.start_time || ""} — No refund (within 24h window) · Cancelled by customer`,
        date: new Date().toISOString().split("T")[0],
        amount: 0,
        payment_label: "N/A",
      });
      fire("Booking cancelled (no refund)");
    }

    // Send cancellation confirmation email
    await sendCancelEmail(refundDesc);

    } catch(e) {
      console.error("Cancel error:", e);
      fire("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
      onClose();
      onRefresh();
    }
  };

  const GREEN="#072814", RED="#E03928", ORANGE="#072814", PURPLE="#00305B";
  const accentColor = isLesson ? PURPLE : GREEN;
  const ov  = { position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20 };
  const mod = { background:"#fff",borderRadius:20,padding:24,maxWidth:420,width:"100%",maxHeight:"85vh",overflowY:"auto" };
  const btn1 = c => ({ background:c,color:"#fff",border:"none",borderRadius:12,padding:"13px 18px",fontSize:14,fontWeight:600,fontFamily:ff,cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8 });
  const btn2 = { background:"#f0f0ee",color:"#1a1a1a",border:"none",borderRadius:12,padding:"13px 18px",fontSize:14,fontWeight:600,fontFamily:ff,cursor:"pointer",width:"100%",marginTop:8 };

  return (
    <div style={ov} onClick={onClose}>
      <div style={mod} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
          <div style={{ width:40,height:40,borderRadius:10,background:accentColor+"14",color:accentColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18 }}>
            {isLesson ? "🎓" : "⛳"}
          </div>
          <div>
            <h3 style={{ fontSize:16,fontWeight:700 }}>{bk.label}</h3>
            <p style={{ fontSize:12,color:"#888" }}>{bk.sub}</p>
          </div>
        </div>

        {isPast ? (
          <div style={{ background:"#f8f8f6",borderRadius:10,padding:14,marginBottom:16,textAlign:"center" }}>
            <p style={{ fontSize:13,color:"#888" }}>This booking has already passed.</p>
          </div>
        ) : (
          <>
            {/* Policy message */}
            <div style={{ background: within24 ? RED+"08" : GREEN+"08", border:`1px solid ${within24 ? RED : GREEN}22`, borderRadius:10,padding:14,marginBottom:18 }}>
              {within24 ? (
                isLesson ? (
                  <>
                    <p style={{ fontSize:13,fontWeight:700,color:RED,marginBottom:6 }}>Within 24-Hour Window</p>
                    <p style={{ fontSize:12,color:"#555",lineHeight:1.6 }}>Per our cancellation policy, cancelling within 24 hours of your lesson will incur a <strong>${lateFee.toFixed(2)}</strong> fee (the cost of renting the bay during your reserved hour). No refund on the lesson payment.</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize:13,fontWeight:700,color:RED,marginBottom:6 }}>Cancelling within 24 hours</p>
                    <p style={{ fontSize:12,color:"#555",lineHeight:1.6 }}>This booking starts soon, so it's no longer eligible for a refund. You can still cancel, but no credits or charges will be returned.</p>
                  </>
                )
              ) : (
                <>
                  <p style={{ fontSize:13,fontWeight:700,color:GREEN,marginBottom:6 }}>You're good to cancel</p>
                  <p style={{ fontSize:12,color:"#555",lineHeight:1.6 }}>
                    You can still cancel this booking and receive a full refund. If you paid with credits, they'll be returned to your account.
                  </p>
                </>
              )}
            </div>

            <button style={btn1(RED)} onClick={cancelBooking} disabled={saving}>
              {saving ? "Processing..." : "Cancel"}
            </button>
          </>
        )}

        <button style={btn2} onClick={onClose}>Keep Booking</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}html,body,#root{height:100%;overflow:hidden}::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}input:focus,button:focus{outline:none}.otp-input::placeholder{font-family:'DM Sans',sans-serif;font-size:14px;letter-spacing:0;color:#bbb}@keyframes ti{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}button:active{transform:scale(0.97)}`;

const LS = {
  w: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(155deg,#072814,#0a3520 45%,#0f4a25)", fontFamily: ff, padding: 20 },
  c: { background: "#fff", borderRadius: 22, padding: "36px 28px", width: "100%", maxWidth: 420, boxShadow: "0 28px 80px rgba(0,0,0,0.28)" },
  br: { textAlign: "center", marginBottom: 24 },
  bn: { fontFamily: ff, fontSize: 18, fontWeight: 700, color: "#072814", letterSpacing: 3 },
  bs: { fontFamily: ff, fontSize: 12, color: "#888", letterSpacing: 0.5, marginTop: 4 },
  label: { fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 6, display: "block" },
  phRow: { display: "flex", alignItems: "center", gap: 8, background: "#f8f8f6", borderRadius: 12, padding: "0 14px", border: "1px solid #e8e8e6" },
  phPre: { fontSize: 16, fontWeight: 400, color: "#1a1a1a", flexShrink: 0 },
  phIn: { flex: 1, border: "none", background: "transparent", padding: "14px 0", fontSize: 16, fontFamily: ff, color: "#1a1a1a" },

  tagline: { fontSize: 16, fontWeight: 600, color: "#072814", textAlign: "center", marginBottom: 10 },
  features: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 20 },
  feat: { fontSize: 11, color: "#555", whiteSpace: "nowrap" },
  featDot: { fontSize: 11, color: "#ccc" },
  divider: { height: 1, background: "#e8e8e6", marginBottom: 18 },
  signInLabel: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 14 },
  footer: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 20, paddingTop: 16, borderTop: "1px solid #f2f2f0" },
  footerText: { fontSize: 11, color: "#aaa" },
  otpRow: { display: "flex", gap: 8, justifyContent: "center" },
  otpIn: { width: 46, height: 52, textAlign: "center", fontSize: 22, fontWeight: 700, fontFamily: ff, border: "1px solid #e8e8e6", borderRadius: 12, background: "#f8f8f6", color: "#1a1a1a" },
  nameRow: { display: "flex", gap: 10, marginBottom: 12 },
  onbIn: { width: "100%", padding: "13px 14px", border: "1px solid #e8e8e6", borderRadius: 12, fontSize: 14, fontFamily: ff, color: "#1a1a1a" },
};

const S = {
  shell: { fontFamily: ff, position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#FAFAF8", overflow: "hidden" },
  scroll: { flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" },
  page: { maxWidth: 680, margin: "0 auto", padding: "24px 20px 100px", width: "100%" },

  /* Top nav (desktop/tablet) */
  topNav: { background: "#072814", borderBottom: "none", position: "sticky", top: 0, zIndex: 100 },
  topNavInner: { maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 60 },
  topNavBrand: { flexShrink: 0 },
  topNavLinks: { display: "flex", gap: 4 },
  topNavBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: "none", background: "transparent", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: ff },
  topNavBtnActive: { background: "rgba(58,229,141,0.15)", color: "#3AE58D", fontWeight: 600 },
  tierBadge: { fontSize: 9, fontWeight: 700, color: "#072814", padding: "4px 9px", borderRadius: 5, fontFamily: ff, letterSpacing: 1, border: "none", cursor: "pointer", flexShrink: 0, background: "#3AE58D" },

  /* Bottom nav (mobile) — floating dark pill */
  nav: { padding: "10px 14px", paddingBottom: "calc(10px + env(safe-area-inset-bottom, 8px))", background: "#FAFAF8", flexShrink: 0 },
  navPill: { background: "#072814", borderRadius: 12, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(7,40,20,0.22)" },
  navBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "7px 0", border: "none", background: "none", cursor: "pointer", fontFamily: ff, borderRadius: 8 },
  navBtnActive: { background: "rgba(58,229,141,0.15)" },

  /* Buttons */
  b1: { background: "#072814", color: "#fff", border: "none", borderRadius: 12, padding: "14px 18px", fontSize: 14, fontWeight: 600, fontFamily: ff, cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  b2: { background: "#f0f0ee", color: "#1a1a1a", border: "none", borderRadius: 12, padding: "14px 18px", fontSize: 14, fontWeight: 600, fontFamily: ff, cursor: "pointer", flex: 1, textAlign: "center" },
  lk: { background: "none", border: "none", color: "#072814", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff },

  /* Header / Back */
  hd: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  bk: { width: 36, height: 36, borderRadius: 10, background: "#f0f0ee", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: "#1a1a1a" },
  ht: { fontSize: 18, fontWeight: 700, color: "#072814" },

  /* Greeting */
  greetRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  greetH: { fontSize: 22, fontWeight: 700, color: "#072814" },
  greetS: { fontSize: 13, color: "#888", marginTop: 2 },

  /* Quick actions */
  qGrid: { display: "grid", gap: 8, marginBottom: 24 },
  qBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 4px", background: "#fff", border: "0.5px solid #e8e4dc", borderRadius: 12, cursor: "pointer", fontFamily: ff },
  qIc: { width: 40, height: 40, borderRadius: 8, background: "#072814", color: "#3AE58D", display: "flex", alignItems: "center", justifyContent: "center" },
  qL: { fontSize: 11, fontWeight: 600, color: "#072814" },

  /* Section headers */
  sh: { fontSize: 10, fontWeight: 700, color: "#aaa", marginBottom: 10, marginTop: 8, letterSpacing: "1.8px", textTransform: "uppercase" },
  stepH: { fontSize: 14, fontWeight: 700, color: "#072814", marginBottom: 10, marginTop: 18 },

  /* Cards */
  emptyCard: { background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 14 },
  upCard: { display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 12, padding: "13px 14px", marginBottom: 8 },
  upIc: { width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  creditCard: { background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 12, padding: 16 },
  creditBanner: { background: "rgba(7,40,20,0.06)", border: "1px solid rgba(7,40,20,0.12)", borderRadius: 12, padding: "14px 16px", marginBottom: 10 },

  /* Progress bar */
  bar: { height: 6, borderRadius: 3, background: "#f0f0ee", overflow: "hidden" },
  barF: { height: "100%", borderRadius: 3, transition: "width .3s" },

  /* About / Contact */
  aboutGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 },
  aboutCard: { background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 12, padding: 13 },
  contactBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#072814", textDecoration: "none", fontFamily: ff, cursor: "pointer" },

  /* Date scroll */
  dateScroll: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 4 },
  dateBtn: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, minWidth: 60, height: 78, padding: "6px 8px", background: "#fff", border: "1.5px solid #e0ddd6", borderRadius: 12, cursor: "pointer", fontFamily: ff, position: "relative", flexShrink: 0 },
  dateSel: { background: "#072814", borderColor: "#072814" },

  /* Grids */
  durGrid: { display: "grid", gap: 8 },
  durBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 6px", background: "#fff", border: "1.5px solid #e0ddd6", borderRadius: 12, cursor: "pointer", fontFamily: ff },
  durSel: { background: "#072814", borderColor: "#072814" },
  timeGrid: { display: "grid", gap: 8 },
  timeBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "12px 6px", background: "#fff", border: "1.5px solid #e0ddd6", borderRadius: 10, cursor: "pointer", fontFamily: ff },
  timeSel: { background: "#072814", borderColor: "#072814" },
  bayGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 },
  bayBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 4px", background: "#fff", border: "1.5px solid #e0ddd6", borderRadius: 12, cursor: "pointer", fontFamily: ff },
  baySel: { background: "#072814", borderColor: "#072814" },
  bayOff: { opacity: 0.4, cursor: "not-allowed" },

  /* Price / Confirmation */
  pricePreview: { background: "rgba(7,40,20,0.04)", border: "1px solid rgba(7,40,20,0.12)", borderRadius: 12, padding: 16, marginTop: 14 },
  rateInfo: { marginTop: 20, padding: "12px 14px", background: "#f8f8f6", borderRadius: 10 },
  confCard: { background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 12, padding: 20, marginBottom: 14 },
  confRow: { display: "flex", justifyContent: "space-between", padding: "8px 0" },
  confL: { fontSize: 13, color: "#888" },
  confV: { fontSize: 13, fontWeight: 600, textAlign: "right" },
  confDiv: { height: 1, background: "#f2f2f0", margin: "6px 0" },
  polBox: { background: "rgba(7,40,20,0.04)", border: "1px solid rgba(7,40,20,0.1)", borderRadius: 12, padding: 16, marginTop: 14 },
  chkRow: { display: "flex", alignItems: "center", cursor: "pointer" },

  /* Tabs */
  tabs: { display: "flex", gap: 3, marginBottom: 16, background: "#f0f0ee", borderRadius: 12, padding: 3 },
  tabBtn: { flex: 1, padding: "9px 4px", borderRadius: 10, border: "none", background: "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, color: "#888", textAlign: "center" },
  tabSel: { background: "#fff", color: "#072814", boxShadow: "0 1px 4px rgba(0,0,0,.08)" },

  /* Mode toggle */
  modeToggle: { display: "flex", gap: 3, marginBottom: 14, background: "#f0f0ee", borderRadius: 10, padding: 3 },
  modeBtn: { flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", background: "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, color: "#888", textAlign: "center" },
  modeSel: { background: "#fff", color: "#00305B", boxShadow: "0 1px 4px rgba(0,0,0,.06)" },

  /* Coach card */
  coachCard: { flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "14px 14px", background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 12, cursor: "pointer", fontFamily: ff },
  coachAv: { width: 36, height: 36, borderRadius: 8, background: "#00305B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: ff, flexShrink: 0 },

  /* Package / Detail cards */
  pkgCard: { background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 12, padding: 20, marginBottom: 14 },
  creditDetailCard: { background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 12, padding: 20, marginBottom: 14 },
  detailCard: { background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 12, padding: 20, marginBottom: 14 },
  detailH: { fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#072814" },
  detailRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f2f2f0" },
  detailL: { fontSize: 13, color: "#888" },
  detailV: { fontSize: 13, fontWeight: 600, textAlign: "right" },

  /* Membership card */
  mc: { borderRadius: 12, padding: "18px" },
  mcBadge: { background: "#ffffff33", color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6, fontFamily: ff, letterSpacing: 1 },
  mcManage: { fontSize: 12, fontWeight: 600, color: "#ffffffcc", background: "#ffffff22", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: ff },

  /* History row */
  histRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f2f2f0" },

  /* Profile */
  sec: { background: "#fff", border: "0.5px solid #e0ddd6", borderRadius: 12, padding: 20, marginBottom: 14 },
  secL: { fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#072814" },
  fRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f2f2f0" },
  fL: { fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 2 },
  fV: { fontSize: 14, fontWeight: 500 },
  editBtn: { width: 32, height: 32, borderRadius: 8, background: "#f0f0ee", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888", flexShrink: 0 },
  addCardBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, padding: "12px 16px", background: "#f8f8f6", border: "1px dashed #ccc", borderRadius: 12, width: "100%", fontSize: 13, fontWeight: 600, color: "#072814", cursor: "pointer", fontFamily: ff },
  delCardBtn: { width: 32, height: 32, borderRadius: 8, background: "#FFF0F0", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#E03928", flexShrink: 0 },
  profIn: { width: "100%", padding: "13px 14px", border: "1px solid #e0ddd6", borderRadius: 12, fontSize: 14, fontFamily: ff, color: "#1a1a1a" },

  /* Toast */
  toast: { position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", padding: "12px 24px", borderRadius: 50, fontSize: 13, fontWeight: 500, fontFamily: ff, boxShadow: "0 10px 36px rgba(0,0,0,.22)", zIndex: 200, animation: "ti .25s ease", whiteSpace: "nowrap" },

  /* Overlay / Modal */
  ov: { position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20, animation: "fadeIn .15s ease" },
  mod: { background: "#fff", borderRadius: 16, padding: 24, maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto" },
};

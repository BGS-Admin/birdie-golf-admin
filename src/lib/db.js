export const SB_URL = "https://dvaviudmsofyqttcazpw.supabase.co";
export const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2YXZpdWRtc29meXF0dGNhenB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODc1MTgsImV4cCI6MjA5MDM2MzUxOH0.SWrAlnKZ33cIAQmn0dAQFfcAZ6b8qBZcp6Dyq2gMb2g";

const H = {
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

export const db = {
  get: async (t, q = "") => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}?${q}`, { headers: H });
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },
  post: async (t, d) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: H, body: JSON.stringify(d) });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  },
  patch: async (t, q, d) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}?${q}`, { method: "PATCH", headers: H, body: JSON.stringify(d) });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  },
  del: async (t, q) => {
    try {
      await fetch(`${SB_URL}/rest/v1/${t}?${q}`, { method: "DELETE", headers: H });
      return true;
    } catch { return false; }
  },
  upsert: async (t, d, onConflict = "") => {
    try {
      const url = `${SB_URL}/rest/v1/${t}${onConflict ? `?on_conflict=${onConflict}` : ""}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { ...H, "Prefer": "return=representation,resolution=merge-duplicates" },
        body: JSON.stringify(d)
      });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }
};

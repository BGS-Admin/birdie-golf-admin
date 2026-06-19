import { SB_URL, SB_KEY } from "./db.js";

export const sq = async (action, p = {}) => {
  try {
    const r = await fetch(`${SB_URL}/functions/v1/square-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SB_KEY}`, "x-bgs-key": "bgs-app-2026-x9k3m7p" },
      body: JSON.stringify({ action, ...p })
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.error(`[square] ${action} failed: HTTP ${r.status}`, body);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.error(`[square] ${action} threw`, e);
    return null;
  }
};
// Wed Jun 10 12:50:34 EDT 2026


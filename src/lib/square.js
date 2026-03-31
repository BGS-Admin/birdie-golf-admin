import { SB_URL, SB_KEY } from "./db.js";

export const sq = async (action, p = {}) => {
  try {
    const r = await fetch(`${SB_URL}/functions/v1/square-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SB_KEY}` },
      body: JSON.stringify({ action, ...p })
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
};

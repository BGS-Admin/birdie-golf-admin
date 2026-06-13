// ─── Google Calendar helper (admin app) ──────────────────────────────────────
import { SB_URL, SB_KEY } from "./db.js";

const BGS_KEY          = "bgs-app-2026-x9k3m7p";
const GCAL_FN_URL      = `${SB_URL}/functions/v1/google-calendar`;

// Coach UUID → Calendar ID map (add Nicolas here when ready)
export const COACH_CALENDAR_IDS = {
  "TMiznwW3c_E9-NTW": "santiespinosa.golf@gmail.com",
};

export const coachCalendarId = (coachId) => COACH_CALENDAR_IDS[coachId] || null;

export const gcal = async (action, params = {}) => {
  try {
    const r = await fetch(GCAL_FN_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SB_KEY}`, "x-bgs-key": BGS_KEY },
      body:    JSON.stringify({ action, ...params }),
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
};

import React from "react";

/* ─── Design tokens ─── */
export const ff = "'DM Sans',sans-serif";
export const mono = "'JetBrains Mono',monospace";
export const GREEN  = "#2D8A5E";
export const DARK   = "#0B2E1A";
export const PURPLE = "#5B6DCD";
export const ORANGE = "#E8890C";
export const RED    = "#E03928";

export const TC = { none: "#888", starter: "#4A8B6E", player: GREEN, champion: "#124A2B" };
export const TN = { none: "Non-Member", starter: "Starter", player: "Player", champion: "Champion" };
export const TB = { starter: "STR", player: "PLR", champion: "CHP" };
export const BK_C = { bay_member: GREEN, bay_walkin: "#888", lesson: PURPLE };

export const TIERS = [
  { id: "starter",      n: "Starter",      p: 45,  c: "#4A8B6E", badge: "STR", hrs: 0,  perks: ["20% off hourly bay rate"] },
  { id: "early_birdie", n: "Early Birdie", p: 150, c: ORANGE,    badge: "EBD", hrs: -1, enrollmentFee: 50, perks: ["Unlimited bay access Mon–Fri 7am–4pm", "Full rate outside that window", "Members-only events"] },
  { id: "player",       n: "Player",       p: 200, c: GREEN,      badge: "PLR", hrs: 8,  enrollmentFee: 75, perks: ["8 hrs bay rental/mo", "20% off additional hours", "15% off F&B", "10% off retail", "Club storage", "Members-only events"] },
  { id: "champion",     n: "Champion",     p: 600, c: "#124A2B",  badge: "CHP", hrs: -1, perks: ["Unlimited bay rental (max 2hr/booking)", "15% off F&B", "10% off retail", "Club storage", "Members-only events"] },
];

export const TEAM = [
  { id: "TM4y", name: "Daniel Duran",   title: "Owner" },
  { id: "TMBe", name: "Marco Montilla", title: "Owner" },
];

export const COACHES = [
  { id: "SE", name: "Santiago Espinoza" },
  { id: "NC", name: "Nicolas Cavero" },
];

/* ─── Time slots ─── */
export const SLOTS = [
  "7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM",
  "10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM",
  "1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM",
  "4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM",
  "7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM","9:30 PM"
];

export const DUR_MAP = { "30m": 1, "1h": 2, "1.5h": 3, "2h": 4, "2.5h": 5, "3h": 6, "3.5h": 7, "4h": 8 };
export const DUR_LABELS = ["30m","1h","1.5h","2h","2.5h","3h","3.5h","4h"];
export const slotsToLabel = (n) => ({ 1:"30m",2:"1h",3:"1.5h",4:"2h",5:"2.5h",6:"3h",7:"3.5h",8:"4h" }[n] || "1h");

export function toH(s) {
  const [t, ap] = s.split(" ");
  let [h, m] = t.split(":").map(Number);
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h + m / 60;
}
export const dateKey  = (d) => d.toISOString().split("T")[0];
export const fmtShort = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
export const fmtFull  = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
export const addDays  = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
export const isWknd   = (d) => d.getDay() === 0 || d.getDay() === 6;
export const getSlots = (d) => isWknd(d) ? SLOTS.filter(s => { const h = toH(s); return h >= 9 && h < 21; }) : SLOTS;
export const cn       = (c) => ((c.first_name || "") + " " + (c.last_name || "")).trim();

/* ─── Icons ─── */
const Ic = ({ d, z = 18 }) => (
  <svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
export const X = {
  cal:    z => <Ic z={z} d="M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2zM16 2v4M8 2v4M3 10h18" />,
  user:   z => <Ic z={z} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z" />,
  crown:  z => <svg width={z} height={z} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20M4 20l2-14 4 6 2-8 2 8 4-6 2 14" /></svg>,
  wrench: z => <Ic z={z} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
  search: z => <Ic z={z} d="M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35" />,
  plus:   z => <Ic z={z} d="M12 5v14M5 12h14" />,
  clock:  z => <Ic z={z} d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2" />,
  bar:    z => <Ic z={z} d="M18 20V10M12 20V4M6 20v-6" />,
  chevL:  z => <Ic z={z} d="M15 18l-6-6 6-6" />,
  chevR:  z => <Ic z={z} d="M9 18l6-6-6-6" />,
  out:    z => <Ic z={z} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  chk:    z => <Ic z={z} d="M20 6L9 17l-5-5" />,
  card:   z => <Ic z={z} d="M1 4h22v16H1zM1 10h22" />,
  refund: z => <Ic z={z} d="M3 12h18M9 6l-6 6 6 6" />,
  edit:   z => <Ic z={z} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />,
  trash:  z => <Ic z={z} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  warn:   z => <Ic z={z} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />,
};

/* ─── Shared styles ─── */
export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
  input:focus, button:focus, select:focus, textarea:focus { outline: none; }
  @keyframes ti { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  button:active { transform: scale(0.97); }
`;

export const GS = {
  hdr:      { padding: "10px 6px", textAlign: "center", borderBottom: "2px solid #e8e8e6", background: "#fafaf8" },
  timeCell: { padding: "4px 8px", display: "flex", alignItems: "center", borderBottom: "1px solid #f2f2f0", minHeight: 28, background: "#fafaf8" },
  cell:     { borderBottom: "1px solid #f2f2f0", borderLeft: "1px solid #f2f2f0", minHeight: 28, padding: 2, position: "relative" },
  booking:  { borderRadius: 5, padding: "4px 6px", position: "absolute", top: 1, left: 2, right: 2, zIndex: 2, overflow: "hidden" },
  label:    { fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 4, display: "block" },
  input:    { width: "100%", padding: "10px 12px", border: "1px solid #e8e8e6", borderRadius: 10, fontSize: 14, fontFamily: ff, color: "#1a1a1a" },
  select:   { width: "100%", padding: "10px 12px", border: "1px solid #e8e8e6", borderRadius: 10, fontSize: 14, fontFamily: ff, color: "#1a1a1a", background: "#fff" },
  togBtn:   { padding: "7px 12px", border: "1px solid #e8e8e6", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, color: "#555" },
};

export const S = {
  shell:   { fontFamily: ff, display: "flex", height: "100vh", background: "#FAFAF8", overflow: "hidden" },
  side:    { width: 180, background: "#0B2E1A", display: "flex", flexDirection: "column", flexShrink: 0 },
  pad:     { padding: "24px 28px 40px" },
  b1:      { background: GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "12px 18px", fontSize: 13, fontWeight: 600, fontFamily: ff, cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  bDanger: { background: RED, color: "#fff", border: "none", borderRadius: 10, padding: "12px 18px", fontSize: 13, fontWeight: 600, fontFamily: ff, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  nB:      { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#ffffff88", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: ff, textAlign: "left", marginBottom: 2 },
  nBA:     { background: "#ffffff14", color: "#fff", fontWeight: 600 },
  sh:      { fontSize: 15, fontWeight: 700, marginBottom: 12, marginTop: 20 },
  kpi:     { background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16 },
  kpiL:    { fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 4 },
  kpiV:    { fontSize: 24, fontWeight: 700, fontFamily: mono },
  tabs:    { display: "flex", gap: 4, marginBottom: 16, background: "#f0f0ee", borderRadius: 10, padding: 3 },
  tab:     { flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", background: "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, color: "#888", textAlign: "center" },
  tabA:    { background: "#fff", color: "#1a1a1a", boxShadow: "0 1px 4px rgba(0,0,0,.08)" },
  srch:    { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e8e8e6", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#aaa" },
  srchIn:  { flex: 1, border: "none", fontSize: 13, fontFamily: ff, color: "#1a1a1a", background: "transparent" },
  cR:      { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#fff", border: "1px solid #e8e8e6", borderRadius: 12, marginBottom: 6 },
  empty:   { background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 30, textAlign: "center", color: "#888", fontSize: 14 },
  navArr:  { width: 36, height: 36, borderRadius: 10, background: "#f0f0ee", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#1a1a1a", flexShrink: 0 },
  ov:      { position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 },
  mod:     { background: "#fff", borderRadius: 18, padding: 24, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" },
  toast:   { position: "fixed", bottom: 24, right: 24, background: "#1a1a1a", color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 13, fontWeight: 500, fontFamily: ff, boxShadow: "0 10px 36px rgba(0,0,0,.22)", zIndex: 200, animation: "ti .25s ease", whiteSpace: "nowrap" },
  divider: { borderTop: "1px solid #f2f2f0", margin: "12px 0" },
};

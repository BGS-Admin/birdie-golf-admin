import React, { useState, useEffect } from "react";
import { db } from "../lib/db.js";
import { GREEN, RED, ORANGE, PURPLE, COACHES, SLOTS, mono, ff, X, S, GS } from "../lib/constants.jsx";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_FROM = "7:00 AM";
const DEFAULT_TO   = "10:00 PM";

const TIME_OPTIONS = [
  "6:00 AM","6:30 AM","7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM",
  "10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM",
  "2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM",
  "6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM","9:00 PM","9:30 PM","10:00 PM","11:00 PM"
];

export default function FacilityTab({ bayBlocks, setBayBlocks, cfg, setCfg, hoursConfig, setHoursConfig, fdPin, setFdPin, userRole, fire, reload, logActivity }) {
  const [facTab,     setFacTab]     = useState("bays");
  const [newBlock,   setNewBlock]   = useState({ bays: [], from: "", to: "", timeFrom: "7:00 AM", timeTo: "10:00 PM", allDay: true, reason: "" });

  /* Coach schedule state */
  const [schedules,  setSchedules]  = useState({});
  const [schedSaving,setSchedSaving]= useState(false);

  /* Hours of operation */
  const [hours,      setHours]      = useState({
    weekday_open:  "7:00 AM",
    weekday_close: "10:00 PM",
    weekend_open:  "9:00 AM",
    weekend_close: "9:00 PM",
  });
  const [hoursSaving,setHoursSaving]= useState(false);

  /* Front Desk PIN */
  const [newPin,     setNewPin]     = useState(["","","","",""]); // 4 digits for new PIN
  const [pinSaving,  setPinSaving]  = useState(false);
  const [pinError,   setPinError]   = useState("");
  const pinRefs = [React.useRef(), React.useRef(), React.useRef(), React.useRef()];

  /* Activity log */
  const [actLog,     setActLog]     = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const [actFilter,  setActFilter]  = useState("all");

  /* Sync hours from parent prop */
  useEffect(() => {
    if (hoursConfig) setHours(hoursConfig);
  }, [hoursConfig]);

  useEffect(() => {
    if (facTab === "coaches") loadSchedules();
    if (facTab === "log")     loadLog();
  }, [facTab]);

  const loadSchedules = async () => {
    const rows = await db.get("coach_schedules", "select=*");
    if (!rows || rows.length === 0) {
      const def = {};
      COACHES.forEach(c => {
        def[c.id] = {};
        DAYS.forEach((_, i) => { def[c.id][i] = { on: true, from: DEFAULT_FROM, to: DEFAULT_TO }; });
      });
      setSchedules(def);
      return;
    }
    const parsed = {};
    rows.forEach(r => {
      if (!parsed[r.coach_id]) parsed[r.coach_id] = {};
      parsed[r.coach_id][r.day_of_week] = { on: r.available, from: r.time_from || DEFAULT_FROM, to: r.time_to || DEFAULT_TO };
    });
    COACHES.forEach(c => {
      if (!parsed[c.id]) parsed[c.id] = {};
      DAYS.forEach((_, i) => { if (!parsed[c.id][i]) parsed[c.id][i] = { on: true, from: DEFAULT_FROM, to: DEFAULT_TO }; });
    });
    setSchedules(parsed);
  };

  const saveSchedules = async () => {
    setSchedSaving(true);
    const rows = [];
    COACHES.forEach(c => {
      DAYS.forEach((_, i) => {
        const day = schedules[c.id]?.[i] || { on: true, from: DEFAULT_FROM, to: DEFAULT_TO };
        rows.push({ coach_id: c.id, coach_name: c.name, day_of_week: i, available: day.on, time_from: day.from, time_to: day.to });
      });
    });
    for (const row of rows) await db.upsert("coach_schedules", row, "coach_id,day_of_week");
    await logActivity?.("Updated coach schedules");
    fire("Coach schedules saved ✓");
    setSchedSaving(false);
  };

  const toggleDay = (coachId, dayIdx) => {
    setSchedules(prev => ({ ...prev, [coachId]: { ...prev[coachId], [dayIdx]: { ...prev[coachId]?.[dayIdx], on: !prev[coachId]?.[dayIdx]?.on } } }));
  };

  const setDayTime = (coachId, dayIdx, field, val) => {
    setSchedules(prev => ({ ...prev, [coachId]: { ...prev[coachId], [dayIdx]: { ...prev[coachId]?.[dayIdx], [field]: val } } }));
  };

  /* ── Save Hours of Operation ── */
  const saveHours = async () => {
    setHoursSaving(true);
    await db.upsert("admin_settings", { id: 1, ...hours }, "id");
    setHoursConfig(hours);
    await logActivity?.(`Updated hours of operation: Weekday ${hours.weekday_open}–${hours.weekday_close}, Weekend ${hours.weekend_open}–${hours.weekend_close}`);
    fire("Hours of operation saved ✓");
    setHoursSaving(false);
  };

  /* ── Save Front Desk PIN ── */
  const handlePinDigit = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...newPin];
    next[idx] = digit;
    setNewPin(next);
    setPinError("");
    if (digit && idx < 3) pinRefs[idx + 1]?.current?.focus();
  };

  const handlePinKey = (idx, e) => {
    if (e.key === "Backspace" && !newPin[idx] && idx > 0) pinRefs[idx - 1]?.current?.focus();
  };

  const saveFdPin = async () => {
    const pin = newPin.join("");
    if (pin.length !== 4) { setPinError("Please enter all 4 digits."); return; }
    setPinSaving(true);
    await db.upsert("admin_settings", { id: 1, fd_pin: pin }, "id");
    setFdPin(pin);
    setNewPin(["","","",""]);
    await logActivity?.("Changed Front Desk PIN");
    fire("Front Desk PIN updated ✓");
    setPinSaving(false);
  };

  /* ── Load Activity Log ── */
  const loadLog = async () => {
    setActLoading(true);
    const rows = await db.get("admin_activity_log", "select=*&order=logged_at.desc&limit=200");
    setActLog(rows || []);
    setActLoading(false);
  };

  const fmtLogTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const filteredLog = actFilter === "all" ? actLog : actLog.filter(r => r.user_name === actFilter);
  const logUsers = [...new Set(actLog.map(r => r.user_name))];

  return (
    <div style={S.pad}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Facility</h2>

      <div style={S.tabs}>
        {[
          { k: "bays",     l: "Bay Blocks" },
          { k: "coaches",  l: "Coach Availability" },
          { k: "settings", l: "Settings" },
          { k: "log",      l: "Activity Log" },
        ].map(t => (
          <button key={t.k} style={{ ...S.tab, ...(facTab === t.k ? S.tabA : {}) }} onClick={() => setFacTab(t.k)}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ═══ BAY BLOCKS ═══ */}
      {facTab === "bays" && (
        <>
          <h3 style={S.sh}>Active Blocks</h3>
          {bayBlocks.length === 0 && <p style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>No active blocks</p>}
          {bayBlocks.map(b => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#fff", border: "1px solid #e8e8e6", borderRadius: 12, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>Bay{(b.bays || []).length > 1 ? "s" : ""} {(b.bays || []).join(", ")}</p>
                <p style={{ fontSize: 11, color: "#888" }}>
                  {b.from_date || b.from} → {b.to_date || b.to}{" "}
                  {b.all_day || b.allDay ? "(All day)" : `(${b.time_from || b.timeFrom}–${b.time_to || b.timeTo})`}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: RED, fontWeight: 600 }}>{b.reason}</p>
                <button
                  style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}
                  onClick={async () => {
                    await db.del("bay_blocks", `id=eq.${b.id}`);
                    setBayBlocks(p => p.filter(x => x.id !== b.id));
                    await logActivity?.(`Removed bay block: Bay${(b.bays||[]).length>1?"s":""} ${(b.bays||[]).join(",")} — ${b.reason}`);
                    fire("Block removed");
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginTop: 14 }}>
            <label style={{ ...GS.label, marginBottom: 8 }}>BLOCK BAYS</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map(b => {
                const sel = newBlock.bays.includes(b);
                return (
                  <button key={b} style={{ ...GS.togBtn, flex: 1, ...(sel ? { background: RED, color: "#fff", borderColor: RED } : {}) }}
                    onClick={() => setNewBlock(p => ({ ...p, bays: sel ? p.bays.filter(x => x !== b) : [...p.bays, b] }))}>
                    Bay {b}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...GS.label, fontSize: 10 }}>FROM</label>
                <input type="date" style={GS.input} value={newBlock.from} onChange={e => setNewBlock(p => ({ ...p, from: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...GS.label, fontSize: 10 }}>TO</label>
                <input type="date" style={GS.input} value={newBlock.to} onChange={e => setNewBlock(p => ({ ...p, to: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button style={{ ...GS.togBtn, flex: 1, ...(newBlock.allDay ? { background: RED, color: "#fff", borderColor: RED } : {}) }} onClick={() => setNewBlock(p => ({ ...p, allDay: true }))}>All Day</button>
              <button style={{ ...GS.togBtn, flex: 1, ...(!newBlock.allDay ? { background: RED, color: "#fff", borderColor: RED } : {}) }} onClick={() => setNewBlock(p => ({ ...p, allDay: false }))}>Specific Hours</button>
            </div>

            {!newBlock.allDay && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...GS.label, fontSize: 10 }}>FROM TIME</label>
                  <select style={GS.select} value={newBlock.timeFrom} onChange={e => setNewBlock(p => ({ ...p, timeFrom: e.target.value }))}>
                    {SLOTS.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...GS.label, fontSize: 10 }}>TO TIME</label>
                  <select style={GS.select} value={newBlock.timeTo} onChange={e => setNewBlock(p => ({ ...p, timeTo: e.target.value }))}>
                    {SLOTS.slice(2).map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ ...GS.label, fontSize: 10 }}>REASON</label>
              <input style={GS.input} placeholder="e.g., Calibration, Private event, Maintenance..." value={newBlock.reason} onChange={e => setNewBlock(p => ({ ...p, reason: e.target.value }))} />
            </div>

            <button
              style={{ ...S.b1, background: RED, opacity: (newBlock.bays.length > 0 && newBlock.from && newBlock.to && newBlock.reason) ? 1 : 0.35 }}
              onClick={async () => {
                if (!(newBlock.bays.length > 0 && newBlock.from && newBlock.to && newBlock.reason)) return;
                const r = await db.post("bay_blocks", {
                  bays: newBlock.bays, from_date: newBlock.from, to_date: newBlock.to,
                  time_from: newBlock.allDay ? null : newBlock.timeFrom,
                  time_to:   newBlock.allDay ? null : newBlock.timeTo,
                  all_day:   newBlock.allDay, reason: newBlock.reason,
                });
                if (r) setBayBlocks(p => [...p, ...(Array.isArray(r) ? r : [r])]);
                await logActivity?.(`Added bay block: Bay${newBlock.bays.length>1?"s":""} ${newBlock.bays.join(",")} — ${newBlock.reason}`);
                setNewBlock({ bays: [], from: "", to: "", timeFrom: "7:00 AM", timeTo: "10:00 PM", allDay: true, reason: "" });
                fire("Bays blocked ✓");
              }}
            >
              Block Bays
            </button>
          </div>
        </>
      )}

      {/* ═══ COACH AVAILABILITY ═══ */}
      {facTab === "coaches" && (
        <>
          <h3 style={S.sh}>Coach Availability</h3>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Set which days and hours each coach is available. Customers only see available slots.</p>
          {COACHES.map(coach => (
            <div key={coach.id} style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: PURPLE + "18", color: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, fontFamily: mono }}>
                  {coach.name.split(" ").map(w => w[0]).join("")}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700 }}>{coach.name}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                {DAYS.map((day, idx) => {
                  const dayData = schedules[coach.id]?.[idx] || { on: true, from: DEFAULT_FROM, to: DEFAULT_TO };
                  return (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                      <button style={{ width: "100%", padding: "6px 4px", borderRadius: 8, border: "1px solid", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: mono, background: dayData.on ? PURPLE : "#f0f0ee", color: dayData.on ? "#fff" : "#aaa", borderColor: dayData.on ? PURPLE : "#e8e8e6" }} onClick={() => toggleDay(coach.id, idx)}>
                        {day}
                      </button>
                      {dayData.on && (
                        <>
                          <select style={{ ...GS.select, padding: "4px 6px", fontSize: 10, textAlign: "center" }} value={dayData.from} onChange={e => { const nf = e.target.value; const fi = SLOTS.indexOf(nf); const ti = SLOTS.indexOf(dayData.to); const nt = ti <= fi ? SLOTS[Math.min(fi+1, SLOTS.length-1)] : dayData.to; setDayTime(coach.id, idx, "from", nf); if (nt !== dayData.to) setDayTime(coach.id, idx, "to", nt); }}>
                            {SLOTS.slice(0, SLOTS.length - 1).map(s => <option key={s}>{s}</option>)}
                          </select>
                          <select style={{ ...GS.select, padding: "4px 6px", fontSize: 10, textAlign: "center" }} value={dayData.to} onChange={e => setDayTime(coach.id, idx, "to", e.target.value)}>
                            {SLOTS.filter(s => SLOTS.indexOf(s) > SLOTS.indexOf(dayData.from)).map(s => <option key={s}>{s}</option>)}
                          </select>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <button style={{ ...S.b1 }} onClick={saveSchedules} disabled={schedSaving}>{schedSaving ? "Saving..." : "Save Schedules"}</button>
        </>
      )}

      {/* ═══ SETTINGS ═══ */}
      {facTab === "settings" && (
        <>
          {/* Bay Rates */}
          <h3 style={S.sh}>Bay Rates</h3>
          <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginBottom: 14 }}>
            {[
              { k: "op", l: "Non-Peak", s: "Mon–Fri 7am–5pm · Sat–Sun" },
              { k: "pk", l: "Peak",     s: "Mon–Fri 5pm–10pm" },
            ].map(r => (
              <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f2f2f0" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{r.l}</p>
                  <p style={{ fontSize: 11, color: "#888" }}>{r.s}</p>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontWeight: 700 }}>$</span>
                  <input style={{ width: 48, fontSize: 18, fontWeight: 700, fontFamily: mono, border: "none", background: "transparent", textAlign: "center" }} type="number" value={cfg[r.k]} onChange={e => setCfg(p => ({ ...p, [r.k]: Number(e.target.value) }))} />
                  <span style={{ fontSize: 11, color: "#888" }}>/hr</span>
                </div>
              </div>
            ))}
            <button style={{ ...S.b1, marginTop: 14 }} onClick={async () => {
              await db.patch("pricing_config", "id=eq.1", { off_peak_rate: cfg.op, peak_rate: cfg.pk, weekend_rate: cfg.wk });
              await logActivity?.(`Updated bay rates: Non-peak $${cfg.op}/hr, Peak $${cfg.pk}/hr`);
              fire("Rates saved ✓");
            }}>Save Rates</button>
          </div>

          {/* Hours of Operation */}
          <h3 style={S.sh}>Hours of Operation</h3>
          <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginBottom: 14 }}>
            {[
              { label: "Mon – Fri", openK: "weekday_open", closeK: "weekday_close" },
              { label: "Sat – Sun", openK: "weekend_open", closeK: "weekend_close" },
            ].map(row => (
              <div key={row.openK} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f2f2f0" }}>
                <p style={{ fontSize: 14, fontWeight: 600, minWidth: 80 }}>{row.label}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <select style={{ ...GS.select, flex: 1 }} value={hours[row.openK]} onChange={e => setHours(p => ({ ...p, [row.openK]: e.target.value }))}>
                    {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <span style={{ color: "#888", fontSize: 13 }}>to</span>
                  <select style={{ ...GS.select, flex: 1 }} value={hours[row.closeK]} onChange={e => setHours(p => ({ ...p, [row.closeK]: e.target.value }))}>
                    {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button style={{ ...S.b1, marginTop: 14 }} onClick={saveHours} disabled={hoursSaving}>
              {hoursSaving ? "Saving..." : "Save Hours"}
            </button>
          </div>

          {/* Front Desk PIN — owners only */}
          {userRole === "owner" && (
            <>
              <h3 style={S.sh}>Front Desk PIN</h3>
              <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Current PIN: <span style={{ fontFamily: mono, fontWeight: 700, color: "#1a1a1a" }}>{"·".repeat(4)}</span> &nbsp;·&nbsp; Enter a new 4-digit PIN below.</p>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  {newPin.map((d, i) => (
                    <input
                      key={i}
                      ref={pinRefs[i]}
                      style={{ width: 52, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700, fontFamily: mono, border: `2px solid ${pinError ? "#E03928" : d ? GREEN : "#e8e8e6"}`, borderRadius: 12, background: "#fafaf8" }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handlePinDigit(i, e.target.value)}
                      onKeyDown={e => handlePinKey(i, e)}
                    />
                  ))}
                </div>
                {pinError && <p style={{ fontSize: 12, color: "#E03928", marginBottom: 8 }}>{pinError}</p>}
                <button style={{ ...S.b1, opacity: newPin.join("").length === 4 ? 1 : 0.4 }} onClick={saveFdPin} disabled={pinSaving || newPin.join("").length !== 4}>
                  {pinSaving ? "Saving..." : "Update Front Desk PIN"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ═══ ACTIVITY LOG ═══ */}
      {facTab === "log" && (
        <>
          <h3 style={S.sh}>Activity Log</h3>

          {/* Filter by user */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {["all", ...logUsers].map(u => (
              <button key={u} style={{ ...GS.togBtn, ...(actFilter === u ? { background: GREEN, color: "#fff", borderColor: GREEN } : {}) }} onClick={() => setActFilter(u)}>
                {u === "all" ? "All Users" : u}
              </button>
            ))}
            <button style={{ ...GS.togBtn, marginLeft: "auto" }} onClick={loadLog}>↻ Refresh</button>
          </div>

          {actLoading ? (
            <p style={{ color: "#aaa", fontSize: 13 }}>Loading...</p>
          ) : filteredLog.length === 0 ? (
            <div style={S.empty}>No activity logged yet.</div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, overflow: "hidden" }}>
              {filteredLog.map((row, i) => (
                <div key={row.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: i < filteredLog.length - 1 ? "1px solid #f2f2f0" : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: row.user_role === "owner" ? GREEN + "18" : PURPLE + "18", color: row.user_role === "owner" ? GREEN : PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, fontFamily: mono, flexShrink: 0 }}>
                    {row.user_name?.split(" ").map(n => n[0]).join("").slice(0,2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{row.user_name}</p>
                    <p style={{ fontSize: 12, color: "#555", marginTop: 1 }}>{row.action}</p>
                  </div>
                  <p style={{ fontSize: 11, color: "#aaa", flexShrink: 0, marginTop: 2 }}>{fmtLogTime(row.logged_at)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

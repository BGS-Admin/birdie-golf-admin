import React, { useState, useEffect } from "react";
import { db } from "../lib/db.js";
import { GREEN, RED, ORANGE, PURPLE, COACHES, SLOTS, mono, ff, X, S, GS } from "../lib/constants.jsx";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_FROM = "7:00 AM";
const DEFAULT_TO   = "10:00 PM";

export default function FacilityTab({ bayBlocks, setBayBlocks, cfg, setCfg, fire, reload }) {
  const [facTab,    setFacTab]    = useState("bays");
  const [newBlock,  setNewBlock]  = useState({ bays: [], from: "", to: "", timeFrom: "7:00 AM", timeTo: "10:00 PM", allDay: true, reason: "" });

  /* Coach schedule state: { coachId: { 0: {on, from, to}, 1: ..., ... } } */
  const [schedules, setSchedules] = useState({});
  const [schedSaving, setSchedSaving] = useState(false);

  useEffect(() => {
    if (facTab === "coaches") loadSchedules();
  }, [facTab]);

  const loadSchedules = async () => {
    const rows = await db.get("coach_schedules", "select=*");
    if (!rows || rows.length === 0) {
      // Default: all coaches available all days, full hours
      const def = {};
      COACHES.forEach(c => {
        def[c.id] = {};
        DAYS.forEach((_, i) => {
          def[c.id][i] = { on: true, from: DEFAULT_FROM, to: DEFAULT_TO };
        });
      });
      setSchedules(def);
      return;
    }
    // Parse rows into nested state
    const parsed = {};
    rows.forEach(r => {
      if (!parsed[r.coach_id]) parsed[r.coach_id] = {};
      parsed[r.coach_id][r.day_of_week] = { on: r.available, from: r.time_from || DEFAULT_FROM, to: r.time_to || DEFAULT_TO };
    });
    // Fill missing days with defaults
    COACHES.forEach(c => {
      if (!parsed[c.id]) parsed[c.id] = {};
      DAYS.forEach((_, i) => {
        if (!parsed[c.id][i]) parsed[c.id][i] = { on: true, from: DEFAULT_FROM, to: DEFAULT_TO };
      });
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
    // Upsert all rows
    for (const row of rows) {
      await db.upsert("coach_schedules", row, "coach_id,day_of_week");
    }
    fire("Coach schedules saved \u2713");
    setSchedSaving(false);
  };

  const toggleDay = (coachId, dayIdx) => {
    setSchedules(prev => ({
      ...prev,
      [coachId]: {
        ...prev[coachId],
        [dayIdx]: { ...prev[coachId]?.[dayIdx], on: !prev[coachId]?.[dayIdx]?.on }
      }
    }));
  };

  const setDayTime = (coachId, dayIdx, field, val) => {
    setSchedules(prev => ({
      ...prev,
      [coachId]: {
        ...prev[coachId],
        [dayIdx]: { ...prev[coachId]?.[dayIdx], [field]: val }
      }
    }));
  };

  return (
    <div style={S.pad}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Facility</h2>

      <div style={S.tabs}>
        {["bays", "coaches", "settings"].map(t => (
          <button key={t} style={{ ...S.tab, ...(facTab === t ? S.tabA : {}) }} onClick={() => setFacTab(t)}>
            {t === "bays" ? "Bay Blocks" : t === "coaches" ? "Coach Availability" : "Settings"}
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
                  {b.from_date || b.from} \u2192 {b.to_date || b.to}{" "}
                  {b.all_day || b.allDay ? "(All day)" : `(${b.time_from || b.timeFrom}\u2013${b.time_to || b.timeTo})`}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: RED, fontWeight: 600 }}>{b.reason}</p>
                <button
                  style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}
                  onClick={async () => {
                    await db.del("bay_blocks", `id=eq.${b.id}`);
                    setBayBlocks(p => p.filter(x => x.id !== b.id));
                    fire("Block removed");
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* New block form */}
          <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginTop: 14 }}>
            <label style={{ ...GS.label, marginBottom: 8 }}>BLOCK BAYS</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map(b => {
                const sel = newBlock.bays.includes(b);
                return (
                  <button
                    key={b}
                    style={{ ...GS.togBtn, flex: 1, ...(sel ? { background: RED, color: "#fff", borderColor: RED } : {}) }}
                    onClick={() => setNewBlock(p => ({ ...p, bays: sel ? p.bays.filter(x => x !== b) : [...p.bays, b] }))}
                  >
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
              <button
                style={{ ...GS.togBtn, flex: 1, ...(newBlock.allDay ? { background: RED, color: "#fff", borderColor: RED } : {}) }}
                onClick={() => setNewBlock(p => ({ ...p, allDay: true }))}
              >
                All Day
              </button>
              <button
                style={{ ...GS.togBtn, flex: 1, ...(!newBlock.allDay ? { background: RED, color: "#fff", borderColor: RED } : {}) }}
                onClick={() => setNewBlock(p => ({ ...p, allDay: false }))}
              >
                Specific Hours
              </button>
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
              <input
                style={GS.input}
                placeholder="e.g., Calibration, Private event, Maintenance..."
                value={newBlock.reason}
                onChange={e => setNewBlock(p => ({ ...p, reason: e.target.value }))}
              />
            </div>

            <button
              style={{ ...S.b1, background: RED, opacity: (newBlock.bays.length > 0 && newBlock.from && newBlock.to && newBlock.reason) ? 1 : 0.35 }}
              onClick={async () => {
                if (!(newBlock.bays.length > 0 && newBlock.from && newBlock.to && newBlock.reason)) return;
                const r = await db.post("bay_blocks", {
                  bays:      newBlock.bays,
                  from_date: newBlock.from,
                  to_date:   newBlock.to,
                  time_from: newBlock.allDay ? null : newBlock.timeFrom,
                  time_to:   newBlock.allDay ? null : newBlock.timeTo,
                  all_day:   newBlock.allDay,
                  reason:    newBlock.reason,
                });
                if (r) setBayBlocks(p => [...p, ...(Array.isArray(r) ? r : [r])]);
                setNewBlock({ bays: [], from: "", to: "", timeFrom: "7:00 AM", timeTo: "10:00 PM", allDay: true, reason: "" });
                fire("Bays blocked \u2713");
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
          <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
            Set which days and hours each coach is available for lesson bookings. Customers will only see available slots.
          </p>

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
                      <button
                        style={{
                          width: "100%", padding: "6px 4px", borderRadius: 8, border: "1px solid", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: mono,
                          background: dayData.on ? PURPLE : "#f0f0ee",
                          color: dayData.on ? "#fff" : "#aaa",
                          borderColor: dayData.on ? PURPLE : "#e8e8e6",
                        }}
                        onClick={() => toggleDay(coach.id, idx)}
                      >
                        {day}
                      </button>
                      {dayData.on && (
                        <>
                          <select
                            style={{ ...GS.select, padding: "4px 6px", fontSize: 10, textAlign: "center" }}
                            value={dayData.from}
                            onChange={e => setDayTime(coach.id, idx, "from", e.target.value)}
                          >
                            {SLOTS.map(s => <option key={s}>{s}</option>)}
                          </select>
                          <select
                            style={{ ...GS.select, padding: "4px 6px", fontSize: 10, textAlign: "center" }}
                            value={dayData.to}
                            onChange={e => setDayTime(coach.id, idx, "to", e.target.value)}
                          >
                            {SLOTS.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <button style={{ ...S.b1 }} onClick={saveSchedules} disabled={schedSaving}>
            {schedSaving ? "Saving..." : "Save Schedules"}
          </button>
        </>
      )}

      {/* ═══ SETTINGS ═══ */}
      {facTab === "settings" && (
        <>
          <h3 style={S.sh}>Bay Rates</h3>
          <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginBottom: 14 }}>
            {[
              { k: "op", l: "Non-Peak", s: "Mon\u2013Fri 7am\u20135pm \u00b7 Sat\u2013Sun" },
              { k: "pk", l: "Peak",     s: "Mon\u2013Fri 5pm\u201310pm" },
            ].map(r => (
              <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f2f2f0" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{r.l}</p>
                  <p style={{ fontSize: 11, color: "#888" }}>{r.s}</p>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontWeight: 700 }}>$</span>
                  <input
                    style={{ width: 48, fontSize: 18, fontWeight: 700, fontFamily: mono, border: "none", background: "transparent", textAlign: "center" }}
                    type="number"
                    value={cfg[r.k]}
                    onChange={e => setCfg(p => ({ ...p, [r.k]: Number(e.target.value) }))}
                  />
                  <span style={{ fontSize: 11, color: "#888" }}>/hr</span>
                </div>
              </div>
            ))}
            <button
              style={{ ...S.b1, marginTop: 14 }}
              onClick={async () => {
                await db.patch("pricing_config", "id=eq.1", { off_peak_rate: cfg.op, peak_rate: cfg.pk, weekend_rate: cfg.wk });
                fire("Rates saved \u2713");
              }}
            >
              Save Rates
            </button>
          </div>

          <h3 style={S.sh}>Operating Hours</h3>
          <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16 }}>
            <div style={{ padding: "8px 0", borderBottom: "1px solid #f2f2f0", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Mon\u2013Fri</span>
              <span style={{ fontSize: 13, color: "#555" }}>7:00 AM \u2013 10:00 PM</span>
            </div>
            <div style={{ padding: "8px 0", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Sat\u2013Sun</span>
              <span style={{ fontSize: 13, color: "#555" }}>9:00 AM \u2013 9:00 PM</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

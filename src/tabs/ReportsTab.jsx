import React, { useState, useEffect, useMemo } from "react";
import { db } from "../lib/db.js";
import { GREEN, PURPLE, RED, ORANGE, mono, ff, cn, S, GS, TIERS, X } from "../lib/constants.jsx";

/* ─── helpers ─── */
const dateKey = (d) => d.toISOString().split("T")[0];
const monthKey = (d) => d.toISOString().slice(0, 7);

function getRange(period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (period === "this_month") {
    return { from: new Date(y, m, 1), to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) };
  }
  if (period === "last_month") {
    return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0, 23, 59, 59) };
  }
  if (period === "90_days") {
    const f = new Date(now); f.setDate(f.getDate() - 90);
    return { from: f, to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) };
  }
  // all_time
  return { from: new Date("2000-01-01"), to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) };
}

const fmt$ = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtPct = (n) => Math.round(n || 0) + "%";

/* ─── small UI pieces ─── */
const KPI = ({ label, value, sub, color }) => (
  <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16 }}>
    <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 6 }}>{label}</p>
    <p style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: color || "#1a1a1a" }}>{value}</p>
    {sub && <p style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{sub}</p>}
  </div>
);

const Bar = ({ pct, color = GREEN, height = 8 }) => (
  <div style={{ background: "#f0f0ee", borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
    <div style={{ width: Math.min(100, pct || 0) + "%", height: "100%", background: color, borderRadius: 99, transition: "width .4s ease" }} />
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: "#888", marginBottom: 12, marginTop: 28, textTransform: "uppercase" }}>{children}</h3>
);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PERIODS = [
  { k: "this_month", l: "This Month" },
  { k: "last_month", l: "Last Month" },
  { k: "90_days",    l: "Last 90 Days" },
  { k: "all_time",   l: "All Time" },
];

/* ═══════════════════════════════════════════════════════════ */
export default function ReportsTab({ bookings, customers }) {
  const [period,   setPeriod]   = useState("this_month");
  const [txns,     setTxns]     = useState([]);
  const [loadingT, setLoadingT] = useState(true);

  /* fetch transactions once */
  useEffect(() => {
    (async () => {
      setLoadingT(true);
      const t = await db.get("transactions", "select=*&order=date.desc&limit=2000");
      setTxns(t || []);
      setLoadingT(false);
    })();
  }, []);

  const range = useMemo(() => getRange(period), [period]);

  /* ── filter bookings & txns to selected period ── */
  const filteredBk = useMemo(() =>
    bookings.filter(b => {
      if (!b.date) return false;
      const d = new Date(b.date + "T12:00:00");
      return d >= range.from && d <= range.to;
    }), [bookings, range]);

  const filteredTxns = useMemo(() =>
    txns.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date + "T12:00:00");
      return d >= range.from && d <= range.to;
    }), [txns, range]);

  /* ══════════════════ REVENUE ══════════════════ */
  const confirmedBk = filteredBk.filter(b => b.status !== "cancelled");
  const bayBk       = confirmedBk.filter(b => b.type === "bay");
  const lessonBk    = confirmedBk.filter(b => b.type === "lesson");

  const revBay     = bayBk.reduce((s, b) => s + Number(b.amount || 0), 0);
  const revLesson  = lessonBk.reduce((s, b) => s + Number(b.amount || 0), 0);
  const revMem     = filteredTxns
    .filter(t => (t.description || "").toLowerCase().includes("membership"))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalRev   = revBay + revLesson + revMem;

  const avgBkValue = confirmedBk.length
    ? ((revBay + revLesson) / confirmedBk.filter(b => Number(b.amount || 0) > 0).length || 0)
    : 0;

  // MRR from active members
  const mrr = customers
    .filter(c => c.tier && c.tier !== "none")
    .reduce((s, c) => {
      const t = TIERS.find(x => x.id === c.tier);
      return s + (t ? t.p : 0);
    }, 0);

  /* ══════════════════ UTILIZATION ══════════════════ */
  const NUM_BAYS = 5;
  // available hours: Mon–Fri 7am–10pm (15h), Sat–Sun 9am–9pm (12h)
  const getAvailableHours = () => {
    let h = 0;
    const cur = new Date(range.from);
    const end = new Date(range.to);
    while (cur <= end) {
      const dow = cur.getDay();
      h += (dow === 0 || dow === 6) ? 12 : 15;
      cur.setDate(cur.getDate() + 1);
    }
    return h * NUM_BAYS;
  };
  const availableHours = getAvailableHours();
  const bookedHours    = confirmedBk.reduce((s, b) => s + (b.duration_slots || 2) * 0.5, 0);
  const utilizationPct = availableHours > 0 ? (bookedHours / availableHours) * 100 : 0;

  // Per-bay utilization
  const bayUtil = [1,2,3,4,5].map(bay => {
    const hrs = confirmedBk.filter(b => b.bay === bay).reduce((s, b) => s + (b.duration_slots || 2) * 0.5, 0);
    const perBayAvail = availableHours / NUM_BAYS;
    return { bay, hrs, pct: perBayAvail > 0 ? (hrs / perBayAvail) * 100 : 0 };
  });

  // Busiest days
  const dayCount = [0,1,2,3,4,5,6].map(d => ({
    day: DAYS[d],
    count: confirmedBk.filter(b => b.date && new Date(b.date + "T12:00:00").getDay() === d).length,
  }));
  const maxDayCount = Math.max(...dayCount.map(d => d.count), 1);

  // Busiest time slots (group into blocks)
  const hourBuckets = {};
  confirmedBk.forEach(b => {
    if (!b.start_time) return;
    const [time, ap] = b.start_time.split(" ");
    let [h] = time.split(":").map(Number);
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const bucket = h < 12 ? "Morning (7–12)" : h < 17 ? "Afternoon (12–5)" : "Evening (5–10)";
    hourBuckets[bucket] = (hourBuckets[bucket] || 0) + 1;
  });
  const maxBucket = Math.max(...Object.values(hourBuckets), 1);

  const avgDuration = confirmedBk.length
    ? confirmedBk.reduce((s, b) => s + (b.duration_slots || 2) * 0.5, 0) / confirmedBk.length
    : 0;

  /* ══════════════════ BOOKINGS ══════════════════ */
  const cancelledBk    = filteredBk.filter(b => b.status === "cancelled");
  const cancelRate     = filteredBk.length ? (cancelledBk.length / filteredBk.length) * 100 : 0;
  const memberBk       = confirmedBk.filter(b => {
    const c = customers.find(x => x.id === b.customer_id);
    return c && c.tier && c.tier !== "none";
  });
  const memberBkPct    = confirmedBk.length ? (memberBk.length / confirmedBk.length) * 100 : 0;

  // Bookings per coach
  const coachMap = {};
  lessonBk.forEach(b => {
    const name = b.coach_name || "Unknown";
    coachMap[name] = (coachMap[name] || 0) + 1;
  });
  const maxCoach = Math.max(...Object.values(coachMap), 1);

  /* ══════════════════ CUSTOMERS & MEMBERS ══════════════════ */
  const activeMembers = customers.filter(c => c.tier && c.tier !== "none");
  const newThisPeriod = customers.filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    return d >= range.from && d <= range.to;
  });

  // 30-day inactive (outside of period filter — always from today)
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const atRisk = customers.filter(c => {
    if (!c.tier || c.tier === "none") return false;
    const lastBk = bookings
      .filter(b => b.customer_id === c.id && b.status !== "cancelled")
      .sort((a, b2) => (b2.date || "").localeCompare(a.date || ""))[0];
    if (!lastBk) return true;
    return new Date(lastBk.date + "T12:00:00") < thirtyDaysAgo;
  });

  // Member credit utilization
  const memberUtil = activeMembers
    .filter(c => c.tier !== "champion") // champion = unlimited
    .map(c => {
      const total = c.bay_credits_total || 0;
      const remaining = c.bay_credits_remaining || 0;
      const used = Math.max(0, total - remaining);
      const pct = total > 0 ? (used / total) * 100 : 0;
      return { name: cn(c), tier: c.tier, used, total, remaining, pct };
    })
    .sort((a, b2) => b2.pct - a.pct);

  const avgCreditUtil = memberUtil.length
    ? memberUtil.reduce((s, m) => s + m.pct, 0) / memberUtil.length
    : 0;

  const tierCounts = TIERS.map(t => ({
    ...t,
    count: activeMembers.filter(c => c.tier === t.id).length,
  }));

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div style={{ ...S.pad, maxWidth: 1100 }}>
      {/* Header + period filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Reports</h2>
        <div style={{ display: "flex", gap: 4, background: "#f0f0ee", borderRadius: 10, padding: 3 }}>
          {PERIODS.map(p => (
            <button
              key={p.k}
              style={{ padding: "7px 12px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff,
                background: period === p.k ? "#fff" : "transparent",
                color: period === p.k ? "#1a1a1a" : "#888",
                boxShadow: period === p.k ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              }}
              onClick={() => setPeriod(p.k)}
            >{p.l}</button>
          ))}
        </div>
      </div>

      {/* ── REVENUE ── */}
      <SectionTitle>Revenue</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label="TOTAL REVENUE" value={fmt$(totalRev)} />
        <KPI label="BAY REVENUE"   value={fmt$(revBay)} sub={confirmedBk.length ? `${bayBk.length} bay bookings` : undefined} />
        <KPI label="LESSON REVENUE" value={fmt$(revLesson)} sub={lessonBk.length ? `${lessonBk.length} lessons` : undefined} />
        <KPI label="MEMBERSHIP REVENUE" value={fmt$(revMem)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 8 }}>
        <KPI label="MRR (ACTIVE MEMBERS)" value={fmt$(mrr)} sub="Monthly recurring revenue" color={GREEN} />
        <KPI label="AVG BOOKING VALUE" value={avgBkValue > 0 ? fmt$(avgBkValue) : "—"} sub="Paid bookings only" />
      </div>

      {/* Revenue breakdown bar */}
      {totalRev > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginTop: 12 }}>
          <p style={GS.label}>REVENUE BREAKDOWN</p>
          <div style={{ display: "flex", height: 20, borderRadius: 8, overflow: "hidden", gap: 2 }}>
            {revBay > 0    && <div style={{ flex: revBay,    background: GREEN,  display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>Bay</span></div>}
            {revLesson > 0 && <div style={{ flex: revLesson, background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>Lessons</span></div>}
            {revMem > 0    && <div style={{ flex: revMem,    background: "#124A2B", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>Memberships</span></div>}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            {[["Bay", revBay, GREEN], ["Lessons", revLesson, PURPLE], ["Memberships", revMem, "#124A2B"]].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                <span style={{ fontSize: 12, color: "#555" }}>{l}: <strong>{fmt$(v)}</strong> ({totalRev > 0 ? Math.round(v / totalRev * 100) : 0}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── UTILIZATION ── */}
      <SectionTitle>Bay Utilization</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label="OVERALL UTILIZATION" value={fmtPct(utilizationPct)} sub={`${bookedHours.toFixed(1)}h booked of ${availableHours}h available`} color={utilizationPct > 60 ? GREEN : utilizationPct > 30 ? ORANGE : RED} />
        <KPI label="TOTAL HOURS BOOKED"  value={bookedHours.toFixed(1) + "h"} sub={`${confirmedBk.length} bookings`} />
        <KPI label="AVG BOOKING DURATION" value={avgDuration > 0 ? avgDuration.toFixed(1) + "h" : "—"} />
      </div>

      {/* Per-bay utilization */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <p style={GS.label}>UTILIZATION BY BAY</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bayUtil.map(({ bay, hrs, pct }) => (
            <div key={bay} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, width: 48, flexShrink: 0 }}>Bay {bay}</span>
              <div style={{ flex: 1 }}><Bar pct={pct} color={GREEN} /></div>
              <span style={{ fontSize: 12, color: "#555", width: 80, textAlign: "right", flexShrink: 0 }}>{hrs.toFixed(1)}h · {fmtPct(pct)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Busiest times */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16 }}>
          <p style={GS.label}>BUSIEST DAYS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dayCount.map(({ day, count }) => (
              <div key={day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, width: 36, flexShrink: 0 }}>{day}</span>
                <div style={{ flex: 1 }}><Bar pct={(count / maxDayCount) * 100} color={PURPLE} /></div>
                <span style={{ fontSize: 12, color: "#888", width: 24, textAlign: "right" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16 }}>
          <p style={GS.label}>BUSIEST TIME SLOTS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(hourBuckets).length === 0
              ? <p style={{ fontSize: 12, color: "#aaa" }}>No data</p>
              : Object.entries(hourBuckets).map(([bucket, count]) => (
                <div key={bucket} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, width: 140, flexShrink: 0 }}>{bucket}</span>
                  <div style={{ flex: 1 }}><Bar pct={(count / maxBucket) * 100} color={ORANGE} /></div>
                  <span style={{ fontSize: 12, color: "#888", width: 24, textAlign: "right" }}>{count}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* ── BOOKINGS ── */}
      <SectionTitle>Bookings</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label="TOTAL BOOKINGS"   value={confirmedBk.length} />
        <KPI label="BAY BOOKINGS"     value={bayBk.length} />
        <KPI label="LESSONS"          value={lessonBk.length} />
        <KPI label="CANCELLATION RATE" value={fmtPct(cancelRate)} sub={`${cancelledBk.length} cancelled`} color={cancelRate > 20 ? RED : cancelRate > 10 ? ORANGE : GREEN} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16 }}>
          <p style={GS.label}>MEMBER vs NON-MEMBER BOOKINGS</p>
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#555" }}>Members</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{memberBk.length} ({fmtPct(memberBkPct)})</span>
            </div>
            <Bar pct={memberBkPct} color={GREEN} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#555" }}>Non-Members</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{confirmedBk.length - memberBk.length} ({fmtPct(100 - memberBkPct)})</span>
            </div>
            <Bar pct={100 - memberBkPct} color="#ccc" />
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16 }}>
          <p style={GS.label}>LESSONS BY COACH</p>
          {Object.keys(coachMap).length === 0
            ? <p style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>No lessons in this period</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {Object.entries(coachMap).map(([name, count]) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{name}</span>
                    <div style={{ width: 120 }}><Bar pct={(count / maxCoach) * 100} color={PURPLE} /></div>
                    <span style={{ fontSize: 12, color: "#888", width: 20, textAlign: "right" }}>{count}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* ── CUSTOMERS & MEMBERSHIP ── */}
      <SectionTitle>Customers &amp; Membership</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label="TOTAL CUSTOMERS"   value={customers.length} />
        <KPI label="NEW THIS PERIOD"   value={newThisPeriod.length} color={GREEN} />
        <KPI label="ACTIVE MEMBERS"    value={activeMembers.length} />
        <KPI label="AT-RISK MEMBERS"   value={atRisk.length} sub="No booking in 30+ days" color={atRisk.length > 0 ? RED : GREEN} />
      </div>

      {/* Tier breakdown */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <p style={GS.label}>MEMBERS BY TIER</p>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {tierCounts.map(t => (
            <div key={t.id} style={{ flex: 1, background: t.c + "12", border: `1px solid ${t.c}33`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: t.c }}>{t.count}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: t.c, marginTop: 2 }}>{t.n}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── MEMBER CREDIT UTILIZATION ── */}
      <SectionTitle>Member Credit Utilization</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
        <KPI label="AVG CREDIT UTILIZATION" value={fmtPct(avgCreditUtil)} sub="Player tier members" color={avgCreditUtil > 70 ? GREEN : avgCreditUtil > 40 ? ORANGE : RED} />
        <KPI label="CHAMPION MEMBERS" value={customers.filter(c => c.tier === "champion").length} sub="Unlimited access" color="#124A2B" />
      </div>

      {memberUtil.length === 0
        ? <div style={S.empty}><p style={{ fontSize: 14 }}>No Player tier members to show utilization for</p></div>
        : (
          <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 8 }}>
              <p style={{ ...GS.label, margin: 0, flex: 1 }}>CREDIT USAGE PER MEMBER</p>
              <span style={{ fontSize: 10, color: "#aaa" }}>Used / Total hours this cycle</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {memberUtil.map(({ name, tier, used, total, remaining, pct }) => {
                const t = TIERS.find(x => x.id === tier);
                const barColor = pct > 80 ? GREEN : pct > 40 ? ORANGE : RED;
                return (
                  <div key={name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: t?.c + "20", color: t?.c, padding: "2px 7px", borderRadius: 6 }}>{t?.n}</span>
                      </div>
                      <span style={{ fontSize: 12, fontFamily: mono, fontWeight: 700, color: barColor }}>{fmtPct(pct)}</span>
                    </div>
                    <Bar pct={pct} color={barColor} height={10} />
                    <p style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{used}h used · {remaining}h remaining of {total}h</p>
                  </div>
                );
              })}
            </div>
          </div>
        )
      }

      {/* At-risk members */}
      {atRisk.length > 0 && (
        <>
          <SectionTitle>At-Risk Members</SectionTitle>
          <div style={{ background: "#fff", border: `1px solid ${RED}33`, borderRadius: 14, padding: 16 }}>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Members with no bookings in the last 30 days</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {atRisk.map(c => {
                const lastBk = bookings
                  .filter(b => b.customer_id === c.id && b.status !== "cancelled")
                  .sort((a, b2) => (b2.date || "").localeCompare(a.date || ""))[0];
                const t = TIERS.find(x => x.id === c.tier);
                return (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f2f2f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: t?.c || "#888", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                        {cn(c).split(" ").map(n => n[0]).join("").slice(0,2)}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{cn(c)}</p>
                        <p style={{ fontSize: 11, color: "#888" }}>{t?.n} · {lastBk ? "Last booked " + new Date(lastBk.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Never booked"}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: RED, fontWeight: 600 }}>Inactive</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {loadingT && <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 16 }}>Loading transaction data...</p>}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { db } from "../lib/db.js";
import { GREEN, PURPLE, ORANGE, RED, mono, ff, cn, X, S, GS, TC, TN } from "../lib/constants.jsx";

const fmt$ = n => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const today = new Date(); today.setHours(0,0,0,0);
const isExpired = d => d && new Date(d + "T23:59:59") < today;

const PKG_TYPES = ["all", "single", "3hr", "5hr"];
const PKG_LABEL = { all: "All Types", single: "Single Lessons", "3hr": "3-Hr Package", "5hr": "5-Hr Package" };
const SORT_OPTS = [
  { k: "recent",   l: "Recent Activity" },
  { k: "3hr",      l: "3-Hr Packages" },
  { k: "5hr",      l: "5-Hr Packages" },
  { k: "single",   l: "Single Lessons" },
  { k: "spent",    l: "Total Spent" },
];

const StatusBadge = ({ pkg }) => {
  if (!pkg) return null;
  const expired = isExpired(pkg.expiry_date);
  const exhausted = pkg.status === "exhausted" || pkg.remaining_credits === 0;
  const color = exhausted || expired ? "#888" : GREEN;
  const label = exhausted ? "Used" : expired ? "Expired" : `${pkg.remaining_credits} left`;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: color, padding: "2px 7px", borderRadius: 5, fontFamily: mono, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
};

export default function LessonsTab({ customers }) {
  const [packages,    setPackages]    = useState([]);
  const [lessons,     setLessons]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [sortBy,      setSortBy]      = useState("recent");
  const [filterType,  setFilterType]  = useState("all");
  const [expanded,    setExpanded]    = useState(null); // customer id

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pkgs, bks] = await Promise.all([
        db.get("lesson_packages", "select=*&order=purchase_date.desc"),
        db.get("bookings", "select=*&type=eq.lesson&order=date.desc"),
      ]);
      setPackages(pkgs || []);
      setLessons(bks || []);
      setLoading(false);
    })();
  }, []);

  // Build per-customer summary
  const customerData = useMemo(() => {
    const map = {};

    // Process packages
    packages.forEach(pkg => {
      if (!pkg.customer_id) return;
      if (!map[pkg.customer_id]) map[pkg.customer_id] = { packages: [], lessons: [], totalSpent: 0, lastActivity: null };
      map[pkg.customer_id].packages.push(pkg);
      map[pkg.customer_id].totalSpent += Number(pkg.price || 0);
      const d = pkg.purchase_date || pkg.expiry_date;
      if (d && (!map[pkg.customer_id].lastActivity || d > map[pkg.customer_id].lastActivity))
        map[pkg.customer_id].lastActivity = d;
    });

    // Process single lessons (bookings with no package link — amount > 0)
    lessons.forEach(bk => {
      if (!bk.customer_id) return;
      if (!map[bk.customer_id]) map[bk.customer_id] = { packages: [], lessons: [], totalSpent: 0, lastActivity: null };
      map[bk.customer_id].lessons.push(bk);
      if (bk.credits_used === 0 || !bk.credits_used) {
        map[bk.customer_id].totalSpent += Number(bk.amount || 0);
      }
      if (bk.date && (!map[bk.customer_id].lastActivity || bk.date > map[bk.customer_id].lastActivity))
        map[bk.customer_id].lastActivity = bk.date;
    });

    return Object.entries(map).map(([custId, data]) => {
      const cust = customers.find(c => c.id === custId);
      if (!cust) return null;
      const activePackage = data.packages.find(p => p.status === "active" && p.remaining_credits > 0 && !isExpired(p.expiry_date));
      const totalLessons  = data.lessons.length;
      const has3hr        = data.packages.some(p => p.total_credits === 3);
      const has5hr        = data.packages.some(p => p.total_credits === 5);
      const hasSingle     = data.lessons.some(bk => !bk.credits_used || bk.credits_used === 0);
      return { custId, cust, ...data, activePackage, totalLessons, has3hr, has5hr, hasSingle };
    }).filter(Boolean);
  }, [packages, lessons, customers]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = customerData;

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d => cn(d.cust).toLowerCase().includes(q) || (d.cust.phone || "").includes(q));
    }

    // Type filter
    if (filterType === "3hr")    list = list.filter(d => d.has3hr);
    if (filterType === "5hr")    list = list.filter(d => d.has5hr);
    if (filterType === "single") list = list.filter(d => d.hasSingle);

    // Sort
    if (sortBy === "recent") list = [...list].sort((a, b) => (b.lastActivity || "").localeCompare(a.lastActivity || ""));
    if (sortBy === "3hr")    list = [...list].filter(d => d.has3hr).sort((a, b) => (b.lastActivity || "").localeCompare(a.lastActivity || ""));
    if (sortBy === "5hr")    list = [...list].filter(d => d.has5hr).sort((a, b) => (b.lastActivity || "").localeCompare(a.lastActivity || ""));
    if (sortBy === "single") list = [...list].filter(d => d.hasSingle).sort((a, b) => (b.lastActivity || "").localeCompare(a.lastActivity || ""));
    if (sortBy === "spent")  list = [...list].sort((a, b) => b.totalSpent - a.totalSpent);

    return list;
  }, [customerData, search, sortBy, filterType]);

  // KPIs
  const activeCount    = packages.filter(p => p.status === "active" && p.remaining_credits > 0 && !isExpired(p.expiry_date)).length;
  const thisMonth      = new Date().toISOString().slice(0, 7);
  const lessonsThisMo  = lessons.filter(l => (l.date || "").startsWith(thisMonth)).length;
  const revenueThisMo  = lessons.filter(l => (l.date || "").startsWith(thisMonth)).reduce((s, l) => s + Number(l.amount || 0), 0)
                       + packages.filter(p => (p.purchase_date || "").startsWith(thisMonth)).reduce((s, p) => s + Number(p.price || 0), 0);
  const coachCounts    = {};
  lessons.forEach(l => { if (l.coach_name) coachCounts[l.coach_name] = (coachCounts[l.coach_name] || 0) + 1; });
  const topCoach       = Object.entries(coachCounts).sort((a, b) => b[1] - a[1])[0]?.[0]?.split(" ")[0] || "—";

  return (
    <div style={S.pad}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Lesson Packages</h2>
        <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12, background: "#888" }}
          onClick={async () => {
            setLoading(true);
            const [pkgs, bks] = await Promise.all([
              db.get("lesson_packages", "select=*&order=purchase_date.desc"),
              db.get("bookings", "select=*&type=eq.lesson&order=date.desc"),
            ]);
            setPackages(pkgs || []); setLessons(bks || []); setLoading(false);
          }}>
          ↻ Refresh
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "ACTIVE PACKAGES",       value: activeCount,              color: GREEN  },
          { label: "LESSONS THIS MONTH",     value: lessonsThisMo,            color: PURPLE },
          { label: "LESSON REVENUE / MONTH", value: fmt$(revenueThisMo),      color: "#1a1a1a" },
          { label: "TOP COACH",              value: topCoach,                 color: "#1a1a1a" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: mono, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ ...S.srch, flex: 1, minWidth: 200, marginBottom: 0 }}>
          {X.search(15)}
          <input style={S.srchIn} placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#f0f0ee", borderRadius: 10, padding: 3 }}>
          {SORT_OPTS.map(o => (
            <button key={o.k} onClick={() => setSortBy(o.k)}
              style={{ padding: "7px 11px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: ff,
                background: sortBy === o.k ? "#fff" : "transparent",
                color: sortBy === o.k ? "#1a1a1a" : "#888",
                boxShadow: sortBy === o.k ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* Customer list */}
      {loading ? (
        <div style={S.empty}><p style={{ color: "#aaa" }}>Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}><p>No lesson activity {search ? "matches" : "yet"}</p></div>
      ) : filtered.map(d => {
        const isOpen = expanded === d.custId;
        const coaches = [...new Set([
          ...d.packages.map(p => p.coach_name),
          ...d.lessons.map(l => l.coach_name),
        ].filter(Boolean))];

        // Build full timeline — packages + lessons sorted by date desc
        // Enrich credit lessons with the package they came from (match by coach + date window)
        const enrichedLessons = d.lessons.map(l => {
          if (!l.credits_used || l.credits_used === 0) return { ...l, _type: "lesson", _date: l.date || "" };
          // Find the package for this coach that was active on this lesson date
          const matchPkg = d.packages.find(p =>
            p.coach_id === (l.coach_name?.includes("Espinoza") ? "SE" : "NC") &&
            (!p.purchase_date || p.purchase_date <= l.date) &&
            (!p.expiry_date   || p.expiry_date   >= l.date)
          ) || d.packages.find(p => p.coach_name === l.coach_name); // fallback: same coach any package
          return { ...l, _type: "lesson", _date: l.date || "", _pkg: matchPkg || null };
        });

        const timeline = [
          ...d.packages.map(p => ({ ...p, _type: "package", _date: p.purchase_date || "" })),
          ...enrichedLessons,
        ].sort((a, b) => b._date.localeCompare(a._date));

        return (
          <div key={d.custId} style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, marginBottom: 8, overflow: "hidden" }}>
            {/* Row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
              onClick={() => setExpanded(isOpen ? null : d.custId)}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: PURPLE + "18", color: PURPLE,
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, fontFamily: mono, flexShrink: 0 }}>
                {(d.cust.first_name || "?")[0]}{(d.cust.last_name || "?")[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{cn(d.cust)}</p>
                  {d.cust.tier && d.cust.tier !== "none" && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: TC[d.cust.tier], padding: "2px 6px", borderRadius: 4, fontFamily: mono }}>
                      {TN[d.cust.tier]}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: "#888" }}>
                  {coaches.join(" · ")} · {d.totalLessons} lesson{d.totalLessons !== 1 ? "s" : ""} taken · Last: {fmtDate(d.lastActivity)}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                {d.activePackage ? <StatusBadge pkg={d.activePackage} /> : (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#888", background: "#f0f0ee", padding: "2px 7px", borderRadius: 5, fontFamily: mono }}>NO ACTIVE PKG</span>
                )}
                <p style={{ fontSize: 11, color: "#888" }}>{fmt$(d.totalSpent)} total</p>
              </div>
              <span style={{ color: "#ccc", marginLeft: 4 }}>{isOpen ? X.chevL(16) : X.chevR(16)}</span>
            </div>

            {/* Expanded timeline */}
            {isOpen && (
              <div style={{ borderTop: "1px solid #f2f2f0", padding: "0 16px 16px" }}>
                {/* Package summary row */}
                <div style={{ display: "flex", gap: 8, paddingTop: 14, marginBottom: 14, flexWrap: "wrap" }}>
                  {[
                    { label: "Total Packages", value: d.packages.length },
                    { label: "Single Lessons", value: d.lessons.filter(l => !l.credits_used || l.credits_used === 0).length },
                    { label: "Via Package",    value: d.lessons.filter(l => l.credits_used > 0).length },
                    { label: "Total Spent",    value: fmt$(d.totalSpent) },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#fafaf8", border: "1px solid #e8e8e6", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: "#888", fontWeight: 700, letterSpacing: 0.5 }}>{s.label.toUpperCase()}</p>
                      <p style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, marginTop: 2 }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10 }}>FULL HISTORY</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {timeline.map((item, i) => {
                    if (item._type === "package") {
                      const used      = item.total_credits - item.remaining_credits;
                      const expired   = isExpired(item.expiry_date);
                      const exhausted = item.status === "exhausted" || item.remaining_credits === 0;
                      const statusColor = exhausted || expired ? "#888" : GREEN;
                      return (
                        <div key={"pkg-" + item.id + i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: PURPLE + "08", border: "1px solid " + PURPLE + "22", borderRadius: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", fontFamily: mono }}>{item.total_credits}HR</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                              <p style={{ fontSize: 13, fontWeight: 600 }}>{item.name || item.total_credits + "-Hour Package"}</p>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{exhausted ? "Used" : expired ? "Expired" : item.remaining_credits + " remaining"}</span>
                            </div>
                            <p style={{ fontSize: 11, color: "#888" }}>
                              {item.coach_name} · Purchased {fmtDate(item.purchase_date)} · Expires {fmtDate(item.expiry_date)}
                            </p>
                            <div style={{ marginTop: 6, height: 5, background: "#e8e8e6", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ width: (used / item.total_credits * 100) + "%", height: "100%", background: exhausted ? "#888" : PURPLE, borderRadius: 99, transition: "width .4s" }} />
                            </div>
                            <p style={{ fontSize: 10, color: "#aaa", marginTop: 3 }}>{used} of {item.total_credits} credits used · {fmt$(item.price || 0)}</p>
                          </div>
                        </div>
                      );
                    } else {
                      // Single lesson or credit-based lesson
                      const isCredit = item.credits_used > 0;
                      return (
                        <div key={"les-" + item.id + i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "#fafaf8", border: "1px solid #e8e8e6", borderRadius: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: isCredit ? "#f0f0ee" : PURPLE + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: isCredit ? "#888" : PURPLE, fontFamily: mono }}>1HR</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <p style={{ fontSize: 13, fontWeight: 600 }}>Lesson{item.coach_name ? " · " + item.coach_name : ""}</p>
                              <p style={{ fontSize: 12, fontWeight: 600, color: isCredit ? "#888" : "#1a1a1a" }}>
                                {isCredit ? "1 credit" : fmt$(item.amount || 0)}
                              </p>
                            </div>
                            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                              {fmtDate(item.date)}{item.start_time ? " · " + item.start_time : ""} · Bay {item.bay || "—"}
                              {isCredit && (
                              <span style={{ marginLeft: 6, color: PURPLE, fontWeight: 600 }}>
                                via {item._pkg ? (item._pkg.name || item._pkg.total_credits + "-Hr Package") : "package"}
                              </span>
                            )}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

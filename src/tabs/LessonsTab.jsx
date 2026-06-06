import React, { useState, useEffect, useMemo } from "react";
import { db } from "../lib/db.js";
import { sq } from "../lib/square.js";
import { GREEN, PURPLE, ORANGE, RED, mono, ff, cn, X, S, GS, TC, TN } from "../lib/constants.jsx";

const COACHES = [
  { id: "SE", n: "Santiago Espinoza" },
  { id: "NC", n: "Nicolas Cavero"   },
];
const PACKAGES = [
  { name: "3-Hour Package", credits: 3, price: 360, memberPrice: 300, months: 2 },
  { name: "5-Hour Package", credits: 5, price: 500, memberPrice: 400, months: 3 },
];
const dateKey = d => d.toISOString().split("T")[0];
const fmtPhone = (p) => {
  if (!p) return "";
  const d = String(p).replace(/\D/g, "");
  if (d.length === 10) return `+1 (${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  if (d.length === 11) return `+${d[0]} (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  return p;
};

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
  // Adjust credits modal
  const [adjModal,    setAdjModal]    = useState(null); // { cust, pkg }
  const [adjDelta,    setAdjDelta]    = useState(0);
  const [adjSaving,   setAdjSaving]   = useState(false);
  // Sell package modal
  const [sellModal,   setSellModal]   = useState(null); // { cust, pkg, coachId, saving }
  const [sellSearch,  setSellSearch]  = useState("");
  const [sellCust,    setSellCust]    = useState(null);
  const [sellPkg,     setSellPkg]     = useState(null);
  const [sellCoach,   setSellCoach]   = useState(null);
  const [sellSaving,  setSellSaving]  = useState(false);
  const [sellCards,   setSellCards]   = useState([]);
  const [sellCardId,  setSellCardId]  = useState(null);

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

  const reload = async () => {
    setLoading(true);
    const [pkgs, bks] = await Promise.all([
      db.get("lesson_packages", "select=*&order=purchase_date.desc"),
      db.get("bookings", "select=*&type=eq.lesson&order=date.desc"),
    ]);
    setPackages(pkgs || []); setLessons(bks || []); setLoading(false);
  };

  const adjustCredits = async () => {
    if (!adjModal || adjDelta === 0) return;
    setAdjSaving(true);
    const { pkg } = adjModal;
    const newRemaining = Math.max(0, Math.min(pkg.total_credits, pkg.remaining_credits + adjDelta));
    const newStatus = newRemaining === 0 ? "exhausted" : "active";
    await db.patch("lesson_packages", `id=eq.${pkg.id}`, { remaining_credits: newRemaining, status: newStatus });
    await db.post("transactions", {
      customer_id: pkg.customer_id,
      description: `Lesson Credit Adjustment (${adjDelta > 0 ? "+" : ""}${adjDelta}) — Admin`,
      date: dateKey(new Date()), amount: 0, payment_label: "Admin",
    });
    setAdjModal(null); setAdjDelta(0); setAdjSaving(false);
    reload();
  };

  const loadSellCards = async (custId) => {
    const cards = await db.get("payment_methods", `customer_id=eq.${custId}&select=*&order=is_default.desc`);
    setSellCards(cards || []);
    setSellCardId(cards?.[0]?.id || null);
  };

  const sellPackage = async () => {
    if (!sellCust || !sellPkg || !sellCoach) return;
    setSellSaving(true);
    const isMem = !!(sellCust.tier && sellCust.tier !== "none");
    const price = isMem ? sellPkg.memberPrice : sellPkg.price;
    const today = new Date();
    const expDate = new Date(today); expDate.setMonth(expDate.getMonth() + sellPkg.months);
    const fmtShort = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // Check for existing active package
    const existingPkg = await db.get("lesson_packages", `customer_id=eq.${sellCust.id}&status=eq.active&select=id`);
    if (existingPkg?.length) {
      setSellSaving(false);
      alert("Customer already has an active lesson package.");
      return;
    }

    let sqPaymentId = null;
    const sqCard = sellCards.find(c => c.id === sellCardId);
    if (sqCard?.square_card_id && sellCust.square_customer_id && sellCardId !== "in_person") {
      const chargeRes = await sq("lesson.purchase", {
        square_customer_id: sellCust.square_customer_id,
        card_id: sqCard.square_card_id,
        coach_id: sellCoach,
        hours: sellPkg.credits,
        is_member: isMem,
      });
      sqPaymentId = chargeRes?.payment?.id || null;
      if (!sqPaymentId && sellCardId !== "in_person") {
        alert("Payment failed. Please try again.");
        setSellSaving(false);
        return;
      }
    }

    await db.post("lesson_packages", {
      customer_id: sellCust.id,
      name: sellPkg.name, total_credits: sellPkg.credits, remaining_credits: sellPkg.credits,
      coach_id: sellCoach, coach_name: COACHES.find(c => c.id === sellCoach)?.n,
      price, expiry_date: dateKey(expDate), status: "active",
      purchase_date: dateKey(today), square_payment_id: sqPaymentId,
    });
    await db.post("transactions", {
      customer_id: sellCust.id,
      description: `${sellPkg.name} · ${COACHES.find(c => c.id === sellCoach)?.n}`,
      date: dateKey(today), amount: price,
      payment_label: sellCardId === "in_person" ? "In Person" : (sqCard ? `${sqCard.brand} ···${sqCard.last4}` : "Admin"),
      square_payment_id: sqPaymentId,
    });

    setSellSaving(false); setSellModal(null); setSellCust(null); setSellPkg(null); setSellCoach(null); setSellCards([]); setSellCardId(null); setSellSearch("");
    reload();
  };

  return (
    <div style={S.pad}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Lesson Packages</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12 }}
            onClick={() => { setSellModal(true); setSellSearch(""); setSellCust(null); setSellPkg(null); setSellCoach(null); setSellCards([]); setSellCardId(null); }}>
            {X.plus(14)} Sell Package
          </button>
          <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12, background: "#888" }} onClick={reload}>
            ↻ Refresh
          </button>
        </div>
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
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{exhausted ? "Used" : expired ? "Expired" : item.remaining_credits + " remaining"}</span>
                              {!exhausted && !expired && <button style={{ fontSize: 10, fontWeight: 600, color: PURPLE, background: "none", border: `1px solid ${PURPLE}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontFamily: ff }} onClick={e => { e.stopPropagation(); setAdjModal({ cust: d.cust, pkg: item }); setAdjDelta(0); }}>Adjust</button>}
                            </div>
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
      {/* ── Adjust Credits Modal ── */}
      {adjModal && (
        <div style={S.ov} onClick={() => setAdjModal(null)}>
          <div style={{ ...S.mod, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Adjust Lesson Credits</h3>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>{cn(adjModal.cust)} · {adjModal.pkg.name} · {adjModal.pkg.remaining_credits}/{adjModal.pkg.total_credits} remaining</p>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 8, display: "block" }}>ADJUSTMENT</label>
            <select style={{ width: "100%", padding: "10px 12px", border: "1px solid #e8e8e6", borderRadius: 10, fontSize: 14, fontFamily: ff, marginBottom: 16 }}
              value={adjDelta} onChange={e => setAdjDelta(Number(e.target.value))}>
              <option value={0} disabled>Choose...</option>
              {[-5,-4,-3,-2,-1,1,2,3,4,5].filter(d => {
                const next = adjModal.pkg.remaining_credits + d;
                return next >= 0 && next <= adjModal.pkg.total_credits;
              }).map(d => (
                <option key={d} value={d}>{d > 0 ? "+" : ""}{d} credit{Math.abs(d)!==1?"s":""} → {adjModal.pkg.remaining_credits + d} remaining</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...GS.togBtn, flex: 1, padding: "12px" }} onClick={() => setAdjModal(null)}>Cancel</button>
              <button style={{ ...S.b1, flex: 2, background: PURPLE, opacity: adjDelta !== 0 ? 1 : 0.4 }} disabled={adjDelta === 0 || adjSaving} onClick={adjustCredits}>
                {adjSaving ? "Saving..." : "Save Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sell Package Modal ── */}
      {sellModal && (
        <div style={S.ov} onClick={() => { setSellModal(null); setSellCust(null); setSellPkg(null); setSellCoach(null); }}>
          <div style={{ ...S.mod, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Sell Lesson Package</h3>

            {/* Customer picker */}
            {!sellCust ? (
              <div style={{ marginBottom: 16 }}>
                <label style={GS.label}>CUSTOMER *</label>
                <input style={{ ...GS.input, marginBottom: 4 }} placeholder="Search by name or phone..."
                  value={sellSearch} onChange={e => setSellSearch(e.target.value)} autoFocus />
                {sellSearch && (
                  <div style={{ border: "1px solid #e8e8e6", borderRadius: 8, maxHeight: 180, overflowY: "auto" }}>
                    {customers.filter(c => cn(c).toLowerCase().includes(sellSearch.toLowerCase()) || (c.phone||"").includes(sellSearch)).slice(0,8).map(c => (
                      <div key={c.id} style={{ padding: "8px 12px", borderBottom: "1px solid #f2f2f0", cursor: "pointer", fontSize: 13 }}
                        onClick={() => { setSellCust(c); setSellSearch(""); loadSellCards(c.id); }}>
                        <span style={{ fontWeight: 600 }}>{cn(c)}</span>
                        <span style={{ color: "#888", fontSize: 11, marginLeft: 6 }}>{fmtPhone(c.phone)}</span>
                        {c.tier && c.tier !== "none" && <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: "#124A2B", padding: "2px 6px", borderRadius: 4, marginLeft: 6, fontFamily: mono }}>MBR</span>}
                      </div>
                    ))}
                    {customers.filter(c => cn(c).toLowerCase().includes(sellSearch.toLowerCase()) || (c.phone||"").includes(sellSearch)).length === 0 && (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: "#aaa" }}>No customers found</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: PURPLE + "10", borderRadius: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: PURPLE, flex: 1 }}>{cn(sellCust)}</span>
                <button style={{ fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }} onClick={() => { setSellCust(null); setSellCards([]); }}>Change</button>
              </div>
            )}

            {/* Package picker */}
            {sellCust && (
              <>
                <label style={GS.label}>PACKAGE *</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {PACKAGES.map(p => {
                    const isMem = !!(sellCust.tier && sellCust.tier !== "none");
                    const price = isMem ? p.memberPrice : p.price;
                    return (
                      <button key={p.name} style={{ ...GS.togBtn, flex: 1, ...(sellPkg?.name === p.name ? { background: PURPLE, color: "#fff", borderColor: PURPLE } : {}) }}
                        onClick={() => setSellPkg(p)}>
                        <span style={{ display: "block", fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                        <span style={{ display: "block", fontSize: 12, marginTop: 2 }}>${price} · {p.credits} credits</span>
                      </button>
                    );
                  })}
                </div>

                <label style={GS.label}>COACH *</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {COACHES.map(c => (
                    <button key={c.id} style={{ ...GS.togBtn, flex: 1, ...(sellCoach === c.id ? { background: PURPLE, color: "#fff", borderColor: PURPLE } : {}) }}
                      onClick={() => setSellCoach(c.id)}>
                      {c.n.split(" ")[0]}
                    </button>
                  ))}
                </div>

                {/* Payment */}
                <label style={GS.label}>PAYMENT</label>
                {sellCards.length === 0 ? (
                  <div style={{ marginBottom: 14 }}>
                    <button style={{ ...GS.togBtn, width: "100%", ...(sellCardId === "in_person" ? { background: "#888", color: "#fff" } : {}) }}
                      onClick={() => setSellCardId("in_person")}>Pay in person</button>
                    <p style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>No cards on file for this customer.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {sellCards.map(card => (
                      <button key={card.id} style={{ ...GS.togBtn, display: "flex", alignItems: "center", gap: 8, ...(sellCardId === card.id ? { background: PURPLE, color: "#fff", borderColor: PURPLE } : {}) }}
                        onClick={() => setSellCardId(card.id)}>
                        {X.card(14)} {card.brand} •••• {card.last4}
                        {card.is_default && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: "auto" }}>default</span>}
                      </button>
                    ))}
                    <button style={{ ...GS.togBtn, ...(sellCardId === "in_person" ? { background: "#888", color: "#fff" } : {}) }}
                      onClick={() => setSellCardId("in_person")}>Pay in person</button>
                  </div>
                )}

                {sellPkg && sellCoach && sellCardId && (
                  <div style={{ background: "#fafaf8", borderRadius: 10, padding: 12, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#555" }}>{sellPkg.name} · {COACHES.find(c=>c.id===sellCoach)?.n}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono }}>${sellCust.tier && sellCust.tier !== "none" ? sellPkg.memberPrice : sellPkg.price}</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...GS.togBtn, padding: "12px 16px" }} onClick={() => { setSellModal(null); setSellCust(null); setSellPkg(null); setSellCoach(null); }}>Cancel</button>
                  <button style={{ ...S.b1, flex: 2, background: PURPLE, opacity: (sellPkg && sellCoach && sellCardId) ? 1 : 0.4 }}
                    disabled={!sellPkg || !sellCoach || !sellCardId || sellSaving} onClick={sellPackage}>
                    {sellSaving ? "Processing..." : "Confirm Sale"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

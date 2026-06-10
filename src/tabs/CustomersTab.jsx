import React, { useState, useCallback } from "react";
import { db, SB_URL, SB_KEY } from "../lib/db.js";
import { GREEN, PURPLE, RED, ORANGE, TC, TN, TB, TIERS, mono, ff, cn, X, S, GS } from "../lib/constants.jsx";

const sq = async (action, params = {}) => {
  try {
    const r = await fetch(`${SB_URL}/functions/v1/square-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SB_KEY}`, "x-bgs-key": "bgs-app-2026-x9k3m7p" },
      body: JSON.stringify({ action, ...params }),
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
};

const fmt$ = n => "$" + Number(n || 0).toFixed(2);
const fmtPhone = (p) => {
  if (!p) return "";
  const d = String(p).replace(/\D/g, "");
  if (d.length === 10) return `+1 (${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  if (d.length === 11) return `+${d[0]} (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  return p;
};
const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtDateTime = iso => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const SectionHeader = ({ label }) => (
  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 10, marginTop: 20 }}>{label}</p>
);

const EmptyRow = ({ msg }) => (
  <div style={{ padding: "14px 0", textAlign: "center", color: "#aaa", fontSize: 13 }}>{msg}</div>
);

export default function CustomersTab({ customers, bookings, onRefresh, logActivity }) {
  const [search,      setSearch]      = useState("");
  const [addModal,    setAddModal]    = useState(false);
  const [form,        setForm]        = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState("");
  const [detailCust,  setDetailCust]  = useState(null); // customer obj
  const [detailData,  setDetailData]  = useState(null); // loaded detail
  const [detailTab,   setDetailTab]   = useState("bookings");
  const [detailLoad,  setDetailLoad]  = useState(false);

  const filtered = search
    ? customers.filter(c =>
        cn(c).toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || "").includes(search) ||
        (c.email || "").includes(search))
    : customers;

  /* ── Load full customer detail ── */
  const openDetail = useCallback(async (cust) => {
    setDetailCust(cust);
    setDetailTab("bookings");
    setDetailData(null);
    setDetailLoad(true);
    const [bks, pkgs, memHist, txns, cards] = await Promise.all([
      db.get("bookings",            `customer_id=eq.${cust.id}&select=*&order=date.desc`),
      db.get("lesson_packages",     `customer_id=eq.${cust.id}&select=*&order=purchase_date.desc`),
      db.get("membership_history",  `customer_id=eq.${cust.id}&select=*&order=created_at.desc`),
      db.get("transactions",        `customer_id=eq.${cust.id}&select=*&order=date.desc&limit=100`),
      db.get("payment_methods",     `customer_id=eq.${cust.id}&select=*&order=is_default.desc`),
    ]);
    setDetailData({
      bookings:    bks     || [],
      packages:    pkgs    || [],
      memHistory:  memHist || [],
      transactions: txns   || [],
      cards:       cards   || [],
    });
    setDetailLoad(false);
  }, []);

  /* ── Add customer ── */
  const openAdd = () => { setForm({ firstName: "", lastName: "", phone: "", email: "" }); setSaveError(""); setAddModal(true); };
  const saveCustomer = async () => {
    setSaveError("");
    const phone = form.phone.replace(/\D/g, "");
    if (!form.firstName.trim()) { setSaveError("First name is required."); return; }
    if (!form.lastName.trim())  { setSaveError("Last name is required."); return; }
    if (phone.length < 10) { setSaveError("Please enter a valid 10-digit phone number."); return; }
    const existing = await db.get("customers", `phone=eq.${phone}&select=id`);
    if (existing?.length) { setSaveError("A customer with this phone number already exists."); return; }
    setSaving(true);
    const rows = await db.post("customers", {
      first_name: form.firstName.trim(), last_name: form.lastName.trim(),
      phone, email: form.email.trim(), tier: "none", bay_credits_remaining: 0, bay_credits_total: 0,
    });
    const newCust = Array.isArray(rows) ? rows[0] : rows;
    if (!newCust?.id) { setSaveError("Failed to create customer."); setSaving(false); return; }
    // Search Square first (E.164 format), create only if not found
    const phoneE164 = phone; // Edge Function adds +1 prefix internally
    console.log("[BGS] saveCustomer: phone=", phone, "phoneE164=", phoneE164);
    const searchRes = await sq("customer.search", { phone: phoneE164, email: form.email.trim() });
    console.log("[BGS] customer.search result:", JSON.stringify(searchRes));
    const sqId = searchRes?.customers?.[0]?.id;
    if (sqId) {
      await db.patch("customers", `id=eq.${newCust.id}`, { square_customer_id: sqId });
    } else {
      console.log("[BGS] no Square match, calling customer.create");
      const createRes = await sq("customer.create", { first_name: form.firstName.trim(), last_name: form.lastName.trim(), phone: phoneE164, email: form.email.trim(), supabase_id: newCust.id });
      const createdId = createRes?.customer?.id;
      console.log("[BGS] customer.create result:", JSON.stringify(createRes), "createdId:", createdId);
      if (createdId) {
        const patchRes = await db.patch("customers", `id=eq.${newCust.id}`, { square_customer_id: createdId });
        console.log("[BGS] db.patch result:", JSON.stringify(patchRes));
      }
    }
    await logActivity?.(`Added customer: ${form.firstName.trim()} ${form.lastName.trim()}`);
    setSaving(false); setAddModal(false); onRefresh();
  };

  /* ── Detail tabs ── */
  const DETAIL_TABS = [
    { k: "bookings",     l: "Bay Bookings" },
    { k: "lessons",      l: "Lessons" },
    { k: "packages",     l: "Packages" },
    { k: "membership",   l: "Membership" },
    { k: "transactions", l: "Transactions" },
    { k: "cards",        l: "Cards" },
  ];

  const renderDetailContent = () => {
    if (detailLoad) return <EmptyRow msg="Loading..." />;
    if (!detailData) return null;

    if (detailTab === "bookings") {
      const bayBks = detailData.bookings.filter(b => b.type === "bay");
      if (!bayBks.length) return <EmptyRow msg="No bay bookings yet" />;
      return bayBks.map((b, i) => (
        <div key={b.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < bayBks.length - 1 ? "1px solid #f2f2f0" : "none" }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: b.status === "cancelled" ? "#88818" : GREEN + "18",
            color: b.status === "cancelled" ? "#888" : GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, fontFamily: mono, flexShrink: 0 }}>
            B{b.bay}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Bay {b.bay} · {(b.duration_slots || 2) * 0.5}hr</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{fmt$(b.amount)}</p>
            </div>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
              {fmtDate(b.date)} · {b.start_time || "—"}
              {b.credits_used > 0 && <span style={{ color: GREEN, marginLeft: 6, fontWeight: 600 }}>{b.credits_used}hr credit</span>}
              {b.status === "cancelled" && <span style={{ color: RED, marginLeft: 6, fontWeight: 600 }}>Cancelled</span>}
            </p>
          </div>
        </div>
      ));
    }

    if (detailTab === "lessons") {
      const lesBks = detailData.bookings.filter(b => b.type === "lesson");
      if (!lesBks.length) return <EmptyRow msg="No lessons yet" />;
      return lesBks.map((b, i) => (
        <div key={b.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < lesBks.length - 1 ? "1px solid #f2f2f0" : "none" }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: PURPLE + "18", color: PURPLE,
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 10, fontFamily: mono, flexShrink: 0 }}>
            {(b.coach_name || "").split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Lesson · {b.coach_name || "—"}</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{b.credits_used > 0 ? "1 credit" : fmt$(b.amount)}</p>
            </div>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
              {fmtDate(b.date)} · {b.start_time || "—"} · Bay {b.bay || "—"}
              {b.credits_used > 0 && <span style={{ color: PURPLE, marginLeft: 6, fontWeight: 600 }}>via package</span>}
            </p>
          </div>
        </div>
      ));
    }

    if (detailTab === "packages") {
      if (!detailData.packages.length) return <EmptyRow msg="No lesson packages yet" />;
      return detailData.packages.map((p, i) => {
        const used = p.total_credits - p.remaining_credits;
        const expired = p.expiry_date && new Date(p.expiry_date + "T23:59:59") < new Date();
        const done = p.status === "exhausted" || p.remaining_credits === 0;
        const statusColor = done || expired ? "#888" : GREEN;
        return (
          <div key={p.id} style={{ padding: "12px 0", borderBottom: i < detailData.packages.length - 1 ? "1px solid #f2f2f0" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: PURPLE, padding: "2px 7px", borderRadius: 5, fontFamily: mono }}>
                  {p.total_credits}HR
                </span>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{p.name || p.total_credits + "-Hour Package"}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{done ? "Used" : expired ? "Expired" : p.remaining_credits + " remaining"}</span>
            </div>
            <p style={{ fontSize: 11, color: "#888" }}>{p.coach_name} · Purchased {fmtDate(p.purchase_date)} · Expires {fmtDate(p.expiry_date)}</p>
            <div style={{ marginTop: 6, height: 4, background: "#e8e8e6", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: (used / p.total_credits * 100) + "%", height: "100%", background: done ? "#888" : PURPLE, borderRadius: 99 }} />
            </div>
            <p style={{ fontSize: 10, color: "#aaa", marginTop: 3 }}>{used}/{p.total_credits} credits used · {fmt$(p.price)}</p>
          </div>
        );
      });
    }

    if (detailTab === "membership") {
      const c = detailCust;
      const t = TIERS.find(x => x.id === c?.tier);
      return (
        <>
          {/* Current status */}
          <div style={{ background: t ? t.c + "10" : "#f8f8f6", border: "1px solid " + (t ? t.c + "33" : "#e8e8e6"), borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 700 }}>{t ? t.n : "Non-Member"}</p>
              {t && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: t.c, padding: "2px 8px", borderRadius: 5, fontFamily: mono }}>{t.badge}</span>}
            </div>
            {t && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 12, color: "#555" }}>
                  <span style={{ color: "#888" }}>Monthly: </span>${t.p}/mo
                </p>
                {c.member_since && <p style={{ fontSize: 12, color: "#555" }}><span style={{ color: "#888" }}>Since: </span>{fmtDate(c.member_since)}</p>}
                {c.renewal_date && <p style={{ fontSize: 12, color: "#555" }}><span style={{ color: "#888" }}>Renews: </span>{fmtDate(c.renewal_date)}</p>}
                {t.hrs > 0 && <p style={{ fontSize: 12, color: "#555" }}>
                  <span style={{ color: "#888" }}>Credits: </span>{c.bay_credits_remaining || 0}hr of {c.bay_credits_total || 0}hr remaining
                </p>}
              </div>
            )}
          </div>
          {/* History */}
          <SectionHeader label="MEMBERSHIP HISTORY" />
          {!detailData.memHistory.length ? <EmptyRow msg="No membership history" /> :
            detailData.memHistory.map((h, i) => {
              const tier = TIERS.find(x => x.id === h.tier);
              return (
                <div key={h.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: i < detailData.memHistory.length - 1 ? "1px solid #f2f2f0" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {tier && <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: tier.c, padding: "2px 6px", borderRadius: 4, fontFamily: mono }}>{tier.badge}</span>}
                    <p style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{(h.action || "").replace(/_/g, " ")}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 12, fontWeight: 600 }}>{h.amount > 0 ? fmt$(h.amount) : "—"}</p>
                    <p style={{ fontSize: 11, color: "#888" }}>{fmtDate(h.date)}</p>
                  </div>
                </div>
              );
            })
          }
        </>
      );
    }

    if (detailTab === "transactions") {
      if (!detailData.transactions.length) return <EmptyRow msg="No transactions yet" />;
      return detailData.transactions.map((t, i) => (
        <div key={t.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 0", borderBottom: i < detailData.transactions.length - 1 ? "1px solid #f2f2f0" : "none" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{t.description || "—"}</p>
            <p style={{ fontSize: 11, color: "#888" }}>{fmtDate(t.date)} · {t.payment_label || "—"}</p>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700 }}>{fmt$(t.amount)}</p>
        </div>
      ));
    }

    if (detailTab === "cards") {
      if (!detailData.cards.length) return <EmptyRow msg="No cards on file" />;
      return detailData.cards.map((card, i) => (
        <div key={card.id} style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "10px 0", borderBottom: i < detailData.cards.length - 1 ? "1px solid #f2f2f0" : "none" }}>
          <div style={{ color: "#888" }}>{X.card(18)}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{card.brand} •••• {card.last4}</p>
            <p style={{ fontSize: 11, color: "#888" }}>Exp {card.exp_month}/{card.exp_year}</p>
          </div>
          {card.is_default && <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, background: GREEN + "18", padding: "2px 8px", borderRadius: 5 }}>DEFAULT</span>}
        </div>
      ));
    }
  };

  return (
    <div style={S.pad}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Customers ({customers.length})</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={openAdd}>
            {X.plus(14)} Add Customer
          </button>
          <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12, background: "#888" }} onClick={onRefresh}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={S.srch}>
        {X.search(16)}
        <input style={S.srchIn} placeholder="Search name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Customer list */}
      {filtered.length === 0 ? (
        <div style={S.empty}><p>No customers {search ? "match" : "yet"}</p></div>
      ) : filtered.map(c => {
        const bkCount  = bookings.filter(b => b.customer_id === c.id).length;
        const bayCount = bookings.filter(b => b.customer_id === c.id && b.type === "bay").length;
        const lesCount = bookings.filter(b => b.customer_id === c.id && b.type === "lesson").length;
        return (
          <div key={c.id} style={{ ...S.cR, cursor: "pointer" }} onClick={() => openDetail(c)}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: (TC[c.tier] || "#888") + "18",
              color: TC[c.tier] || "#888", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13, fontFamily: mono, flexShrink: 0 }}>
              {(c.first_name || "?")[0]}{(c.last_name || "?")[0]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{cn(c)}</p>
              <p style={{ fontSize: 11, color: "#888" }}>
                {fmtPhone(c.phone)}{c.email ? " · " + c.email : ""}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: TC[c.tier] || "#888", padding: "3px 8px", borderRadius: 5, fontFamily: mono }}>
                {TN[c.tier] || "None"}
              </span>
              <p style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>
                {bayCount} bay · {lesCount} lesson{lesCount !== 1 ? "s" : ""}
              </p>
            </div>
            <span style={{ color: "#ddd" }}>{X.chevR(14)}</span>
          </div>
        );
      })}

      {/* ── Customer Detail Modal ── */}
      {detailCust && (
        <div style={S.ov} onClick={() => setDetailCust(null)}>
          <div style={{ ...S.mod, maxWidth: 620, maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: (TC[detailCust.tier] || "#888") + "18",
                color: TC[detailCust.tier] || "#888", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 16, fontFamily: mono, flexShrink: 0 }}>
                {(detailCust.first_name || "?")[0]}{(detailCust.last_name || "?")[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{cn(detailCust)}</h3>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: TC[detailCust.tier] || "#888", padding: "3px 8px", borderRadius: 5, fontFamily: mono }}>
                    {TN[detailCust.tier] || "None"}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#888" }}>
                  {fmtPhone(detailCust.phone)}
                  {detailCust.email ? " · " + detailCust.email : ""}
                </p>
                {detailCust.bay_credits_remaining > 0 && (
                  <p style={{ fontSize: 11, color: GREEN, fontWeight: 600, marginTop: 3 }}>
                    {detailCust.bay_credits_remaining}hr bay credits remaining
                  </p>
                )}
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 20, lineHeight: 1 }}
                onClick={() => setDetailCust(null)}>✕</button>
            </div>

            {/* Sub-tabs */}
            <div style={{ ...S.tabs, flexShrink: 0 }}>
              {DETAIL_TABS.map(t => (
                <button key={t.k} style={{ ...S.tab, ...(detailTab === t.k ? S.tabA : {}) }}
                  onClick={() => setDetailTab(t.k)}>{t.l}</button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
              {renderDetailContent()}
            </div>

            <button style={{ ...GS.togBtn, width: "100%", marginTop: 14, flexShrink: 0 }} onClick={() => setDetailCust(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Add Customer Modal ── */}
      {addModal && (
        <div style={S.ov} onClick={() => setAddModal(false)}>
          <div style={{ ...S.mod, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Add New Customer</h3>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>Creates a profile so they can log in with their phone number.</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={GS.label}>FIRST NAME *</label>
                <input style={GS.input} placeholder="First" value={form.firstName} autoFocus
                  onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={GS.label}>LAST NAME *</label>
                <input style={GS.input} placeholder="Last" value={form.lastName}
                  onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={GS.label}>PHONE NUMBER *</label>
              <input style={GS.input} placeholder="10-digit number, e.g. 3051234567" type="tel" inputMode="numeric" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={GS.label}>EMAIL</label>
              <input style={GS.input} placeholder="optional" type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            {saveError && (
              <div style={{ background: "#FFF0F0", border: "1px solid #E0392822", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: RED }}>{saveError}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...GS.togBtn, flex: 1, padding: "12px 16px" }} onClick={() => setAddModal(false)}>Cancel</button>
              <button style={{ ...S.b1, flex: 2, opacity: (form.firstName && form.lastName && form.phone.replace(/\D/g, "").length >= 10) ? 1 : 0.4 }}
                disabled={saving || !form.firstName || !form.lastName || form.phone.replace(/\D/g, "").length < 10} onClick={saveCustomer}>
                {saving ? "Saving..." : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

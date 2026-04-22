import React, { useState } from "react";
import { db } from "../lib/db.js";
import { sq } from "../lib/square.js";
import { GREEN, RED, TC, TB, TIERS, mono, ff, cn, dateKey, X, S, GS } from "../lib/constants.jsx";

export default function MembersTab({ customers, fire, reload, logActivity }) {
  const [memTier,     setMemTier]     = useState("player");
  const [showFormer,  setShowFormer]  = useState(false);
  const [formerList,  setFormerList]  = useState([]);
  const [formerLoad,  setFormerLoad]  = useState(false);
  const [memModal,    setMemModal]    = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [endModal,    setEndModal]    = useState(null);   // { cust, step: 1|2, confirmText }
  const [switchModal, setSwitchModal] = useState(null);  // { cust, toTier }
  const [search,      setSearch]      = useState("");
  const [saving,      setSaving]      = useState(false);
  const [txnModal,      setTxnModal]      = useState(null);
  const [loadingTxns,   setLoadingTxns]   = useState(false);
  const [creditModal,   setCreditModal]   = useState(null);

  const members     = customers.filter(c => c.tier && c.tier !== "none");
  const tierMembers = members.filter(c => c.tier === memTier);
  const activeTier  = TIERS.find(t => t.id === memTier);

  /* ── Add member ── */
  const addMember = async () => {
    if (!memModal?.tier || !memModal?.renewalDate) return;
    if (!memModal?.cust && !(memModal?.newCust && memModal?.firstName && memModal?.phone)) return;
    setSaving(true);

    const t = TIERS.find(x => x.id === memModal.tier);
    let custId  = memModal.cust?.id;
    let custObj = memModal.cust;

    // Create new customer if needed
    if (memModal.newCust && !custId) {
      const phone = (memModal.phone || "").replace(/\D/g, "");
      const newRows = await db.post("customers", {
        first_name: memModal.firstName,
        last_name:  memModal.lastName || "",
        phone,
        email:      memModal.email || "",
        tier:       "none",
      });
      const newCust = Array.isArray(newRows) ? newRows[0] : newRows;
      if (newCust?.id) {
        custId  = newCust.id;
        custObj = newCust;
        const sqResult = await sq("customer.create", {
          first_name:  memModal.firstName,
          last_name:   memModal.lastName || "",
          phone,
          email:       memModal.email || "",
          supabase_id: custId,
        });
        const sqId = sqResult?.customer?.id;
        if (sqId) await db.patch("customers", `id=eq.${custId}`, { square_customer_id: sqId });
      }
    }

    if (!custId) { fire("Could not create customer"); setSaving(false); return; }

    await db.patch("customers", `id=eq.${custId}`, {
      tier:                  memModal.tier,
      bay_credits_remaining: t.hrs === -1 ? 999 : t.hrs,
      bay_credits_total:     t.hrs === -1 ? 999 : t.hrs,
      member_since:          dateKey(new Date()),
      renewal_date:          memModal.renewalDate,
    });
    await db.post("membership_history", {
      customer_id: custId,
      action:      "join",
      tier:        memModal.tier,
      amount:      t.p,
      date:        dateKey(new Date()),
    });
    await db.post("transactions", {
      customer_id:   custId,
      description:   t.n + " Membership",
      date:          dateKey(new Date()),
      amount:        t.p,
      payment_label: "Admin",
    });

    const dispName = memModal.newCust
      ? (memModal.firstName + " " + (memModal.lastName || "")).trim()
      : cn(memModal.cust);
    fire(dispName + " added as " + t.n + " \u2713");
    setSaving(false);
    setMemModal(null);
    setSearch("");
    reload();
  };

  /* ── Cancel membership ── */
  const loadFormerMembers = async () => {
    setFormerLoad(true);
    // Get customers who have cancellation history but are no longer active members
    const hist = await db.get("membership_history", "select=*&order=created_at.desc");
    const cancelled = (hist || []).filter(h => h.action === "cancel_scheduled" || h.action === "cancelled");
    // Group by customer — get most recent cancellation per customer
    const seen = new Set();
    const unique = [];
    for (const h of cancelled) {
      if (!seen.has(h.customer_id)) {
        seen.add(h.customer_id);
        unique.push(h);
      }
    }
    setFormerList(unique);
    setFormerLoad(false);
  };

  const cancelMembership = async () => {
    if (!cancelModal) return;
    setSaving(true);

    const today      = new Date();
    const renewal    = cancelModal.renewal_date ? new Date(cancelModal.renewal_date + "T12:00:00") : null;
    const daysToRenew = renewal ? Math.ceil((renewal - today) / (1000 * 60 * 60 * 24)) : 999;
    const within7    = daysToRenew <= 7;

    // Calculate credits_valid_until
    let creditsValidUntil = null;
    if (renewal) {
      if (within7) {
        // One final cycle — credits valid until next renewal date (renewal + 1 month)
        const nextRenewal = new Date(renewal);
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);
        creditsValidUntil = dateKey(nextRenewal);
      } else {
        // Credits valid until current renewal date
        creditsValidUntil = dateKey(renewal);
      }
    }

    // Mark cancellation scheduled — keep tier active until expiry
    await db.patch("customers", `id=eq.${cancelModal.id}`, {
      cancellation_scheduled: true,
      credits_valid_until:    creditsValidUntil,
    });

    await db.post("membership_history", {
      customer_id: cancelModal.id,
      action:      "cancel_scheduled",
      tier:        cancelModal.tier,
      amount:      0,
      date:        dateKey(new Date()),
    });

    const msg = within7
      ? `Cancellation scheduled. One final cycle will run at renewal. Membership ends ${creditsValidUntil}.`
      : `Cancellation scheduled. Membership and credits remain active until ${creditsValidUntil}.`;
    fire(msg);
    setSaving(false);
    setCancelModal(null);
    reload();
  };

  /* ── End membership immediately ── */
  const endMembershipNow = async () => {
    if (!endModal) return;
    setSaving(true);
    const c = endModal.cust;
    await db.patch("customers", `id=eq.${c.id}`, {
      tier:                  "none",
      bay_credits_remaining: 0,
      bay_credits_total:     0,
      renewal_date:          null,
      member_since:          null,
      cancellation_scheduled: false,
      pending_tier:          null,
    });
    await db.post("membership_history", {
      customer_id: c.id,
      action:      "cancelled",
      tier:        c.tier,
      amount:      0,
      date:        dateKey(new Date()),
    });
    await db.post("transactions", {
      customer_id:   c.id,
      description:   "Membership Ended Immediately — " + (TIERS.find(t => t.id === c.tier)?.n || c.tier) + " Plan",
      date:          dateKey(new Date()),
      amount:        0,
      payment_label: "Admin",
    });
    await logActivity?.(`Ended membership immediately for ${cn(c)} (was ${c.tier})`);
    fire(`${cn(c)}'s membership ended.`);
    setSaving(false);
    setEndModal(null);
    reload();
  };

  /* ── Switch membership tier ── */
  const switchTier = async () => {
    if (!switchModal) return;
    setSaving(true);
    const { cust: c, toTier } = switchModal;
    const newT = TIERS.find(t => t.id === toTier);
    // Set pending_tier — takes effect at next renewal (mirrors customer app logic)
    await db.patch("customers", `id=eq.${c.id}`, { pending_tier: toTier });
    await db.post("membership_history", {
      customer_id: c.id,
      action:      "switch_scheduled",
      tier:        toTier,
      amount:      0,
      date:        dateKey(new Date()),
    });
    await logActivity?.(`Scheduled tier switch for ${cn(c)}: ${c.tier} → ${toTier} effective ${c.renewal_date}`);
    fire(`Switch to ${newT?.n} scheduled for ${c.renewal_date}`);
    setSaving(false);
    setSwitchModal(null);
    reload();
  };

  /* ── Load transactions for a member ── */
  const openTxns = async (cust) => {
    setTxnModal({ cust, txns: [] });
    setLoadingTxns(true);
    const all = await db.get("transactions", `customer_id=eq.${cust.id}&select=*&order=date.desc&limit=200`);
    const txns = (all || []).filter(t => {
      const desc = (t.description || "").toLowerCase();
      // Exclude lesson credit transactions (not bay credits)
      if (desc.includes("hour package") || desc.includes("-hour package")) return false;
      if (desc.startsWith("lesson ·") || desc.startsWith("lesson booking")) return false;
      if (desc.includes("late cancellation fee")) return false;
      if (desc.includes("cancellation (no refund)")) return false;
      // Include bay-credit-affecting events
      return desc.includes("bay booking") ||
             desc.includes("membership") ||
             desc.includes("refund") ||
             desc.includes("credit") ||
             desc.includes("admin credit") ||
             desc.includes("cancellation ·");
    });
    setTxnModal({ cust, txns });
    setLoadingTxns(false);
  };

  /* ── Adjust credits ── */
  const adjustCredits = async (cust, delta) => {
    const cur  = cust.bay_credits_remaining || 0;
    const max  = cust.bay_credits_total || 8;
    const next = Math.min(max, Math.max(0, Math.round((cur + delta) * 10) / 10));
    if (next === cur) return;
    await db.patch("customers", `id=eq.${cust.id}`, { bay_credits_remaining: next });
    await db.post("transactions", {
      customer_id:   cust.id,
      description:   `Admin Credit Adjustment (${delta > 0 ? "+" : ""}${delta} hr)`,
      date:          dateKey(new Date()),
      amount:        0,
      payment_label: "Admin",
    });
    reload();
  };

  /* ── Derived: is the Add Member button enabled? ── */
  const canAdd = memModal?.tier && memModal?.renewalDate &&
    (memModal?.cust || (memModal?.newCust && memModal?.firstName && memModal?.phone));

  return (
    <div style={S.pad}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Members ({members.length})</h2>
        <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={() => setMemModal({ newCust: false })}>
          {X.plus(14)} Add Member
        </button>
      </div>

      {/* Tier toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#f0f0ee", borderRadius: 12, padding: 3 }}>
        {TIERS.map(t => {
          const count  = members.filter(c => c.tier === t.id).length;
          const active = !showFormer && memTier === t.id;
          return (
            <button
              key={t.id}
              style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", background: active ? t.c : "transparent", color: active ? "#fff" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, textAlign: "center" }}
              onClick={() => { setShowFormer(false); setMemTier(t.id); }}
            >
              <span style={{ display: "block" }}>{t.badge}</span>
              <span style={{ display: "block", fontSize: 10, fontWeight: 400, marginTop: 2 }}>{count}</span>
            </button>
          );
        })}
        <button
          style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", background: showFormer ? "#555" : "transparent", color: showFormer ? "#fff" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, textAlign: "center" }}
          onClick={() => { setShowFormer(true); loadFormerMembers(); }}
        >
          <span style={{ display: "block" }}>FMRS</span>
          <span style={{ display: "block", fontSize: 10, fontWeight: 400, marginTop: 2 }}>Former</span>
        </button>
      </div>

      {/* ── Former Members View ── */}
      {showFormer && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: "#888" }}>Customers who had a membership and cancelled</p>
            <button style={{ ...S.b1, width: "auto", padding: "6px 12px", fontSize: 11, background: "#888" }} onClick={loadFormerMembers}>↻ Refresh</button>
          </div>
          {formerLoad ? (
            <p style={{ color: "#aaa", fontSize: 13 }}>Loading...</p>
          ) : formerList.length === 0 ? (
            <div style={S.empty}>No former members found.</div>
          ) : (
            formerList.map((h, i) => {
              const cust = customers.find(c => c.id === h.customer_id);
              const tierInfo = TIERS.find(t => t.id === h.tier);
              const cancelDate = h.created_at ? new Date(h.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#fff", border: "1px solid #e8e8e6", borderRadius: 12, marginBottom: 6 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#f0f0ee", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, fontFamily: mono, color: "#888", flexShrink: 0 }}>
                    {cust ? (cust.first_name?.[0] || "") + (cust.last_name?.[0] || "") : "?"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{cust ? cn(cust) : "Unknown Customer"}</p>
                    <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{cust?.phone || ""}{cust?.email ? " · " + cust.email : ""}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-block", background: (tierInfo?.c || "#888") + "20", color: tierInfo?.c || "#888", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, fontFamily: mono, marginBottom: 4 }}>
                      {tierInfo?.badge || h.tier?.toUpperCase() || "MBR"}
                    </span>
                    <p style={{ fontSize: 11, color: "#aaa" }}>Cancelled {cancelDate}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tier info bar */}
      {!showFormer && activeTier && (
        <div style={{ background: activeTier.c + "10", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: activeTier.c }}>{activeTier.n}</span>
            <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>${activeTier.p}/mo</span>
          </div>
          <span style={{ fontSize: 12, color: "#888" }}>{tierMembers.length} member{tierMembers.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Member list */}
      {!showFormer && tierMembers.length === 0 ? (
        <div style={S.empty}><p>No {activeTier?.n} members yet</p></div>
      ) : !showFormer ? (
        tierMembers.map(c => (
          <div key={c.id} style={S.cR}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: activeTier.c + "18", color: activeTier.c, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, fontFamily: mono, flexShrink: 0 }}>
              {(c.first_name || "?")[0]}{(c.last_name || "?")[0]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{cn(c)}</p>
              <p style={{ fontSize: 11, color: "#888" }}>{c.phone || ""}</p>
              {c.member_since  && <p style={{ fontSize: 10, color: "#aaa" }}>Since {c.member_since}</p>}
              {c.cancellation_scheduled
                ? <p style={{ fontSize: 10, color: "#E8890C", fontWeight: 600 }}>Ends {c.credits_valid_until || c.renewal_date}</p>
                : c.renewal_date && <p style={{ fontSize: 10, color: "#aaa" }}>Renews {c.renewal_date}</p>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              {(memTier === "player" || memTier === "early_birdie") && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: activeTier.c, fontFamily: mono }}>
                    {memTier === "early_birdie" ? "Unlimited (7am–4pm)" : (c.bay_credits_remaining || 0) + "/" + activeTier.hrs + " hrs"}
                  </span>
                  <button
                    style={{ fontSize: 10, color: activeTier.c, background: "none", border: "1px solid #e8e8e6", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}
                    onClick={() => setCreditModal({ cust: c })}
                  >
                    Adjust
                  </button>
                </div>
              )}
              {memTier === "champion" && (
                <p style={{ fontSize: 12, fontWeight: 700, color: activeTier.c }}>∞</p>
              )}
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  style={{ fontSize: 10, color: "#888", background: "none", border: "1px solid #e8e8e6", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}
                  onClick={() => openTxns(c)}
                >
                  History
                </button>
                {!c.cancellation_scheduled && (
                  <button
                    style={{ fontSize: 10, color: "#5B6DCD", background: "none", border: "1px solid #5B6DCD44", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}
                    onClick={() => setSwitchModal({ cust: c, toTier: null })}
                  >
                    Switch
                  </button>
                )}
                {!c.cancellation_scheduled && (
                  <button
                    style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}
                    onClick={() => setCancelModal(c)}
                  >
                    Cancel
                  </button>
                )}
                <button
                  style={{ fontSize: 10, color: "#fff", background: RED, border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}
                  onClick={() => setEndModal({ cust: c, step: 1, confirmText: "" })}
                >
                  End Now
                </button>
              </div>
            </div>
          </div>
        ))
      ) : null}

      {/* Perks */}
      {!showFormer && activeTier && (
        <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, padding: 16, marginTop: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Perks</p>
          {activeTier.perks.map(p => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
              <span style={{ color: activeTier.c }}>{X.chk(14)}</span>
              <span style={{ fontSize: 12 }}>{p}</span>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
          ADD MEMBER MODAL
      ══════════════════════════════════════ */}
      {memModal !== null && (
        <div style={S.ov} onClick={() => { setMemModal(null); setSearch(""); }}>
          <div style={S.mod} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Add Member</h3>

            {/* Customer mode toggle */}
            <label style={GS.label}>CUSTOMER</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <button
                style={{ ...GS.togBtn, flex: 1, ...(!memModal.newCust ? { background: GREEN, color: "#fff", borderColor: GREEN } : {}) }}
                onClick={() => setMemModal(p => ({ ...p, newCust: false, cust: null, firstName: "", lastName: "", phone: "", email: "" }))}
              >
                Existing Customer
              </button>
              <button
                style={{ ...GS.togBtn, flex: 1, ...(memModal.newCust ? { background: GREEN, color: "#fff", borderColor: GREEN } : {}) }}
                onClick={() => setMemModal(p => ({ ...p, newCust: true, cust: null }))}
              >
                New Customer
              </button>
            </div>

            {/* Existing customer search */}
            {!memModal.newCust && !memModal.cust && (
              <>
                <input
                  style={{ ...GS.input, marginBottom: 4 }}
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                {search && (
                  <div style={{ border: "1px solid #e8e8e6", borderRadius: 8, marginTop: 0, maxHeight: 180, overflowY: "auto", marginBottom: 12 }}>
                    {customers
                      .filter(c => (!c.tier || c.tier === "none") &&
                        (cn(c).toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search)))
                      .slice(0, 10)
                      .map(c => (
                        <div
                          key={c.id}
                          style={{ padding: "8px 12px", borderBottom: "1px solid #f2f2f0", cursor: "pointer", fontSize: 13 }}
                          onClick={() => { setMemModal(p => ({ ...p, cust: c })); setSearch(""); }}
                        >
                          <span style={{ fontWeight: 600 }}>{cn(c)}</span>
                          <span style={{ color: "#888", fontSize: 11, marginLeft: 6 }}>{c.phone}</span>
                        </div>
                      ))}
                    {customers.filter(c => (!c.tier || c.tier === "none") &&
                      (cn(c).toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search))).length === 0 && (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: "#aaa" }}>No non-member customers found</div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Selected existing customer chip */}
            {!memModal.newCust && memModal.cust && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 12px", background: GREEN + "10", borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{cn(memModal.cust)}</span>
                <button
                  style={{ marginLeft: "auto", fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => setMemModal(p => ({ ...p, cust: null }))}
                >
                  Change
                </button>
              </div>
            )}

            {/* New customer form */}
            {memModal.newCust && (
              <div style={{ background: "#fafaf8", border: "1px solid #e8e8e6", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...GS.label, fontSize: 10 }}>FIRST NAME *</label>
                    <input style={GS.input} value={memModal.firstName || ""} onChange={e => setMemModal(p => ({ ...p, firstName: e.target.value }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...GS.label, fontSize: 10 }}>LAST NAME</label>
                    <input style={GS.input} value={memModal.lastName || ""} onChange={e => setMemModal(p => ({ ...p, lastName: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...GS.label, fontSize: 10 }}>PHONE *</label>
                    <input style={GS.input} placeholder="3051234567" value={memModal.phone || ""} onChange={e => setMemModal(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...GS.label, fontSize: 10 }}>EMAIL</label>
                    <input style={GS.input} placeholder="optional" value={memModal.email || ""} onChange={e => setMemModal(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}

            {/* Plan + renewal date — shown once customer is identified */}
            {(memModal.cust || (memModal.newCust && memModal.firstName && memModal.phone)) && (
              <>
                <label style={GS.label}>SELECT PLAN</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {TIERS.map(t => (
                    <button
                      key={t.id}
                      style={{ ...GS.togBtn, flex: 1, ...(memModal.tier === t.id ? { background: t.c, color: "#fff" } : {}) }}
                      onClick={() => setMemModal(p => ({ ...p, tier: t.id }))}
                    >
                      <span style={{ display: "block", fontFamily: mono, fontSize: 11 }}>{t.badge}</span>
                      <span style={{ display: "block", fontSize: 11, marginTop: 2 }}>${t.p}/mo</span>
                    </button>
                  ))}
                </div>

                {memModal.tier && (
                  <div style={{ background: "#fafaf8", borderRadius: 10, padding: 12, marginBottom: 14 }}>
                    {(() => {
                      const t = TIERS.find(x => x.id === memModal.tier);
                      return (
                        <>
                          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t.n} — ${t.p}/mo</p>
                          {t.perks.map(p => (
                            <div key={p} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                              <span style={{ color: t.c }}>{X.chk(12)}</span>
                              <span style={{ fontSize: 11, color: "#555" }}>{p}</span>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}

                <label style={GS.label}>RENEWAL DATE *</label>
                <input
                  type="date"
                  style={{ ...GS.input, marginBottom: 16 }}
                  min={dateKey(new Date(Date.now() + 86400000))}
                  value={memModal.renewalDate || ""}
                  onChange={e => setMemModal(p => ({ ...p, renewalDate: e.target.value }))}
                />
                {!memModal.renewalDate && (
                  <p style={{ fontSize: 11, color: "#E8890C", marginTop: -12, marginBottom: 12 }}>
                    A renewal date is required to add a member.
                  </p>
                )}

                <button
                  style={{ ...S.b1, opacity: canAdd ? 1 : 0.35 }}
                  disabled={!canAdd || saving}
                  onClick={addMember}
                >
                  {saving ? "Adding..." : "Add Member"}
                </button>
              </>
            )}

            <button style={{ ...GS.togBtn, width: "100%", marginTop: 8 }} onClick={() => { setMemModal(null); setSearch(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          TRANSACTION HISTORY MODAL
      ══════════════════════════════════════ */}
      {txnModal && (
        <div style={S.ov} onClick={() => setTxnModal(null)}>
          <div style={{ ...S.mod, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{cn(txnModal.cust)}</h3>
                <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Transaction History</p>
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }} onClick={() => setTxnModal(null)}><span style={{ fontSize: 18, lineHeight: 1 }}>×</span></button>
            </div>
            {loadingTxns ? (
              <p style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "20px 0" }}>Loading...</p>
            ) : txnModal.txns.length === 0 ? (
              <p style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "20px 0" }}>No transactions found</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {txnModal.txns.map((t, i) => {
                  const desc = (t.description || "").toLowerCase();
                  // Derive credit impact from description
                  let creditImpact = null;
                  if (desc.includes("player membership") || desc.includes("player plan")) {
                    creditImpact = { label: "+8 hrs", positive: true };
                  } else if (desc.includes("champion membership") || desc.includes("champion plan")) {
                    creditImpact = { label: "Unlimited", positive: true };
                  } else if (desc.includes("early birdie membership") || desc.includes("early birdie plan")) {
                    creditImpact = { label: "Unlimited (7am–4pm)", positive: true };
                  } else if (desc.includes("starter membership") || desc.includes("starter plan")) {
                    creditImpact = { label: "No credits", positive: null };
                  } else if (desc.includes("membership")) {
                    creditImpact = { label: "Credits granted", positive: true };
                  } else if (desc.includes("bay booking")) {
                    // Extract duration from description if possible, otherwise -1
                    creditImpact = { label: "-1 hr", positive: false };
                  } else if (desc.includes("refund (credits)")) {
                    const hrs = Number(t.amount || 0);
                    creditImpact = { label: "+" + (hrs % 1 === 0 ? hrs : hrs.toFixed(1)) + " hr" + (hrs !== 1 ? "s" : "") + " returned", positive: true };
                  } else if (desc.includes("admin credit adjustment")) {
                    // Extract delta from description e.g. "(+0.5 hr)"
                    const match = t.description.match(/\(([+-][0-9.]+) hr\)/);
                    creditImpact = match
                      ? { label: match[1] + " hr", positive: Number(match[1]) > 0 }
                      : { label: "Adjusted", positive: null };
                  } else if (desc.includes("credits deducted")) {
                    const match = t.description.match(/([0-9.]+) hr/);
                    creditImpact = match
                      ? { label: "-" + match[1] + " hrs", positive: false }
                      : { label: "Credits deducted", positive: false };
                  } else if (desc.includes("cancellation ·") && !desc.includes("no refund")) {
                    const hrs = Number(t.amount || 0);
                    const label = hrs > 0
                      ? "+" + (hrs % 1 === 0 ? hrs : hrs.toFixed(1)) + " hr" + (hrs !== 1 ? "s" : "") + " returned"
                      : "+credits returned";
                    creditImpact = { label, positive: true };
                  }
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f2f2f0" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>{t.description || "Transaction"}</p>
                        <p style={{ fontSize: 11, color: "#888" }}>{t.date}</p>
                      </div>
                      {creditImpact && (
                        <span style={{
                          fontSize: 13, fontWeight: 700, fontFamily: mono,
                          color: creditImpact.positive === true ? GREEN : creditImpact.positive === false ? RED : "#888",
                        }}>
                          {creditImpact.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          CREDIT ADJUSTMENT MODAL
      ══════════════════════════════════════ */}
      {creditModal && (() => {
        const c = creditModal.cust;
        const cur = c.bay_credits_remaining || 0;
        const max = c.bay_credits_total || 8;
        const deltas = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];
        return (
          <div style={S.ov} onClick={() => setCreditModal(null)}>
            <div style={{ ...S.mod, maxWidth: 360 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Adjust Credits</h3>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>{cn(c)} · {cur}/{max} hrs remaining</p>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 8, display: "block" }}>SELECT ADJUSTMENT</label>
              <select
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e8e8e6", borderRadius: 10, fontSize: 14, fontFamily: ff, color: "#1a1a1a", background: "#fff", marginBottom: 16 }}
                defaultValue=""
                onChange={async e => {
                  const delta = Number(e.target.value);
                  if (!delta) return;
                  await adjustCredits(c, delta);
                  setCreditModal(null);
                }}
              >
                <option value="" disabled>Choose amount...</option>
                {deltas.filter(d => {
                  const next = Math.round((cur + d) * 10) / 10;
                  return next >= 0 && next <= max;
                }).map(d => (
                  <option key={d} value={d}>
                    {d > 0 ? "+" : ""}{d} hr{Math.abs(d) !== 1 ? "s" : ""} → {Math.round((cur + d) * 10) / 10} remaining
                  </option>
                ))}
              </select>
              <button style={{ ...GS.togBtn, width: "100%" }} onClick={() => setCreditModal(null)}>Cancel</button>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════
          CANCEL CONFIRMATION MODAL
      ══════════════════════════════════════ */}
      {cancelModal && (
        <div style={S.ov} onClick={() => setCancelModal(null)}>
          <div style={{ ...S.mod, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: RED + "18", color: RED, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {X.warn(20)}
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Cancel Membership</h3>
                <p style={{ fontSize: 12, color: "#888" }}>{cn(cancelModal)}</p>
              </div>
            </div>
            {(() => {
              const today = new Date();
              const renewal = cancelModal.renewal_date ? new Date(cancelModal.renewal_date + "T12:00:00") : null;
              const daysToRenew = renewal ? Math.ceil((renewal - today) / (1000 * 60 * 60 * 24)) : 999;
              const within7 = daysToRenew <= 7;
              const nextRenewal = renewal ? new Date(new Date(renewal).setMonth(renewal.getMonth() + 1)) : null;
              return (
                <div style={{ background: "#fafaf8", borderRadius: 10, padding: 12, marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
                    {within7
                      ? `Renewal is in ${daysToRenew} day${daysToRenew !== 1 ? "s" : ""} — one final billing cycle will run. Membership and credits remain active until ${nextRenewal ? dateKey(nextRenewal) : "—"}.`
                      : `Renewal is in ${daysToRenew} days. Membership and credits remain active until ${cancelModal.renewal_date}.`}
                  </p>
                  <p style={{ fontSize: 11, color: "#aaa" }}>The member will not be charged or renewed after that date.</p>
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...S.bDanger, flex: 1 }} onClick={cancelMembership} disabled={saving}>
                {saving ? "Cancelling..." : "Yes, Cancel Membership"}
              </button>
              <button style={{ ...GS.togBtn, padding: "12px 16px" }} onClick={() => setCancelModal(null)}>Keep</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          END MEMBERSHIP NOW MODAL (Step 1)
      ══════════════════════════════════════ */}
      {endModal?.step === 1 && (
        <div style={S.ov} onClick={() => setEndModal(null)}>
          <div style={{ ...S.mod, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: RED + "18", color: RED, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {X.warn(20)}
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>End Membership Immediately?</h3>
                <p style={{ fontSize: 12, color: "#888" }}>{cn(endModal.cust)}</p>
              </div>
            </div>
            <div style={{ background: "#FFF0F0", border: "1px solid #E0392822", borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: RED, marginBottom: 6 }}>This cannot be undone.</p>
              <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
                The membership will be terminated <strong>right now</strong>. All bay credits are removed immediately and the customer loses access instantly — not at their renewal date.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...GS.togBtn, flex: 1, padding: "12px 16px" }} onClick={() => setEndModal(null)}>Keep Active</button>
              <button style={{ ...S.bDanger, flex: 2 }} onClick={() => setEndModal(p => ({ ...p, step: 2 }))}>
                Yes, End Membership
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          END MEMBERSHIP NOW MODAL (Step 2 — type CONFIRM)
      ══════════════════════════════════════ */}
      {endModal?.step === 2 && (
        <div style={S.ov} onClick={() => setEndModal(null)}>
          <div style={{ ...S.mod, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: RED + "18", color: RED, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {X.warn(20)}
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Final Confirmation</h3>
                <p style={{ fontSize: 12, color: "#888" }}>{cn(endModal.cust)}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#555", marginBottom: 12, lineHeight: 1.5 }}>
              Type <strong style={{ fontFamily: mono, color: RED }}>CONFIRM</strong> below to permanently end this membership now.
            </p>
            <input
              style={{ ...GS.input, marginBottom: 16, borderColor: endModal.confirmText === "CONFIRM" ? RED : "#e8e8e6", fontFamily: mono, fontWeight: 700, letterSpacing: 2 }}
              placeholder="Type CONFIRM"
              value={endModal.confirmText}
              onChange={e => setEndModal(p => ({ ...p, confirmText: e.target.value }))}
              autoFocus
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...GS.togBtn, flex: 1, padding: "12px 16px" }} onClick={() => setEndModal(null)}>Cancel</button>
              <button
                style={{ ...S.bDanger, flex: 2, opacity: endModal.confirmText === "CONFIRM" ? 1 : 0.4 }}
                disabled={endModal.confirmText !== "CONFIRM" || saving}
                onClick={endMembershipNow}
              >
                {saving ? "Ending..." : "End Membership Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          SWITCH PLAN MODAL
      ══════════════════════════════════════ */}
      {switchModal && (() => {
        const c = switchModal.cust;
        const currentTierIdx = TIERS.findIndex(t => t.id === c.tier);
        const newT = TIERS.find(t => t.id === switchModal.toTier);
        const today = new Date(); today.setHours(0,0,0,0);
        const rd = c.renewal_date ? new Date(c.renewal_date + "T12:00:00") : null;
        const daysToRenewal = rd ? Math.ceil((rd - today) / 86400000) : 999;
        const within7 = daysToRenewal <= 7;
        return (
          <div style={S.ov} onClick={() => setSwitchModal(null)}>
            <div style={{ ...S.mod, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Switch Plan</h3>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
                {cn(c)} · Currently on <strong>{TIERS.find(t => t.id === c.tier)?.n || c.tier}</strong> · Renews {c.renewal_date || "—"}
              </p>

              {!switchModal.toTier ? (
                <>
                  <label style={GS.label}>SELECT NEW PLAN</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {TIERS.filter(t => t.id !== c.tier && t.id !== c.pending_tier).map((t, i) => {
                      const tIdx = TIERS.findIndex(x => x.id === t.id);
                      return (
                        <button
                          key={t.id}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#fff", border: "1.5px solid #e8e8e6", borderRadius: 12, cursor: "pointer", fontFamily: ff, textAlign: "left", width: "100%" }}
                          onClick={() => setSwitchModal(p => ({ ...p, toTier: t.id }))}
                        >
                          <span style={{ background: t.c, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, fontFamily: mono, letterSpacing: 1, flexShrink: 0 }}>{t.badge}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 600 }}>{t.n}</p>
                            <p style={{ fontSize: 11, color: "#888" }}>${t.p}/mo</p>
                          </div>
                          <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600, flexShrink: 0 }}>
                            {tIdx > currentTierIdx ? "Upgrade ↑" : "Downgrade ↓"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button style={{ ...GS.togBtn, width: "100%" }} onClick={() => setSwitchModal(null)}>Cancel</button>
                </>
              ) : (
                <>
                  {within7 ? (
                    <div style={{ background: "#FFF5E5", border: "1px solid #E8890C44", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#E8890C", marginBottom: 6 }}>Within 7 Days of Renewal</p>
                      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                        Renewal is in {daysToRenewal} day{daysToRenewal !== 1 ? "s" : ""}. The switch to <strong>{newT?.n}</strong> will be scheduled for the next renewal date to avoid billing conflicts.
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: "#F0F7F4", border: "1px solid #4A8B6E22", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                        The customer stays on their current plan until <strong>{c.renewal_date}</strong>. On that date they automatically switch to <strong>{newT?.n}</strong> (${newT?.p}/mo).
                      </p>
                    </div>
                  )}
                  <div style={{ background: "#fafaf8", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                    {[
                      ["Current plan", TIERS.find(t => t.id === c.tier)?.n || c.tier],
                      ["New plan",     `${newT?.n} ($${newT?.p}/mo)`],
                      ["Effective",    c.renewal_date || "Next renewal"],
                    ].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "#888" }}>{l}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={{ ...GS.togBtn, padding: "12px 16px" }} onClick={() => setSwitchModal(p => ({ ...p, toTier: null }))}>← Back</button>
                    <button
                      style={{ ...S.b1, flex: 2, background: newT?.c }}
                      disabled={saving}
                      onClick={switchTier}
                    >
                      {saving ? "Saving..." : `Confirm Switch to ${newT?.n}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}

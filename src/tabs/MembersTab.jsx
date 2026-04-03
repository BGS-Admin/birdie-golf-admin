import React, { useState } from "react";
import { db } from "../lib/db.js";
import { sq } from "../lib/square.js";
import { GREEN, RED, TC, TB, TIERS, mono, ff, cn, dateKey, X, S, GS } from "../lib/constants.jsx";

export default function MembersTab({ customers, fire, reload }) {
  const [memTier,     setMemTier]     = useState("player");
  const [memModal,    setMemModal]    = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [search,      setSearch]      = useState("");
  const [saving,      setSaving]      = useState(false);
  const [txnModal,    setTxnModal]    = useState(null); // { cust, txns }
  const [loadingTxns, setLoadingTxns] = useState(false);

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
  const cancelMembership = async () => {
    if (!cancelModal) return;
    setSaving(true);
    await db.patch("customers", `id=eq.${cancelModal.id}`, {
      tier: "none",
      bay_credits_remaining: 0,
    });
    await db.post("membership_history", {
      customer_id: cancelModal.id,
      action:      "cancel",
      tier:        cancelModal.tier,
      amount:      0,
      date:        dateKey(new Date()),
    });
    fire("Membership cancelled for " + cn(cancelModal));
    setSaving(false);
    setCancelModal(null);
    reload();
  };

  /* ── Load transactions for a member ── */
  const CREDIT_KEYWORDS = [
    "membership", "bay booking", "lesson", "refund", "credit", "renewal", "admin"
  ];

  const openTxns = async (cust) => {
    setTxnModal({ cust, txns: [] });
    setLoadingTxns(true);
    const all = await db.get("transactions", `customer_id=eq.${cust.id}&select=*&order=date.desc&limit=200`);
    const txns = (all || []).filter(t => {
      const desc = (t.description || "").toLowerCase();
      return CREDIT_KEYWORDS.some(k => desc.includes(k));
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
          const active = memTier === t.id;
          return (
            <button
              key={t.id}
              style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", background: active ? t.c : "transparent", color: active ? "#fff" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, textAlign: "center" }}
              onClick={() => setMemTier(t.id)}
            >
              <span style={{ display: "block" }}>{t.badge}</span>
              <span style={{ display: "block", fontSize: 10, fontWeight: 400, marginTop: 2 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Tier info bar */}
      {activeTier && (
        <div style={{ background: activeTier.c + "10", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: activeTier.c }}>{activeTier.n}</span>
            <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>${activeTier.p}/mo</span>
          </div>
          <span style={{ fontSize: 12, color: "#888" }}>{tierMembers.length} member{tierMembers.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Member list */}
      {tierMembers.length === 0 ? (
        <div style={S.empty}><p>No {activeTier?.n} members yet</p></div>
      ) : (
        tierMembers.map(c => (
          <div key={c.id} style={S.cR}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: activeTier.c + "18", color: activeTier.c, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, fontFamily: mono, flexShrink: 0 }}>
              {(c.first_name || "?")[0]}{(c.last_name || "?")[0]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{cn(c)}</p>
              <p style={{ fontSize: 11, color: "#888" }}>{c.phone || ""}</p>
              {c.member_since  && <p style={{ fontSize: 10, color: "#aaa" }}>Since {c.member_since}</p>}
              {c.renewal_date  && <p style={{ fontSize: 10, color: "#aaa" }}>Renews {c.renewal_date}</p>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              {memTier === "player" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #e8e8e6", background: "#f8f8f6", fontSize: 15, fontWeight: 700, cursor: "pointer", lineHeight: 1, color: RED, fontFamily: ff }}
                    onClick={() => adjustCredits(c, -0.5)}
                  >-</button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: activeTier.c, fontFamily: mono, minWidth: 52, textAlign: "center" }}>
                    {c.bay_credits_remaining || 0}/{activeTier.hrs}
                  </span>
                  <button
                    style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #e8e8e6", background: "#f8f8f6", fontSize: 15, fontWeight: 700, cursor: "pointer", lineHeight: 1, color: activeTier.c, fontFamily: ff }}
                    onClick={() => adjustCredits(c, 0.5)}
                  >+</button>
                </div>
              )}
              {memTier === "champion" && (
                <p style={{ fontSize: 12, fontWeight: 700, color: activeTier.c }}>\u221e</p>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  style={{ fontSize: 10, color: "#888", background: "none", border: "1px solid #e8e8e6", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}
                  onClick={() => openTxns(c)}
                >
                  History
                </button>
                <button
                  style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}
                  onClick={() => setCancelModal(c)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Perks */}
      {activeTier && (
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
                {txnModal.txns.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f2f2f0" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{t.description || "Transaction"}</p>
                      <p style={{ fontSize: 11, color: "#888" }}>{t.date} · {t.payment_label || "—"}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: Number(t.amount) < 0 ? "#E03928" : "#1a1a1a", fontFamily: mono }}>
                      {Number(t.amount) < 0 ? "-" : ""}${Math.abs(Number(t.amount || 0)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
            <p style={{ fontSize: 13, color: "#555", marginBottom: 20 }}>
              This will immediately remove their {cancelModal.tier} membership and zero out their bay credits. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...S.bDanger, flex: 1 }} onClick={cancelMembership} disabled={saving}>
                {saving ? "Cancelling..." : "Yes, Cancel Membership"}
              </button>
              <button style={{ ...GS.togBtn, padding: "12px 16px" }} onClick={() => setCancelModal(null)}>Keep</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

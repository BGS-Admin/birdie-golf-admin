import React, { useState } from "react";
import { db } from "../lib/db.js";
import { GREEN, RED, TC, TB, TIERS, mono, ff, cn, dateKey, X, S, GS } from "../lib/constants.jsx";

export default function MembersTab({ customers, fire, reload }) {
  const [memTier,   setMemTier]   = useState("player");
  const [memModal,  setMemModal]  = useState(null);   // { cust?, tier? }
  const [cancelModal, setCancelModal] = useState(null); // customer to cancel
  const [search,    setSearch]    = useState("");
  const [saving,    setSaving]    = useState(false);

  const members     = customers.filter(c => c.tier && c.tier !== "none");
  const tierMembers = members.filter(c => c.tier === memTier);
  const activeTier  = TIERS.find(t => t.id === memTier);

  /* ── Add member ── */
  const addMember = async () => {
    if (!memModal?.cust || !memModal?.tier) return;
    setSaving(true);
    const t = TIERS.find(x => x.id === memModal.tier);
    await db.patch("customers", `id=eq.${memModal.cust.id}`, {
      tier: memModal.tier,
      bay_credits_remaining: t.hrs === -1 ? 999 : t.hrs,
      bay_credits_total:     t.hrs === -1 ? 999 : t.hrs,
      member_since:          dateKey(new Date()),
    });
    await db.post("membership_history", {
      customer_id: memModal.cust.id,
      action: "join",
      tier:   memModal.tier,
      amount: t.p,
      date:   dateKey(new Date()),
    });
    await db.post("transactions", {
      customer_id:   memModal.cust.id,
      description:   t.n + " Membership",
      date:          dateKey(new Date()),
      amount:        t.p,
      payment_label: "Admin",
    });
    fire(cn(memModal.cust) + " added as " + t.n + " \u2713");
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
      action: "cancel",
      tier:   cancelModal.tier,
      amount: 0,
      date:   dateKey(new Date()),
    });
    fire("Membership cancelled for " + cn(cancelModal));
    setSaving(false);
    setCancelModal(null);
    reload();
  };

  return (
    <div style={S.pad}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Members ({members.length})</h2>
        <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={() => setMemModal({})}>
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
              {c.member_since && <p style={{ fontSize: 10, color: "#aaa" }}>Since {c.member_since}</p>}
            </div>
            <div style={{ textAlign: "right" }}>
              {memTier === "player" && (
                <p style={{ fontSize: 12, fontWeight: 700, color: activeTier.c, fontFamily: mono }}>
                  {c.bay_credits_remaining || 0}/{activeTier.hrs} hrs
                </p>
              )}
              {memTier === "champion" && (
                <p style={{ fontSize: 12, fontWeight: 700, color: activeTier.c }}>\u221e</p>
              )}
              <button
                style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontWeight: 600, marginTop: 4 }}
                onClick={() => setCancelModal(c)}
              >
                Cancel
              </button>
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

      {/* ── Add Member Modal ── */}
      {memModal !== null && (
        <div style={S.ov} onClick={() => { setMemModal(null); setSearch(""); }}>
          <div style={S.mod} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Add Member</h3>

            {!memModal.cust ? (
              <>
                <label style={GS.label}>SEARCH CUSTOMER</label>
                <input
                  style={GS.input}
                  placeholder="Name or phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                {search && (
                  <div style={{ border: "1px solid #e8e8e6", borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: "auto" }}>
                    {customers
                      .filter(c => (!c.tier || c.tier === "none") &&
                        (cn(c).toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search)))
                      .slice(0, 10)
                      .map(c => (
                        <div
                          key={c.id}
                          style={{ padding: "8px 12px", borderBottom: "1px solid #f2f2f0", cursor: "pointer", fontSize: 13 }}
                          onClick={() => { setMemModal({ cust: c }); setSearch(""); }}
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
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px", background: GREEN + "10", borderRadius: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{cn(memModal.cust)}</span>
                  <button style={{ marginLeft: "auto", fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }}
                    onClick={() => setMemModal({})}>Change</button>
                </div>

                <label style={GS.label}>SELECT PLAN</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
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

                <button
                  style={{ ...S.b1, opacity: memModal.tier ? 1 : 0.35 }}
                  disabled={!memModal.tier || saving}
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

      {/* ── Cancel Confirmation Modal ── */}
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

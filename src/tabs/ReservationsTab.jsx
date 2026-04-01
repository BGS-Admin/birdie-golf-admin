import React, { useState, useCallback } from "react";
import { db } from "../lib/db.js";
import { sq } from "../lib/square.js";
import {
  GREEN, PURPLE, RED, ORANGE, mono, ff,
  TC, TB, BK_C, SLOTS, DUR_MAP, DUR_LABELS, slotsToLabel,
  toH, dateKey, fmtFull, addDays, getSlots, cn,
  X, GS, S,
} from "../lib/constants.jsx";

export default function ReservationsTab({ customers, bookings, bayBlocks, cfg, fire, reload }) {
  const [resDate,      setResDate]      = useState(new Date());
  const [selB,         setSelB]         = useState(null);
  const [custSearch,   setCustSearch]   = useState("");
  const [custCards,    setCustCards]    = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [actionModal,  setActionModal]  = useState(null); // "cancel_options" | "refund" | "noshow"
  const [saving,       setSaving]       = useState(false);

  const closeModal = useCallback(() => {
    setSelB(null); setCustSearch(""); setCustCards([]); setActionModal(null);
  }, []);

  const loadCards = useCallback(async (custId) => {
    setLoadingCards(true);
    const cards = await db.get("payment_methods", `customer_id=eq.${custId}&select=*&order=is_default.desc`);
    setCustCards(cards || []);
    setLoadingCards(false);
  }, []);

  /* ── grid helpers ── */
  const slots       = getSlots(resDate);
  const isToday     = dateKey(resDate) === dateKey(new Date());
  const dayBookings = bookings.filter(b => b.date === dateKey(resDate) && b.status !== "cancelled");

  const getBkAt = (bay, slot) => {
    const si = SLOTS.indexOf(slot);
    return dayBookings.find(b => {
      if (b.bay !== bay) return false;
      const bsi = SLOTS.indexOf(b.start_time);
      return bsi >= 0 && si >= bsi && si < bsi + (b.duration_slots || 2);
    });
  };

  const getBkColor = (b) => {
    if (!b) return null;
    if (b.type === "lesson") return BK_C.lesson;
    const cust = customers.find(c => c.id === b.customer_id);
    return (cust?.tier && cust.tier !== "none") ? BK_C.bay_member : BK_C.bay_walkin;
  };

  const isBlocked = (bay, slot) => {
    const dk = dateKey(resDate);
    return bayBlocks.some(bl => {
      if (!(bl.bays || []).includes(bay)) return false;
      const from = bl.from_date || bl.from, to = bl.to_date || bl.to;
      if (dk < from || dk > to) return false;
      if (bl.all_day || bl.allDay) return true;
      const tf = bl.time_from || bl.timeFrom, tt = bl.time_to || bl.timeTo;
      if (!tf || !tt) return true;
      return toH(slot) >= toH(tf) && toH(slot) < toH(tt);
    });
  };

  /* ── rate calculator ── */
  const calcRate = (date, time) => {
    const d = new Date((date || dateKey(resDate)) + "T12:00:00");
    const isWk = d.getDay() === 0 || d.getDay() === 6;
    const hour = toH(time || "9:00 AM");
    const isPeak = !isWk && hour >= 17;
    return isPeak ? cfg.pk : cfg.op;
  };

  /* ── credit calculation for member ── */
  const getCreditInfo = (cust, durSlots) => {
    if (!cust || !cust.tier || cust.tier === "none" || cust.tier === "starter") return null;
    const avail  = cust.bay_credits_remaining || 0;
    const needed = durSlots * 0.5;
    const used   = Math.min(avail, needed);
    const remain = needed - used;
    return { avail, needed, used, remain };
  };

  const openNew = (bay, slot) => {
    const now = new Date();
    const isToday = dateKey(resDate) === dateKey(now);
    const currentH = now.getHours() + now.getMinutes() / 60;
    if (isToday && toH(slot) <= currentH) return;
    setSelB({ isNew: true, type: "bay", bay, time: slot, dur: "1h", date: dateKey(resDate), custId: null, custObj: null, cardId: null, useCredits: false, notes: "" });
    setCustCards([]); setCustSearch("");
  };

  const openExisting = (bk) => {
    const cust = customers.find(c => c.id === bk.customer_id);
    setSelB({ ...bk, isNew: false, custObj: cust || null, dur: slotsToLabel(bk.duration_slots), time: bk.start_time, notes: bk.admin_notes || "", cardId: null });
    if (cust) loadCards(cust.id);
    setCustSearch("");
  };

  /* ── create booking ── */
  const createBooking = async () => {
    const isNew = selB.isWalkIn;
    const info  = selB.newCustInfo || {};
    if (!selB.custId && !(isNew && info.firstName && info.phone)) return;
    setSaving(true);

    let custId  = selB.custId;
    let custObj = selB.custObj;

    if (isNew && !custId) {
      const phone = (info.phone || "").replace(/\D/g, "");
      const newRows = await db.post("customers", { first_name: info.firstName, last_name: info.lastName || "", phone, email: info.email || "", tier: "none" });
      const newCust = Array.isArray(newRows) ? newRows[0] : newRows;
      if (newCust?.id) {
        custId = newCust.id; custObj = newCust;
        const sqResult = await sq("customer.create", { first_name: info.firstName, last_name: info.lastName || "", phone, email: info.email || "", supabase_id: custId });
        const sqId = sqResult?.customer?.id;
        if (sqId) { await db.patch("customers", `id=eq.${custId}`, { square_customer_id: sqId }); custObj = { ...custObj, square_customer_id: sqId }; }
      }
    }

    const durSlots    = DUR_MAP[selB.dur] || 2;
    const isMember    = custObj?.tier && custObj.tier !== "none" && custObj.tier !== "starter";
    const useCredits  = selB.useCredits && isMember;
    const creditInfo  = useCredits ? getCreditInfo(custObj, durSlots) : null;
    const creditsUsed = creditInfo ? creditInfo.used : 0;
    const rate        = calcRate(selB.date, selB.time);
    const paidHrs     = useCredits && creditInfo ? creditInfo.remain : durSlots * 0.5;
    let amount        = selB.cardId && selB.cardId !== "in_person" ? paidHrs * rate : 0;

    let sqPaymentId = null;
    if (amount > 0 && selB.cardId && selB.cardId !== "in_person" && custObj?.square_customer_id) {
      const sqCard = custCards.find(c => c.id === selB.cardId);
      if (sqCard?.square_card_id) {
        const payment = await sq("payment.create", { square_customer_id: custObj.square_customer_id, card_id: sqCard.square_card_id, amount, note: `Bay ${selB.bay} \u00b7 ${selB.date || dateKey(resDate)}` });
        sqPaymentId = payment?.payment?.id || null;
      }
    }

    await db.post("bookings", {
      customer_id: custId || null, type: selB.type || "bay", bay: selB.bay || 1,
      date: selB.date || dateKey(resDate), start_time: selB.time || "9:00 AM",
      duration_slots: durSlots, status: "confirmed", amount,
      credits_used: creditsUsed, discount: 0,
      coach_name: selB.type === "lesson" ? (selB.coach_name || "") : "",
      admin_notes: selB.notes || "", square_payment_id: sqPaymentId,
    });

    if (creditsUsed > 0 && custObj?.id) {
      await db.patch("customers", `id=eq.${custObj.id}`, { bay_credits_remaining: Math.max(0, (custObj.bay_credits_remaining || 0) - creditsUsed) });
    }

    if (custId) {
      await db.post("transactions", {
        customer_id: custId,
        description: `${selB.type === "lesson" ? "Lesson" : "Bay"} Booking \u00b7 Bay ${selB.bay}`,
        date: selB.date || dateKey(new Date()), amount,
        payment_label: useCredits && creditsUsed > 0 && paidHrs === 0 ? "Credits" : selB.cardId === "in_person" ? "In Person" : selB.cardId ? "Card" : "Credits",
        square_payment_id: sqPaymentId,
      });
    }

    fire("Booking created \u2713");
    setSaving(false); closeModal(); reload();
  };

  /* ── save edits to existing booking ── */
  const saveEdits = async () => {
    setSaving(true);
    const durSlots = DUR_MAP[selB.dur] || selB.duration_slots || 2;
    await db.patch("bookings", `id=eq.${selB.id}`, {
      status: selB.status, bay: selB.bay,
      start_time: selB.time || selB.start_time,
      duration_slots: durSlots,
      admin_notes: selB.notes || "",
    });
    fire("Booking updated \u2713");
    setSaving(false); closeModal(); reload();
  };

  /* ── cancel without refund ── */
  const cancelNoRefund = async () => {
    setSaving(true);
    await db.patch("bookings", `id=eq.${selB.id}`, { status: "cancelled", cancelled_at: new Date().toISOString() });
    fire("Booking cancelled");
    setSaving(false); closeModal(); reload();
  };

  /* ── cancel + refund ── */
  const cancelWithRefund = async (asCredits) => {
    setSaving(true);
    await db.patch("bookings", `id=eq.${selB.id}`, { status: "cancelled", cancelled_at: new Date().toISOString() });
    const cust = selB.custObj;

    if (asCredits && cust) {
      const creditsBack = (selB.duration_slots || 2) * 0.5;
      await db.patch("customers", `id=eq.${cust.id}`, { bay_credits_remaining: (cust.bay_credits_remaining || 0) + creditsBack });
      await db.post("transactions", { customer_id: cust.id, description: `Refund (credits) \u00b7 Bay ${selB.bay}`, date: dateKey(new Date()), amount: 0, payment_label: "Credits" });
      fire(`Cancelled + ${creditsBack} credits refunded \u2713`);
    } else if (!asCredits && selB.square_payment_id) {
      await sq("payment.refund", { payment_id: selB.square_payment_id, amount: selB.amount || 0, reason: "Admin refund" });
      await db.post("transactions", { customer_id: selB.customer_id, description: `Refund \u00b7 Bay ${selB.bay}`, date: dateKey(new Date()), amount: -(selB.amount || 0), payment_label: "Refund" });
      fire("Cancelled + refund issued \u2713");
    } else {
      fire("Cancelled (no refund method on file)");
    }

    setSaving(false); closeModal(); reload();
  };

  /* ── no-show: cancel + charge no-show fee ── */
  const markNoShow = async () => {
    setSaving(true);
    const rate = calcRate(selB.date, selB.time);
    const fee  = (selB.duration_slots || 2) * 0.5 * rate;
    const cust = selB.custObj;

    await db.patch("bookings", `id=eq.${selB.id}`, { status: "cancelled", cancelled_at: new Date().toISOString(), admin_notes: (selB.notes || "") + "\n[No-show]" });

    let sqPaymentId = null;
    if (cust?.square_customer_id && custCards.length > 0) {
      const defaultCard = custCards.find(c => c.is_default) || custCards[0];
      if (defaultCard?.square_card_id) {
        const payment = await sq("payment.create", {
          square_customer_id: cust.square_customer_id,
          card_id: defaultCard.square_card_id,
          amount: fee,
          note: `No-show fee \u00b7 Bay ${selB.bay} \u00b7 ${selB.date}`,
        });
        sqPaymentId = payment?.payment?.id || null;
      }
    }

    if (selB.customer_id) {
      await db.post("transactions", {
        customer_id: selB.customer_id,
        description: `No-show fee \u00b7 Bay ${selB.bay}`,
        date: dateKey(new Date()), amount: fee,
        payment_label: sqPaymentId ? "Card" : "Pending",
        square_payment_id: sqPaymentId,
      });
    }

    fire(`No-show recorded · $${fee.toFixed(2)} fee charged`);
    setSaving(false); closeModal(); reload();
  };

  /* ── credit info for current modal state ── */
  const selCust        = selB?.custObj;
  const isMember       = selCust?.tier && selCust.tier !== "none" && selCust.tier !== "starter";
  const creditInfo     = (selB?.useCredits && isMember) ? getCreditInfo(selCust, DUR_MAP[selB?.dur] || 2) : null;
  const noShowFee      = selB ? (selB.duration_slots || 2) * 0.5 * calcRate(selB.date, selB.time) : 0;

  return (
    <div style={{ padding: "20px 20px 40px", overflowX: "auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={S.navArr} onClick={() => setResDate(addDays(resDate, -1))}>{X.chevL(18)}</button>
          <div style={{ textAlign: "center", minWidth: 200 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{fmtFull(resDate)}</h2>
            {isToday && <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, background: GREEN + "14", padding: "2px 8px", borderRadius: 6 }}>TODAY</span>}
          </div>
          <button style={S.navArr} onClick={() => setResDate(addDays(resDate, 1))}>{X.chevR(18)}</button>
          <button style={{ ...S.navArr, fontSize: 11, width: "auto", padding: "0 12px" }} onClick={() => setResDate(new Date())}>Today</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12, background: "#4A6FA5" }} onClick={reload}>
            ↻ Refresh
          </button>
          <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={() => openNew(1, "9:00 AM")}>
            {X.plus(14)} New Booking
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
        {[{ l: "Member Bay", c: BK_C.bay_member }, { l: "Walk-in Bay", c: BK_C.bay_walkin }, { l: "Lesson", c: BK_C.lesson }, { l: "Blocked", c: RED }].map(x => (
          <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: x.c }} />
            <span style={{ fontSize: 10, color: "#888" }}>{x.l}</span>
          </div>
        ))}
      </div>

      {/* ── Bay Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "80px repeat(5,1fr)", border: "1px solid #e8e8e6", borderRadius: 12, overflow: "hidden", background: "#fff", minWidth: 700 }}>
        <div style={GS.hdr}><span style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>TIME</span></div>
        {[1,2,3,4,5].map(b => <div key={b} style={GS.hdr}><span style={{ fontSize: 13, fontWeight: 700 }}>Bay {b}</span></div>)}

        {(() => {
          const renderedPerBay = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
          return slots.map(slot => (
            <React.Fragment key={slot}>
              <div style={GS.timeCell}><span style={{ fontSize: 11, color: "#888", fontFamily: mono }}>{slot}</span></div>
              {[1,2,3,4,5].map(bay => {
                const bk      = getBkAt(bay, slot);
                const blocked = isBlocked(bay, slot);
                const color   = getBkColor(bk);
                const bkKey   = bk?.id;
                const rendered = renderedPerBay[bay];

                if (bk && !rendered.has(bkKey)) {
                  rendered.add(bkKey);
                  const cust  = customers.find(c => c.id === bk.customer_id);
                  const name  = cust ? cn(cust) : "Walk-in";
                  const isMem = cust?.tier && cust.tier !== "none";
                  const h     = (bk.duration_slots || 2) * 29 - 2;
                  return (
                    <div key={bay} style={{ ...GS.cell, position: "relative" }}>
                      <div style={{ ...GS.booking, background: color + "20", borderLeft: `3px solid ${color}`, height: h, cursor: "pointer", zIndex: 3 }} onClick={() => openExisting(bk)}>
                        <p style={{ fontSize: 10, fontWeight: 700, color, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{name}</p>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 1 }}>
                          {isMem && <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", background: TC[cust.tier], padding: "1px 4px", borderRadius: 3, fontFamily: mono }}>{TB[cust.tier]}</span>}
                          {bk.type === "lesson" && bk.coach_name && <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", background: PURPLE, padding: "1px 4px", borderRadius: 3, fontFamily: mono }}>{bk.coach_name.split(" ").map(w => w[0]).join("")}</span>}
                          <span style={{ fontSize: 9, color: "#888" }}>{(bk.duration_slots || 2) * 0.5}hr</span>
                          {bk.credits_used > 0 && <span style={{ fontSize: 7, fontWeight: 700, color: GREEN, background: GREEN + "18", padding: "1px 4px", borderRadius: 3 }}>CR</span>}
                        </div>
                      </div>
                    </div>
                  );
                }
                if (bk && rendered.has(bkKey)) return <div key={bay} style={GS.cell} />;
                if (blocked) return (
                  <div key={bay} style={{ ...GS.cell, background: RED + "10" }}>
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 8, color: RED, fontWeight: 700 }}>BLOCKED</span>
                    </div>
                  </div>
                );
                return (
                  <div key={bay} style={{ ...GS.cell, cursor: "pointer" }} onClick={() => openNew(bay, slot)}>
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0 }}>
                      <span style={{ fontSize: 9, color: "#ccc" }}>+</span>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ));
        })()}
      </div>

      {/* ══════════════════════════════════════
          BOOKING MODAL
      ══════════════════════════════════════ */}
      {selB && !actionModal && (
        <div style={S.ov} onClick={closeModal}>
          <div style={S.mod} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{selB.isNew ? "New Booking" : "Edit Booking"}</h3>

            {/* Customer */}
            {selB.isNew ? (
              <div style={{ marginBottom: 14 }}>
                <label style={GS.label}>CUSTOMER *</label>
                {!selB.isWalkIn && !selB.custObj && (
                  <>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input style={{ ...GS.input, flex: 1 }} placeholder="Search existing customer..." value={custSearch} onChange={e => setCustSearch(e.target.value)} />
                      <button
                        style={{ ...GS.togBtn, background: GREEN, color: "#fff", borderColor: GREEN, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", flexShrink: 0 }}
                        onClick={() => { setSelB(p => ({ ...p, isWalkIn: true, newCustInfo: { firstName: "", lastName: "", phone: "", email: "", cardName: "", cardNumber: "", cardExp: "", cardCvc: "" } })); setCustSearch(""); }}
                      >
                        {X.plus(13)} New Customer
                      </button>
                    </div>
                    {custSearch && (
                      <div style={{ border: "1px solid #e8e8e6", borderRadius: 8, marginTop: 0, maxHeight: 160, overflowY: "auto", marginBottom: 8 }}>
                        {customers.filter(c => cn(c).toLowerCase().includes(custSearch.toLowerCase()) || (c.phone || "").includes(custSearch)).slice(0, 8).map(c => (
                          <div key={c.id} style={{ padding: "8px 12px", borderBottom: "1px solid #f2f2f0", cursor: "pointer", fontSize: 13 }}
                            onClick={() => { setSelB(p => ({ ...p, custId: c.id, custObj: c, cardId: null, isWalkIn: false })); setCustSearch(""); loadCards(c.id); }}>
                            <span style={{ fontWeight: 600 }}>{cn(c)}</span>
                            <span style={{ color: "#888", fontSize: 11, marginLeft: 6 }}>{c.phone}</span>
                            {c.tier && c.tier !== "none" && <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", background: TC[c.tier], padding: "2px 6px", borderRadius: 4, marginLeft: 6, fontFamily: mono }}>{TB[c.tier]}</span>}
                          </div>
                        ))}
                        {customers.filter(c => cn(c).toLowerCase().includes(custSearch.toLowerCase()) || (c.phone || "").includes(custSearch)).length === 0 && <div style={{ padding: "10px 12px", fontSize: 12, color: "#aaa" }}>No customers found</div>}
                      </div>
                    )}
                  </>
                )}
                {!selB.isWalkIn && selB.custObj && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: GREEN + "10", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{cn(selB.custObj)}</span>
                    {selB.custObj.tier && selB.custObj.tier !== "none" && <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: TC[selB.custObj.tier], padding: "2px 6px", borderRadius: 4, fontFamily: mono }}>{TB[selB.custObj.tier]}</span>}
                    <button style={{ marginLeft: "auto", fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }} onClick={() => { setSelB(p => ({ ...p, custId: null, custObj: null, cardId: null, useCredits: false })); setCustCards([]); }}>Change</button>
                  </div>
                )}
                {selB.isWalkIn && (
                  <div style={{ background: "#fafaf8", border: "1px solid #e8e8e6", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>NEW CUSTOMER INFO</span>
                      <button style={{ fontSize: 11, color: "#aaa", background: "none", border: "none", cursor: "pointer" }} onClick={() => setSelB(p => ({ ...p, isWalkIn: false, newCustInfo: null }))}>Back to search</button>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}><label style={{ ...GS.label, fontSize: 10 }}>FIRST NAME *</label><input style={GS.input} value={selB.newCustInfo?.firstName || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, firstName: e.target.value } }))} /></div>
                      <div style={{ flex: 1 }}><label style={{ ...GS.label, fontSize: 10 }}>LAST NAME</label><input style={GS.input} value={selB.newCustInfo?.lastName || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, lastName: e.target.value } }))} /></div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}><label style={{ ...GS.label, fontSize: 10 }}>PHONE *</label><input style={GS.input} placeholder="3051234567" value={selB.newCustInfo?.phone || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, phone: e.target.value } }))} /></div>
                      <div style={{ flex: 1 }}><label style={{ ...GS.label, fontSize: 10 }}>EMAIL</label><input style={GS.input} placeholder="optional" value={selB.newCustInfo?.email || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, email: e.target.value } }))} /></div>
                    </div>
                    <div style={{ borderTop: "1px solid #e8e8e6", paddingTop: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 8 }}>CARD ON FILE (optional)</span>
                      <div style={{ marginBottom: 8 }}><label style={{ ...GS.label, fontSize: 10 }}>NAME ON CARD</label><input style={GS.input} value={selB.newCustInfo?.cardName || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardName: e.target.value } }))} /></div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 2 }}><label style={{ ...GS.label, fontSize: 10 }}>CARD NUMBER</label><input style={GS.input} placeholder="4242 4242 4242 4242" maxLength={19} value={selB.newCustInfo?.cardNumber || ""} onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,16); setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardNumber: v.match(/.{1,4}/g)?.join(" ") || v } })); }} /></div>
                        <div style={{ flex: 1 }}><label style={{ ...GS.label, fontSize: 10 }}>EXP</label><input style={GS.input} placeholder="12/27" maxLength={5} value={selB.newCustInfo?.cardExp || ""} onChange={e => { let v = e.target.value.replace(/\D/g,"").slice(0,4); if (v.length > 2) v = v.slice(0,2)+"/"+v.slice(2); setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardExp: v } })); }} /></div>
                        <div style={{ flex: 1 }}><label style={{ ...GS.label, fontSize: 10 }}>CVC</label><input style={GS.input} placeholder="123" maxLength={4} value={selB.newCustInfo?.cardCvc || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardCvc: e.target.value.replace(/\D/g,"").slice(0,4) } }))} /></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <label style={GS.label}>CUSTOMER</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{selB.custObj ? cn(selB.custObj) : "Walk-in"}</p>
                  {selB.custObj?.tier && selB.custObj.tier !== "none" && <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: TC[selB.custObj.tier], padding: "2px 6px", borderRadius: 4, fontFamily: mono }}>{TB[selB.custObj.tier]}</span>}
                </div>
              </div>
            )}

            {/* Type / Bay */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={GS.label}>TYPE</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {["bay","lesson"].map(t => (
                    <button key={t} style={{ ...GS.togBtn, flex: 1, ...((selB.type || "bay") === t ? { background: t === "lesson" ? PURPLE : GREEN, color: "#fff" } : {}) }} onClick={() => setSelB(p => ({ ...p, type: t }))}>
                      {t === "lesson" ? "Lesson" : "Bay"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={GS.label}>BAY</label>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1,2,3,4,5].map(b => (
                    <button key={b} style={{ ...GS.togBtn, flex: 1, padding: "7px 4px", ...(selB.bay === b ? { background: GREEN, color: "#fff" } : {}) }} onClick={() => setSelB(p => ({ ...p, bay: b }))}>{b}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date / Time / Duration */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div><label style={GS.label}>DATE</label><input type="date" style={GS.input} value={selB.date || dateKey(resDate)} onChange={e => setSelB(p => ({ ...p, date: e.target.value }))} /></div>
              <div><label style={GS.label}>TIME</label><select style={GS.select} value={selB.time || selB.start_time || "9:00 AM"} onChange={e => setSelB(p => ({ ...p, time: e.target.value }))}>{SLOTS.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label style={GS.label}>DURATION</label><select style={GS.select} value={selB.dur || slotsToLabel(selB.duration_slots)} onChange={e => setSelB(p => ({ ...p, dur: e.target.value }))}>{DUR_LABELS.map(d => <option key={d}>{d}</option>)}</select></div>
            </div>

            {/* Coach (lesson only) */}
            {(selB.type || "bay") === "lesson" && (
              <div style={{ marginBottom: 12 }}>
                <label style={GS.label}>COACH</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Santiago Espinoza","Nicolas Cavero"].map(c => (
                    <button key={c} style={{ ...GS.togBtn, flex: 1, ...(selB.coach_name === c ? { background: PURPLE, color: "#fff" } : {}) }} onClick={() => setSelB(p => ({ ...p, coach_name: c }))}>{c.split(" ")[0]}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment — new booking for member: option to use credits */}
            {selB.isNew && selB.custObj && !selB.isWalkIn && (
              <div style={{ background: "#fafaf8", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <label style={GS.label}>PAYMENT</label>

                {/* Credits toggle — members only */}
                {isMember && (selB.custObj?.bay_credits_remaining || 0) > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <button
                      style={{ ...GS.togBtn, width: "100%", display: "flex", alignItems: "center", gap: 8, ...(selB.useCredits ? { background: GREEN, color: "#fff", borderColor: GREEN } : {}) }}
                      onClick={() => setSelB(p => ({ ...p, useCredits: !p.useCredits, cardId: p.useCredits ? p.cardId : null }))}
                    >
                      <span style={{ fontSize: 13 }}>{selB.useCredits ? "✓" : ""} Use Bay Credits</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8 }}>{selB.custObj?.bay_credits_remaining || 0} hrs available</span>
                    </button>
                    {selB.useCredits && creditInfo && (
                      <div style={{ marginTop: 6, padding: "6px 10px", background: GREEN + "14", borderRadius: 8 }}>
                        <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>
                          {creditInfo.used} hr{creditInfo.used !== 1 ? "s" : ""} covered by credits
                          {creditInfo.remain > 0 ? ` · ${creditInfo.remain}hr billed to card` : " · No charge"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {isMember && (selB.custObj?.bay_credits_remaining || 0) === 0 && (
                  <p style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>No bay credits available for this member.</p>
                )}

                {/* Card picker */}
                {(!selB.useCredits || (creditInfo && creditInfo.remain > 0)) && (
                  loadingCards ? <p style={{ fontSize: 12, color: "#aaa" }}>Loading cards...</p> :
                  custCards.length === 0 ? <p style={{ fontSize: 12, color: "#aaa" }}>No cards on file — collect payment in person.</p> :
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {custCards.map(card => (
                      <button key={card.id} style={{ ...GS.togBtn, display: "flex", alignItems: "center", gap: 8, ...(selB.cardId === card.id ? { background: GREEN, color: "#fff", borderColor: GREEN } : {}) }} onClick={() => setSelB(p => ({ ...p, cardId: card.id }))}>
                        {X.card(14)}<span>{card.brand} \u2022\u2022\u2022\u2022 {card.last4}</span>
                        {card.is_default && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: "auto" }}>default</span>}
                      </button>
                    ))}
                    <button style={{ ...GS.togBtn, display: "flex", alignItems: "center", gap: 6, ...(selB.cardId === "in_person" ? { background: "#888", color: "#fff", borderColor: "#888" } : {}) }} onClick={() => setSelB(p => ({ ...p, cardId: "in_person" }))}>Pay in person</button>
                  </div>
                )}

                {/* Amount preview */}
                {selB.cardId && selB.cardId !== "in_person" && (() => {
                  const durSlots = DUR_MAP[selB.dur] || 2;
                  const rate = calcRate(selB.date, selB.time);
                  const paidHrs = creditInfo ? creditInfo.remain : durSlots * 0.5;
                  return paidHrs > 0 ? (
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#888" }}>{paidHrs}hr @ ${rate}/hr</span>
                      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono }}>${(paidHrs * rate).toFixed(2)}</span>
                    </div>
                  ) : <p style={{ fontSize: 12, color: GREEN, fontWeight: 600, marginTop: 6 }}>Fully covered by credits — $0.00</p>;
                })()}
              </div>
            )}

            {/* Status (existing booking) */}
            {!selB.isNew && (
              <div style={{ marginBottom: 12 }}>
                <label style={GS.label}>STATUS</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {["confirmed","checked-in","completed","cancelled"].map(st => (
                    <button key={st} style={{ ...GS.togBtn, fontSize: 11, ...(selB.status === st ? { background: st === "cancelled" ? RED : GREEN, color: "#fff" } : {}) }} onClick={() => setSelB(p => ({ ...p, status: st }))}>{st}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Admin notes */}
            <div style={{ marginBottom: 14 }}>
              <label style={GS.label}>ADMIN NOTES (not visible to customer)</label>
              <textarea style={{ ...GS.input, minHeight: 60, resize: "vertical" }} value={selB.notes || ""} onChange={e => setSelB(p => ({ ...p, notes: e.target.value }))} placeholder="Internal notes..." />
            </div>

            {/* Validation */}
            {selB.isNew && !selB.custId && !selB.isWalkIn && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: ORANGE + "18", borderRadius: 8, marginBottom: 12 }}>
                {X.warn(14)}<span style={{ fontSize: 12, color: ORANGE, fontWeight: 600 }}>Search for a customer or add a new one above</span>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selB.isNew ? (
                <button
                  style={{ ...S.b1, flex: 1, opacity: (selB.custId || (selB.isWalkIn && selB.newCustInfo?.firstName && selB.newCustInfo?.phone)) ? 1 : 0.35 }}
                  disabled={!selB.custId && !(selB.isWalkIn && selB.newCustInfo?.firstName && selB.newCustInfo?.phone) || saving}
                  onClick={createBooking}
                >
                  {saving ? "Saving..." : "Create Booking"}
                </button>
              ) : (
                <>
                  <button style={{ ...S.b1, flex: 1 }} onClick={saveEdits} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                  <button style={{ ...GS.togBtn, padding: "10px 14px", color: RED, borderColor: RED + "44", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }} onClick={() => setActionModal("cancel_options")}>
                    {X.trash(14)} Cancel
                  </button>
                  {selB.type === "lesson" && selB.status !== "cancelled" && (
                    <button style={{ ...GS.togBtn, padding: "10px 14px", color: ORANGE, borderColor: ORANGE + "44", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }} onClick={() => setActionModal("noshow")}>
                      No-show
                    </button>
                  )}
                </>
              )}
              <button style={{ ...GS.togBtn, padding: "10px 14px" }} onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          CANCEL OPTIONS MODAL
      ══════════════════════════════════════ */}
      {selB && actionModal === "cancel_options" && (
        <div style={S.ov} onClick={() => setActionModal(null)}>
          <div style={{ ...S.mod, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Cancel Booking</h3>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              Bay {selB.bay} · {(selB.duration_slots || 2) * 0.5}hr · {selB.custObj ? cn(selB.custObj) : "Walk-in"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Refund as credits */}
              <button style={{ ...S.b1, background: GREEN, display: "flex", alignItems: "center", gap: 8 }} onClick={() => cancelWithRefund(true)} disabled={saving}>
                {X.refund(14)} Cancel + Refund as Credits
              </button>
              {/* Refund to card */}
              <button style={{ ...S.b1, background: selB.square_payment_id ? GREEN : "#ccc", display: "flex", alignItems: "center", gap: 8 }} onClick={() => cancelWithRefund(false)} disabled={!selB.square_payment_id || saving}>
                {X.card(14)} Cancel + Refund to Card
                {selB.square_payment_id && <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.9 }}>${(selB.amount || 0).toFixed(2)}</span>}
              </button>
              {!selB.square_payment_id && <p style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: -4 }}>No card payment on file</p>}
              {/* Cancel no refund */}
              <button style={{ ...S.bDanger, display: "flex", alignItems: "center", gap: 8 }} onClick={cancelNoRefund} disabled={saving}>
                {X.trash(14)} Cancel Without Refund
              </button>
              <button style={{ ...GS.togBtn, width: "100%" }} onClick={() => setActionModal(null)}>Go Back</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          NO-SHOW MODAL
      ══════════════════════════════════════ */}
      {selB && actionModal === "noshow" && (
        <div style={S.ov} onClick={() => setActionModal(null)}>
          <div style={{ ...S.mod, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: ORANGE + "18", color: ORANGE, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {X.warn(20)}
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Mark as No-Show</h3>
                <p style={{ fontSize: 12, color: "#888" }}>{selB.custObj ? cn(selB.custObj) : "Walk-in"}</p>
              </div>
            </div>
            <div style={{ background: ORANGE + "10", border: `1px solid ${ORANGE}33`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ORANGE, marginBottom: 4 }}>No-show fee</p>
              <p style={{ fontSize: 24, fontWeight: 700, fontFamily: mono }}>${noShowFee.toFixed(2)}</p>
              <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                {(selB.duration_slots || 2) * 0.5}hr @ ${calcRate(selB.date, selB.time)}/hr · charged to card on file
              </p>
            </div>
            <p style={{ fontSize: 12, color: "#555", marginBottom: 20, lineHeight: 1.5 }}>
              This will cancel the booking and charge the no-show fee to their card on file. If no card is on file, the fee will be marked as pending.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...S.b1, flex: 1, background: ORANGE }} onClick={markNoShow} disabled={saving}>
                {saving ? "Processing..." : `Confirm No-show · $${noShowFee.toFixed(2)}`}
              </button>
              <button style={{ ...GS.togBtn, padding: "12px 16px" }} onClick={() => setActionModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

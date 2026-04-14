import React, { useState, useCallback } from "react";
import { db } from "../lib/db.js";
import { sq } from "../lib/square.js";
import {
  GREEN, PURPLE, RED, ORANGE, mono, ff,
  TC, TB, BK_C, SLOTS, DUR_MAP, DUR_LABELS, slotsToLabel,
  toH, dateKey, fmtFull, addDays, getSlots, cn,
  X, GS, S,
} from "../lib/constants.jsx";

/* ── helpers ── */
function calcAmount(durSlots, date, cfg) {
  const d = new Date(date + "T12:00:00");
  const isWk = d.getDay() === 0 || d.getDay() === 6;
  const hrs = durSlots * 0.5;
  const rate = isWk ? cfg.wk : cfg.pk; // simplification; peak logic can be added
  return hrs * rate;
}

export default function ReservationsTab({ customers, bookings, bayBlocks, cfg, hoursConfig, fire, reload, logActivity }) {
  const [resDate,   setResDate]   = useState(new Date());
  const [selB,      setSelB]      = useState(null);   // booking modal state
  const [custSearch,setCustSearch]= useState("");
  const [custCards, setCustCards] = useState([]);     // payment methods for selected customer
  const [loadingCards, setLoadingCards] = useState(false);
  const [refundModal, setRefundModal] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [resView,   setResView]   = useState("calendar");
  const [changeLog, setChangeLog] = useState([]);
  const [logLoading,setLogLoading]= useState(false);
  const [histModal, setHistModal] = useState(null);
  const [histLog,   setHistLog]   = useState([]);

  const closeModal = useCallback(() => {
    setSelB(null);
    setCustSearch("");
    setCustCards([]);
    setRefundModal(null);
  }, []);

  /* ── booking change log helpers ── */
  const logBkChange = async (bookingId, action, detail) => {
    await db.post("booking_change_log", { booking_id: bookingId, action, detail: detail || "", changed_at: new Date().toISOString() });
    await logActivity?.(action + (detail ? ": " + detail : ""));
  };
  const loadChangeLog = async () => {
    setLogLoading(true);
    const dk = dateKey(resDate);
    const dateBks = bookings.filter(b => b.date === dk);
    if (!dateBks.length) { setChangeLog([]); setLogLoading(false); return; }
    const ids = dateBks.map(b => b.id).join(",");
    const rows = await db.get("booking_change_log", "booking_id=in.(" + ids + ")&select=*&order=changed_at.desc");
    setChangeLog((rows || []).map(r => {
      const bk = dateBks.find(b => b.id === r.booking_id);
      const cust = bk ? customers.find(c => c.id === bk.customer_id) : null;
      return { ...r, customerName: cust ? ((cust.first_name||"")+" "+(cust.last_name||"")).trim() : "Walk-in", bay: bk?.bay, type: bk?.type };
    }));
    setLogLoading(false);
  };
  const loadBookingHistory = async (bookingId) => {
    const rows = await db.get("booking_change_log", "booking_id=eq." + bookingId + "&select=*&order=changed_at.asc");
    setHistLog(rows || []);
  };
  const fmtLogTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric"}) + " · " + d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  };

  /* ── fetch cards when a customer is selected ── */
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
      const th = toH(slot);
      return th >= toH(tf) && th < toH(tt);
    });
  };

  /* ── credit calculation ── */
  const getCreditInfo = (cust, durSlots) => {
    if (!cust || !cust.tier || cust.tier === "none" || cust.tier === "starter") return null;
    const avail = cust.bay_credits_remaining || 0;
    const needed = durSlots * 0.5; // 0.5 credit per slot
    const used   = Math.min(avail, needed);
    const remain = needed - used;
    return { avail, needed, used, remain };
  };

  /* ── open new booking from grid click ── */
  const openNew = (bay, slot) => {
    setSelB({
      isNew: true,
      type: "bay",
      bay,
      time: slot,
      dur: "1h",
      date: dateKey(resDate),
      custId: null,
      custObj: null,
      cardId: null,
      notes: "",
    });
    setCustCards([]);
    setCustSearch("");
  };

  /* ── open existing booking ── */
  const openExisting = (bk) => {
    const cust = customers.find(c => c.id === bk.customer_id);
    setSelB({
      ...bk,
      isNew: false,
      custObj: cust || null,
      dur: slotsToLabel(bk.duration_slots),
      time: bk.start_time,
      notes: bk.admin_notes || "",
      cardId: null,
    });
    if (cust) loadCards(cust.id);
    setCustSearch("");
  };

  /* ── create booking ── */
  const createBooking = async () => {
    const isNew = selB.isWalkIn;
    const info  = selB.newCustInfo || {};

    // Validate: need either existing customer or new customer with name+phone
    if (!selB.custId && !(isNew && info.firstName && info.phone)) return;
    setSaving(true);

    let custId  = selB.custId;
    let custObj = selB.custObj;

    // ── Create new customer in Supabase + Square ──
    if (isNew && !custId) {
      const phone = (info.phone || "").replace(/\D/g, "");
      const newRows = await db.post("customers", {
        first_name: info.firstName,
        last_name:  info.lastName || "",
        phone,
        email:      info.email || "",
        tier:       "none",
      });
      const newCust = Array.isArray(newRows) ? newRows[0] : newRows;
      if (newCust?.id) {
        custId  = newCust.id;
        custObj = newCust;
        // Create in Square too
        const sqResult = await sq("customer.create", {
          first_name: info.firstName,
          last_name:  info.lastName || "",
          phone,
          email:      info.email || "",
          supabase_id: custId,
        });
        const sqId = sqResult?.customer?.id;
        if (sqId) {
          await db.patch("customers", `id=eq.${custId}`, { square_customer_id: sqId });
          custObj = { ...custObj, square_customer_id: sqId };
        }
      }
    }

    const durSlots   = DUR_MAP[selB.dur] || 2;
    const creditInfo = custObj ? getCreditInfo(custObj, durSlots) : null;
    const creditsUsed = creditInfo ? creditInfo.used : 0;

    // Calculate charge amount
    const hrs    = durSlots * 0.5;
    const d      = new Date((selB.date || dateKey(resDate)) + "T12:00:00");
    const isWk   = d.getDay() === 0 || d.getDay() === 6;
    const hour   = toH(selB.time || "9:00 AM");
    const isPeak = !isWk && hour >= 17;
    const rate   = isPeak ? cfg.pk : cfg.op;
    const paidHrs = creditInfo ? creditInfo.remain : hrs;
    let amount   = selB.cardId && selB.cardId !== "in_person" ? paidHrs * rate : 0;

    // Charge card if applicable
    let sqPaymentId = null;
    if (amount > 0 && selB.cardId && selB.cardId !== "in_person" && custObj?.square_customer_id) {
      const sqCard = custCards.find(c => c.id === selB.cardId);
      if (sqCard?.square_card_id) {
        const payment = await sq("payment.create", {
          square_customer_id: custObj.square_customer_id,
          card_id: sqCard.square_card_id,
          amount,
          note: `Bay ${selB.bay} \u00b7 ${selB.date || dateKey(resDate)}`,
        });
        sqPaymentId = payment?.payment?.id || null;
      }
    }

    // Write booking
    await db.post("bookings", {
      customer_id:       custId || null,
      type:              selB.type || "bay",
      bay:               selB.bay || 1,
      date:              selB.date || dateKey(resDate),
      start_time:        selB.time || "9:00 AM",
      duration_slots:    durSlots,
      status:            "confirmed",
      amount,
      credits_used:      creditsUsed,
      discount:          0,
      coach_name:        selB.type === "lesson" ? (selB.coach_name || "") : "",
      admin_notes:       selB.notes || "",
      square_payment_id: sqPaymentId,
    });

    // Deduct credits
    if (creditsUsed > 0 && custObj?.id) {
      const newCredits = Math.max(0, (custObj.bay_credits_remaining || 0) - creditsUsed);
      await db.patch("customers", `id=eq.${custObj.id}`, { bay_credits_remaining: newCredits });
    }

    // Transaction record
    if (custId) {
      await db.post("transactions", {
        customer_id:       custId,
        description:       `${selB.type === "lesson" ? "Lesson" : "Bay"} Booking \u00b7 Bay ${selB.bay}`,
        date:              selB.date || dateKey(new Date()),
        amount,
        payment_label:     selB.cardId === "in_person" ? "In Person" : selB.cardId ? "Card" : "Credits",
        square_payment_id: sqPaymentId,
      });
    }

    // Log creation — get the booking ID from the result
    const created = await db.get("bookings", "customer_id=eq." + (custId||"null") + "&order=created_at.desc&limit=1&select=id,bay,date,start_time,type");
    if (created?.[0]?.id) {
      const bk = created[0];
      const custName = custObj ? ((custObj.first_name||"")+" "+(custObj.last_name||"")).trim() : "Walk-in";
      await logBkChange(bk.id, "Created", custName + " · Bay " + bk.bay + " · " + bk.start_time);
    }
    fire("Booking created ✓");
    setSaving(false);
    closeModal();
    reload();
  };

  /* ── save existing booking edits ── */
  const saveEdits = async () => {
    setSaving(true);
    const durSlots = DUR_MAP[selB.dur] || selB.duration_slots || 2;
    const newBay   = selB.bay;
    const newTime  = selB.time || selB.start_time;
    const newDate  = selB.date || dateKey(resDate);
    const newStart = toH(newTime);
    const newEnd   = newStart + durSlots * 0.5;

    // Block bay change if another booking overlaps on the target bay
    const conflict = bookings.find(b =>
      b.id !== selB.id && b.bay === newBay && b.date === newDate &&
      b.status !== "cancelled" &&
      (() => { const bs = toH(b.start_time), be = bs + (b.duration_slots||2)*0.5; return newStart < be && newEnd > bs; })()
    );
    if (conflict) {
      const cc = customers.find(c => c.id === conflict.customer_id);
      fire(`Bay ${newBay} is already booked at ${conflict.start_time}${cc ? " · " + ((cc.first_name||"")+" "+(cc.last_name||"")).trim() : ""}. Choose a different bay.`);
      setSaving(false);
      return;
    }

    // Build detailed change log
    const orig = bookings.find(b => b.id === selB.id);
    const changes = [];
    if (orig) {
      if (orig.bay !== newBay) changes.push(`Bay ${orig.bay} → Bay ${newBay}`);
      if (orig.start_time !== newTime) changes.push(`${orig.start_time} → ${newTime}`);
      if ((orig.duration_slots||2) !== durSlots) changes.push(`${slotsToLabel(orig.duration_slots||2)} → ${slotsToLabel(durSlots)}`);
      if (orig.status !== selB.status) changes.push(`Status: ${orig.status} → ${selB.status}`);
    }
    const custName = selB.custObj ? ((selB.custObj.first_name||"")+" "+(selB.custObj.last_name||"")).trim() : "Walk-in";

    await db.patch("bookings", `id=eq.${selB.id}`, {
      status:         selB.status,
      bay:            newBay,
      start_time:     newTime,
      duration_slots: durSlots,
      admin_notes:    selB.notes || "",
    });
    await logBkChange(selB.id, "Updated", custName + " · " + (changes.length ? changes.join(", ") : "Saved"));
    fire("Booking updated ✓");
    setSaving(false);
    closeModal();
    reload();
  };

  /* ── cancel booking ── */
  const cancelBooking = async () => {
    setSaving(true);
    await db.patch("bookings", `id=eq.${selB.id}`, { status: "cancelled" });
    const custName = selB.custObj ? ((selB.custObj.first_name||"")+" "+(selB.custObj.last_name||"")).trim() : "Walk-in";
    await logBkChange(selB.id, "Cancelled", custName + " · Bay " + selB.bay + " · " + (selB.start_time||selB.time));
    fire("Booking cancelled");
    setSaving(false);
    closeModal();
    reload();
  };

  /* ── refund ── */
  const issueRefund = async (asCredits) => {
    if (!refundModal) return;
    setSaving(true);
    const bk = refundModal;
    const cust = customers.find(c => c.id === bk.customer_id);

    if (asCredits && cust) {
      const creditsBack = (bk.duration_slots || 2) * 0.5;
      const newCredits = (cust.bay_credits_remaining || 0) + creditsBack;
      await db.patch("customers", `id=eq.${cust.id}`, { bay_credits_remaining: newCredits });
      await db.post("transactions", {
        customer_id:  cust.id,
        description:  `Refund (credits) \u00b7 Bay ${bk.bay}`,
        date:         dateKey(new Date()),
        amount:       creditsBack,
        payment_label: "Credits",
      });
      fire(`${creditsBack} credits refunded \u2713`);
    } else if (!asCredits && bk.square_payment_id) {
      await sq("payment.refund", {
        payment_id: bk.square_payment_id,
        amount: bk.amount || 0,
        reason: "Admin refund",
      });
      await db.post("transactions", {
        customer_id:  bk.customer_id,
        description:  `Refund \u00b7 Bay ${bk.bay}`,
        date:         dateKey(new Date()),
        amount:       -(bk.amount || 0),
        payment_label: "Refund",
      });
      fire("Refund issued \u2713");
    } else {
      fire("No payment on file to refund");
    }

    setSaving(false);
    setRefundModal(null);
    closeModal();
    reload();
  };

  /* ── current credit preview ── */
  const selCust    = selB?.custObj;
  const creditInfo = selB ? getCreditInfo(selCust, DUR_MAP[selB.dur] || 2) : null;

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
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
          <button
            style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12, background: "#4A6FA5" }}
            onClick={reload}
          >
            ↻ Refresh
          </button>
          <button
            style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12 }}
            onClick={() => openNew(1, "9:00 AM")}
          >
            {X.plus(14)} New Booking
          </button>
        </div>
      </div>

      {/* ── View toggle ── */}
      <div style={{ display: "flex", gap: 3, background: "#f0f0ee", borderRadius: 8, padding: 3, marginBottom: 14, alignSelf: "flex-start" }}>
        <button style={{ padding: "6px 16px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, background: resView === "calendar" ? "#fff" : "transparent", color: resView === "calendar" ? "#1a1a1a" : "#888", boxShadow: resView === "calendar" ? "0 1px 4px rgba(0,0,0,.08)" : "none" }} onClick={() => setResView("calendar")}>Calendar</button>
        <button style={{ padding: "6px 16px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, background: resView === "changes" ? "#fff" : "transparent", color: resView === "changes" ? "#1a1a1a" : "#888", boxShadow: resView === "changes" ? "0 1px 4px rgba(0,0,0,.08)" : "none" }} onClick={() => { setResView("changes"); loadChangeLog(); }}>Changes & Cancellations</button>
      </div>

      {resView === "calendar" && (
        <>
      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { l: "Member Bay", c: BK_C.bay_member },
          { l: "Walk-in Bay", c: BK_C.bay_walkin },
          { l: "Lesson", c: BK_C.lesson },
          { l: "Blocked", c: RED },
        ].map(x => (
          <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: x.c }} />
            <span style={{ fontSize: 10, color: "#888" }}>{x.l}</span>
          </div>
        ))}
      </div>

      {/* ── Bay Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "80px repeat(5,1fr)", border: "1px solid #e8e8e6", borderRadius: 12, overflow: "hidden", background: "#fff", minWidth: 700 }}>
        <div style={GS.hdr}><span style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>TIME</span></div>
        {[1, 2, 3, 4, 5].map(b => <div key={b} style={GS.hdr}><span style={{ fontSize: 13, fontWeight: 700 }}>Bay {b}</span></div>)}

        {(() => {
          // One rendered Set per bay — persists across all slot rows so each booking only draws once
          const renderedPerBay = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
          return slots.map(slot => (
            <React.Fragment key={slot}>
              <div style={GS.timeCell}>
                <span style={{ fontSize: 11, color: "#888", fontFamily: mono }}>{slot}</span>
              </div>
              {[1, 2, 3, 4, 5].map(bay => {
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
                  const slotH = 29; // px per 30-min row
                  const h     = (bk.duration_slots || 2) * slotH - 2;
                  return (
                    <div key={bay} style={{ ...GS.cell, position: "relative" }}>
                      <div
                        style={{ ...GS.booking, background: color + "20", borderLeft: `3px solid ${color}`, height: h, cursor: "pointer", zIndex: 3 }}
                        onClick={() => openExisting(bk)}
                      >
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
                // Subsequent slots occupied by the same booking — render empty cell (block is drawn above)
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
      {selB && (
        <div style={S.ov} onClick={closeModal}>
          <div style={S.mod} onClick={e => e.stopPropagation()}>

            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {selB.isNew ? "New Booking" : "Booking Details"}
            </h3>

            {/* ── Customer picker (new booking only) ── */}
            {selB.isNew ? (
              <div style={{ marginBottom: 14 }}>
                <label style={GS.label}>CUSTOMER *</label>

                {/* Mode: search existing / new customer */}
                {!selB.isWalkIn && !selB.custObj && (
                  <>
                    <input
                      style={GS.input}
                      placeholder="Search by name or phone..."
                      value={custSearch}
                      onChange={e => setCustSearch(e.target.value)}
                    />
                    {custSearch && (
                      <div style={{ border: "1px solid #e8e8e6", borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: "auto" }}>
                        {customers
                          .filter(c => cn(c).toLowerCase().includes(custSearch.toLowerCase()) || (c.phone || "").includes(custSearch))
                          .slice(0, 8)
                          .map(c => (
                            <div
                              key={c.id}
                              style={{ padding: "8px 12px", borderBottom: "1px solid #f2f2f0", cursor: "pointer", fontSize: 13 }}
                              onClick={() => {
                                setSelB(p => ({ ...p, custId: c.id, custObj: c, cardId: null, isWalkIn: false }));
                                setCustSearch("");
                                loadCards(c.id);
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{cn(c)}</span>
                              <span style={{ color: "#888", fontSize: 11, marginLeft: 6 }}>{c.phone}</span>
                              {c.tier && c.tier !== "none" && (
                                <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", background: TC[c.tier], padding: "2px 6px", borderRadius: 4, marginLeft: 6, fontFamily: mono }}>{TB[c.tier]}</span>
                              )}
                            </div>
                          ))}
                        {/* "Not found" → offer to create new */}
                        {customers.filter(c => cn(c).toLowerCase().includes(custSearch.toLowerCase()) || (c.phone || "").includes(custSearch)).length === 0 && (
                          <div style={{ padding: "10px 12px", fontSize: 12, color: "#aaa" }}>No customers found</div>
                        )}
                        {/* Always show option to create new */}
                        <div
                          style={{ padding: "10px 12px", fontSize: 12, cursor: "pointer", color: GREEN, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid #f2f2f0" }}
                          onClick={() => { setSelB(p => ({ ...p, isWalkIn: true, newCustInfo: { firstName: "", lastName: "", phone: custSearch.replace(/\D/g,""), email: "", cardName: "", cardNumber: "", cardExp: "", cardCvc: "" } })); setCustSearch(""); }}
                        >
                          {X.plus(13)} Add new customer
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Selected existing customer */}
                {!selB.isWalkIn && selB.custObj && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: GREEN + "10", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{cn(selB.custObj)}</span>
                    {selB.custObj.tier && selB.custObj.tier !== "none" && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: TC[selB.custObj.tier], padding: "2px 6px", borderRadius: 4, fontFamily: mono }}>{TB[selB.custObj.tier]}</span>
                    )}
                    <button style={{ marginLeft: "auto", fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }}
                      onClick={() => { setSelB(p => ({ ...p, custId: null, custObj: null, cardId: null })); setCustCards([]); }}>
                      Change
                    </button>
                  </div>
                )}

                {/* New customer form */}
                {selB.isWalkIn && (
                  <div style={{ background: "#fafaf8", border: "1px solid #e8e8e6", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>NEW CUSTOMER INFO</span>
                      <button style={{ fontSize: 11, color: "#aaa", background: "none", border: "none", cursor: "pointer" }}
                        onClick={() => setSelB(p => ({ ...p, isWalkIn: false, newCustInfo: null }))}>
                        Back to search
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...GS.label, fontSize: 10 }}>FIRST NAME *</label>
                        <input style={GS.input} value={selB.newCustInfo?.firstName || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, firstName: e.target.value } }))} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...GS.label, fontSize: 10 }}>LAST NAME *</label>
                        <input style={GS.input} value={selB.newCustInfo?.lastName || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, lastName: e.target.value } }))} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...GS.label, fontSize: 10 }}>PHONE *</label>
                        <input style={GS.input} placeholder="3051234567" value={selB.newCustInfo?.phone || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, phone: e.target.value } }))} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...GS.label, fontSize: 10 }}>EMAIL</label>
                        <input style={GS.input} placeholder="optional" value={selB.newCustInfo?.email || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, email: e.target.value } }))} />
                      </div>
                    </div>
                    {/* Card info */}
                    <div style={{ borderTop: "1px solid #e8e8e6", paddingTop: 10, marginTop: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 8 }}>CARD ON FILE (optional — collect in person if not available)</span>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ ...GS.label, fontSize: 10 }}>NAME ON CARD</label>
                        <input style={GS.input} value={selB.newCustInfo?.cardName || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardName: e.target.value } }))} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 2 }}>
                          <label style={{ ...GS.label, fontSize: 10 }}>CARD NUMBER</label>
                          <input style={GS.input} placeholder="4242 4242 4242 4242" maxLength={19}
                            value={selB.newCustInfo?.cardNumber || ""}
                            onChange={e => {
                              const v = e.target.value.replace(/\D/g,"").slice(0,16);
                              const fmt = v.match(/.{1,4}/g)?.join(" ") || v;
                              setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardNumber: fmt } }));
                            }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...GS.label, fontSize: 10 }}>EXP (MM/YY)</label>
                          <input style={GS.input} placeholder="12/27" maxLength={5}
                            value={selB.newCustInfo?.cardExp || ""}
                            onChange={e => {
                              let v = e.target.value.replace(/\D/g,"").slice(0,4);
                              if (v.length > 2) v = v.slice(0,2) + "/" + v.slice(2);
                              setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardExp: v } }));
                            }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...GS.label, fontSize: 10 }}>CVC</label>
                          <input style={GS.input} placeholder="123" maxLength={4}
                            value={selB.newCustInfo?.cardCvc || ""}
                            onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardCvc: e.target.value.replace(/\D/g,"").slice(0,4) } }))} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Existing booking customer display ── */
              <div style={{ marginBottom: 14 }}>
                <label style={GS.label}>CUSTOMER</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{selB.custObj ? cn(selB.custObj) : "Walk-in"}</p>
                  {selB.custObj?.tier && selB.custObj.tier !== "none" && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: TC[selB.custObj.tier], padding: "2px 6px", borderRadius: 4, fontFamily: mono }}>{TB[selB.custObj.tier]}</span>
                  )}
                </div>
              </div>
            )}

            {/* ── Type / Bay ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={GS.label}>TYPE</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {["bay", "lesson"].map(t => (
                    <button
                      key={t}
                      style={{ ...GS.togBtn, flex: 1, ...((selB.type || "bay") === t ? { background: t === "lesson" ? PURPLE : GREEN, color: "#fff" } : {}) }}
                      onClick={() => setSelB(p => ({ ...p, type: t }))}
                    >
                      {t === "lesson" ? "Lesson" : "Bay"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={GS.label}>BAY</label>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(b => {
                    const editDate  = selB.date || dateKey(resDate);
                    const editTime  = selB.time || selB.start_time;
                    const editSlots = DUR_MAP[selB.dur] || selB.duration_slots || 2;
                    const eStart    = editTime ? toH(editTime) : null;
                    const eEnd      = eStart !== null ? eStart + editSlots * 0.5 : null;
                    const isTaken   = eStart !== null && b !== selB.bay && bookings.some(bk =>
                      bk.id !== selB.id && bk.bay === b && bk.date === editDate &&
                      bk.status !== "cancelled" &&
                      toH(bk.start_time) < eEnd && (toH(bk.start_time) + (bk.duration_slots || 2) * 0.5) > eStart
                    );
                    const isSel = selB.bay === b;
                    return (
                      <button
                        key={b}
                        disabled={isTaken}
                        title={isTaken ? `Bay ${b} is already booked during this time` : ""}
                        style={{
                          ...GS.togBtn, flex: 1, padding: "7px 4px",
                          ...(isSel  ? { background: GREEN, color: "#fff", borderColor: GREEN } :
                              isTaken ? { background: "#fef2f2", color: "#E03928", borderColor: "#fecaca", cursor: "not-allowed", opacity: 0.7 } : {})
                        }}
                        onClick={() => { if (!isTaken) setSelB(p => ({ ...p, bay: b })); }}
                      >
                        {b}{isTaken ? " ✕" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Date / Time / Duration ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={GS.label}>DATE</label>
                <input type="date" style={GS.input} value={selB.date || dateKey(resDate)} onChange={e => setSelB(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label style={GS.label}>TIME</label>
                <select style={GS.select} value={selB.time || selB.start_time || "9:00 AM"} onChange={e => setSelB(p => ({ ...p, time: e.target.value }))}>
                  {SLOTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={GS.label}>DURATION</label>
                <select style={GS.select} value={selB.dur || slotsToLabel(selB.duration_slots)} onChange={e => setSelB(p => ({ ...p, dur: e.target.value }))}>
                  {DUR_LABELS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* ── Coach (lesson only) ── */}
            {(selB.type || "bay") === "lesson" && (
              <div style={{ marginBottom: 12 }}>
                <label style={GS.label}>COACH</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Santiago Espinoza", "Nicolas Cavero"].map(c => (
                    <button
                      key={c}
                      style={{ ...GS.togBtn, flex: 1, ...((selB.coach_name) === c ? { background: PURPLE, color: "#fff" } : {}) }}
                      onClick={() => setSelB(p => ({ ...p, coach_name: c }))}
                    >
                      {c.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Payment / Credits (when customer is selected) ── */}
            {(selB.custObj && !selB.isWalkIn) && (
              <div style={{ background: "#fafaf8", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <label style={GS.label}>PAYMENT</label>

                {/* Credits banner */}
                {creditInfo && creditInfo.used > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", background: GREEN + "14", borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>
                      {creditInfo.used} credit{creditInfo.used !== 1 ? "s" : ""} applied ({creditInfo.avail} available)
                    </span>
                    {creditInfo.remain > 0 && (
                      <span style={{ fontSize: 11, color: "#888" }}>· {creditInfo.remain}hr charged to card</span>
                    )}
                  </div>
                )}

                {/* Card picker */}
                {loadingCards ? (
                  <p style={{ fontSize: 12, color: "#aaa" }}>Loading cards...</p>
                ) : custCards.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#aaa" }}>No cards on file — collect payment in person or ask customer to add card in their app.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {custCards.map(card => (
                      <button
                        key={card.id}
                        style={{ ...GS.togBtn, display: "flex", alignItems: "center", gap: 8, ...(selB.cardId === card.id ? { background: GREEN, color: "#fff", borderColor: GREEN } : {}) }}
                        onClick={() => setSelB(p => ({ ...p, cardId: card.id }))}
                      >
                        {X.card(14)}
                        <span>{card.brand} •••• {card.last4}</span>
                        {card.is_default && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: "auto" }}>default</span>}
                      </button>
                    ))}
                    <button
                      style={{ ...GS.togBtn, display: "flex", alignItems: "center", gap: 6, ...(selB.cardId === "in_person" ? { background: "#888", color: "#fff", borderColor: "#888" } : {}) }}
                      onClick={() => setSelB(p => ({ ...p, cardId: "in_person" }))}
                    >
                      Pay in person
                    </button>
                  </div>
                )}

                {/* Amount preview */}
                {selB.cardId && selB.cardId !== "in_person" && (() => {
                  const durSlots = DUR_MAP[selB.dur] || 2;
                  const hrs = durSlots * 0.5;
                  const d   = new Date((selB.date || dateKey(resDate)) + "T12:00:00");
                  const isWk = d.getDay() === 0 || d.getDay() === 6;
                  const hour  = toH(selB.time || "9:00 AM");
                  const isPeak = !isWk && hour >= 17;
                  const rate  = isPeak ? cfg.pk : cfg.op;
                  const paidHrs = creditInfo ? creditInfo.remain : hrs;
                  const amount  = paidHrs * rate;
                  return (
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#888" }}>{paidHrs}hr @ ${rate}/hr {isPeak ? "(peak)" : "(non-peak)"}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono }}>${amount.toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Status (existing booking) ── */}
            {!selB.isNew && (
              <div style={{ marginBottom: 12 }}>
                <label style={GS.label}>STATUS</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {["confirmed", "checked-in", "completed", "cancelled"].map(st => (
                    <button
                      key={st}
                      style={{ ...GS.togBtn, fontSize: 11, ...(selB.status === st ? { background: st === "cancelled" ? RED : GREEN, color: "#fff" } : {}) }}
                      onClick={() => setSelB(p => ({ ...p, status: st }))}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Admin notes ── */}
            <div style={{ marginBottom: 14 }}>
              <label style={GS.label}>ADMIN NOTES (not visible to customer)</label>
              <textarea
                style={{ ...GS.input, minHeight: 60, resize: "vertical" }}
                value={selB.notes || ""}
                onChange={e => setSelB(p => ({ ...p, notes: e.target.value }))}
                placeholder="Internal notes..."
              />
            </div>

            {/* ── Validation warning ── */}
            {selB.isNew && !selB.custId && !selB.isWalkIn && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: ORANGE + "18", borderRadius: 8, marginBottom: 12 }}>
                {X.warn(14)}
                <span style={{ fontSize: 12, color: ORANGE, fontWeight: 600 }}>Search for a customer or enter new customer details above</span>
              </div>
            )}
            {selB.isNew && selB.isWalkIn && !(selB.newCustInfo?.firstName && selB.newCustInfo?.phone) && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: ORANGE + "18", borderRadius: 8, marginBottom: 12 }}>
                {X.warn(14)}
                <span style={{ fontSize: 12, color: ORANGE, fontWeight: 600 }}>First name and phone are required</span>
              </div>
            )}

            {/* ── Action buttons ── */}
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
                  <button style={{ ...S.b1, flex: 1 }} onClick={saveEdits} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  {/* Refund button — only if payment exists */}
                  {selB.square_payment_id && (
                    <button
                      style={{ ...GS.togBtn, display: "flex", alignItems: "center", gap: 4, padding: "10px 14px" }}
                      onClick={() => setRefundModal(selB)}
                    >
                      {X.refund(14)} Refund
                    </button>
                  )}
                  <button
                    style={{ ...S.bDanger, padding: "10px 14px" }}
                    onClick={cancelBooking}
                    disabled={saving}
                  >
                    {X.trash(14)} Cancel
                  </button>
                </>
              )}
              <button style={{ ...GS.togBtn, padding: "10px 14px" }} onClick={async () => { await loadBookingHistory(selB.id); setHistModal(selB.id); }}>History</button>
              <button style={{ ...GS.togBtn, padding: "10px 14px" }} onClick={closeModal}>Close</button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          REFUND MODAL
      ══════════════════════════════════════ */}
      {refundModal && (
        <div style={S.ov} onClick={() => setRefundModal(null)}>
          <div style={{ ...S.mod, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Issue Refund</h3>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              Choose how to refund Bay {refundModal.bay} · {(refundModal.duration_slots || 2) * 0.5}hr
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                style={{ ...S.b1, background: GREEN }}
                onClick={() => issueRefund(true)}
                disabled={saving}
              >
                {X.refund(14)} Refund as Credits
              </button>
              <button
                style={{ ...S.b1, background: refundModal.square_payment_id ? GREEN : "#ccc" }}
                onClick={() => issueRefund(false)}
                disabled={!refundModal.square_payment_id || saving}
              >
                {X.card(14)} Refund to Card — ${(refundModal.amount || 0).toFixed(2)}
              </button>
              {!refundModal.square_payment_id && (
                <p style={{ fontSize: 11, color: "#aaa", textAlign: "center" }}>No card payment found for this booking</p>
              )}
              <button style={{ ...GS.togBtn, width: "100%" }} onClick={() => setRefundModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

        </>
      )}

      {/* ── CHANGES & CANCELLATIONS VIEW ── */}
      {resView === "changes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: "#888" }}>All changes and cancellations for {fmtFull(resDate)}</p>
            <button style={{ ...GS.togBtn, fontSize: 11 }} onClick={loadChangeLog}>↻ Refresh</button>
          </div>
          {logLoading ? (
            <p style={{ color: "#aaa", fontSize: 13 }}>Loading...</p>
          ) : changeLog.length === 0 ? (
            <div style={S.empty}>No changes or cancellations logged for this day.</div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 14, overflow: "hidden" }}>
              {changeLog.map((row, i) => {
                const actionColor = row.action === "Cancelled" ? RED : row.action === "Created" ? GREEN : ORANGE;
                return (
                  <div key={row.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: i < changeLog.length - 1 ? "1px solid #f2f2f0" : "none" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: actionColor, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: actionColor }}>{row.action}</span>
                        {row.customerName && <span style={{ fontSize: 12, color: "#555" }}>{row.customerName}</span>}
                        {row.bay && <span style={{ fontSize: 11, color: "#aaa" }}>· Bay {row.bay}</span>}
                      </div>
                      {row.detail && <p style={{ fontSize: 11, color: "#888" }}>{row.detail}</p>}
                    </div>
                    <p style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>{fmtLogTime(row.changed_at)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* ── Booking History Modal ── */}
      {histModal && (
        <div style={S.ov} onClick={() => setHistModal(null)}>
          <div style={{ ...S.mod, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Booking History</h3>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }} onClick={() => setHistModal(null)}>✕</button>
            </div>
            {histLog.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13 }}>No history logged for this booking.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid #e8e8e6", borderRadius: 12, overflow: "hidden" }}>
                {histLog.map((row, i) => {
                  const actionColor = row.action === "Cancelled" ? RED : row.action === "Created" ? GREEN : ORANGE;
                  return (
                    <div key={row.id || i} style={{ display: "flex", gap: 12, padding: "10px 14px", borderBottom: i < histLog.length - 1 ? "1px solid #f2f2f0" : "none", background: "#fff" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: actionColor, marginTop: 4, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: actionColor }}>{row.action}</span>
                          <span style={{ fontSize: 11, color: "#aaa" }}>{fmtLogTime(row.changed_at)}</span>
                        </div>
                        {row.detail && <p style={{ fontSize: 11, color: "#666" }}>{row.detail}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

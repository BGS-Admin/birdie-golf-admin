import React, { useState, useCallback } from "react";
import { db } from "../lib/db.js";
import { sq } from "../lib/square.js";
import { gcal, coachCalendarId } from "../lib/gcal.js";
import {
  GREEN, PURPLE, RED, ORANGE, mono, ff,
  TC, TB, BK_C, SLOTS, DUR_MAP, DUR_LABELS, slotsToLabel,
  toH, dateKey, fmtFull, addDays, getSlots, cn, COACHES,
  X, GS, S,
} from "../lib/constants.jsx";

// ─── Pure pricing helpers ────────────────────────────────────────────────────

const TAX_RATE = 0.07;
const LESSON_RATE_MEMBER  = 120;
const LESSON_RATE_DEFAULT = 150;

// Prices each 30-min slot individually so mixed peak/off-peak durations are correct.
function calcBayTotal(durSlots, startTime, date, cfg) {
  const isWeekend = new Date(date + "T12:00:00").getDay() % 6 === 0;
  const startHour = toH(startTime);
  let subtotal = 0;
  for (let i = 0; i < durSlots; i++) {
    const h      = startHour + i * 0.5;
    const isPeak = !isWeekend && h >= 17;
    subtotal    += (isPeak ? cfg.pk : cfg.op) * 0.5;
  }
  subtotal       = Math.round(subtotal * 100) / 100;
  const tax      = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total    = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

// Returns credit coverage info for a member, or null for non-members / starter tier.
// EB and Champion have unlimited/window-based credits — handled separately from Player numeric credits.
function getCreditInfo(cust, durSlots) {
  if (!cust?.tier || cust.tier === "none" || cust.tier === "starter") return null;
  if (cust.tier === "early_birdie" || cust.tier === "early_birdie_founders") {
    return { isEB: true, avail: 0, needed: durSlots * 0.5, used: durSlots * 0.5, remain: 0 };
  }
  if (cust.tier === "champion") {
    return { isChampion: true, avail: 0, needed: durSlots * 0.5, used: durSlots * 0.5, remain: 0 };
  }
  // Player tier uses numeric credits
  const avail  = cust.bay_credits_remaining || 0;
  const needed = durSlots * 0.5;
  const used   = Math.min(avail, needed);
  const remain = needed - used;
  return { avail, needed, used, remain };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReservationsTab({ customers, bookings, bayBlocks, cfg, hoursConfig, fire, reload, logActivity }) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [resDate,      setResDate]      = useState(new Date());
  const [resView,      setResView]      = useState("calendar");
  const [selB,         setSelB]         = useState(null);
  const [custSearch,   setCustSearch]   = useState("");
  const [custCards,    setCustCards]    = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [lessonPkg,    setLessonPkg]    = useState(null);
  const [sqSearch,     setSqSearch]     = useState({ loading: false, results: [], done: false });
  const [refundModal,  setRefundModal]  = useState(null);
  const [histModal,    setHistModal]    = useState(null);
  const [histLog,      setHistLog]      = useState([]);
  const [changeLog,    setChangeLog]    = useState([]);
  const [logLoading,   setLogLoading]   = useState(false);
  const [saving,       setSaving]       = useState(false);

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const closeModal = useCallback(() => {
    setSelB(null);
    setCustSearch("");
    setCustCards([]);
    setLessonPkg(null);
    setRefundModal(null);
    setSqSearch({ loading: false, results: [], done: false });
  }, []);

  const loadCards = useCallback(async (custId) => {
    setLoadingCards(true);
    const cards = await db.get("payment_methods", `customer_id=eq.${custId}&select=*&order=is_default.desc`);
    setCustCards(cards || []);
    setLoadingCards(false);
  }, []);

  const loadLessonPkg = useCallback(async (custId) => {
    const pkgs = await db.get("lesson_packages", `customer_id=eq.${custId}&remaining_credits=gt.0&order=created_at.desc&limit=1`);
    setLessonPkg(pkgs?.[0] || null);
  }, []);

  // ── Square directory search ────────────────────────────────────────────────

  const searchSquareDirectory = useCallback(async (query) => {
    if (!query || query.length < 2) return;
    setSqSearch({ loading: true, results: [], done: false });
    const digits   = query.replace(/\D/g, "");
    const params   = digits.length >= 7  ? { phone: digits }
                   : query.includes("@") ? { email: query.trim() }
                   : { text: query.trim() };
    const res      = await sq("customer.search", params);
    const existing = new Set(customers.map(c => c.square_customer_id).filter(Boolean));
    const newOnes  = (res?.customers || []).filter(c => !existing.has(c.id));
    setSqSearch({ loading: false, results: newOnes, done: true });
  }, [customers]);

  const importSquareCustomer = useCallback(async (sqCust) => {
    const phone   = (sqCust.phone_number || "").replace(/\D/g, "").replace(/^1/, "");
    const newRows = await db.post("customers", {
      first_name:         sqCust.given_name  || "",
      last_name:          sqCust.family_name || "",
      phone,
      email:              sqCust.email_address || "",
      tier:               "none",
      square_customer_id: sqCust.id,
    });
    const newCust = Array.isArray(newRows) ? newRows[0] : newRows;
    if (newCust?.id) {
      setSelB(p => ({ ...p, custId: newCust.id, custObj: { ...newCust, square_customer_id: sqCust.id }, isWalkIn: false }));
      setCustSearch("");
      setSqSearch({ loading: false, results: [], done: false });
      loadCards(newCust.id);
      loadLessonPkg(newCust.id);
      reload();
    }
  }, [loadCards, loadLessonPkg, reload]);

  // ── Change log ─────────────────────────────────────────────────────────────

  const logBkChange = async (bookingId, action, detail) => {
    await db.post("booking_change_log", { booking_id: bookingId, action, detail: detail || "", changed_at: new Date().toISOString() });
    await logActivity?.(action + (detail ? ": " + detail : ""));
  };

  const loadChangeLog = async () => {
    setLogLoading(true);
    const dk      = dateKey(resDate);
    const dateBks = bookings.filter(b => b.date === dk);
    if (!dateBks.length) { setChangeLog([]); setLogLoading(false); return; }
    const ids  = dateBks.map(b => b.id).join(",");
    const rows = await db.get("booking_change_log", `booking_id=in.(${ids})&select=*&order=changed_at.desc`);
    setChangeLog((rows || []).map(r => {
      const bk   = dateBks.find(b => b.id === r.booking_id);
      const cust = bk ? customers.find(c => c.id === bk.customer_id) : null;
      return { ...r, customerName: cust ? cn(cust) : "Walk-in", bay: bk?.bay, type: bk?.type };
    }));
    setLogLoading(false);
  };

  const loadBookingHistory = async (bookingId) => {
    const rows = await db.get("booking_change_log", `booking_id=eq.${bookingId}&select=*&order=changed_at.asc`);
    setHistLog(rows || []);
  };

  const fmtLogTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " +
           d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  // ── Grid helpers ───────────────────────────────────────────────────────────

  const slots       = getSlots(resDate, hoursConfig);
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
    if (b.type === "lesson") return BK_C.lesson;
    const cust = customers.find(c => c.id === b.customer_id);
    return cust?.tier && cust.tier !== "none" ? BK_C.bay_member : BK_C.bay_walkin;
  };

  const isBlocked = (bay, slot) => {
    const dk = dateKey(resDate);
    return bayBlocks.some(bl => {
      if (!(bl.bays || []).includes(bay)) return false;
      const from = bl.from_date || bl.from;
      const to   = bl.to_date   || bl.to;
      if (dk < from || dk > to) return false;
      if (bl.all_day || bl.allDay) return true;
      const tf = bl.time_from || bl.timeFrom;
      const tt = bl.time_to   || bl.timeTo;
      if (!tf || !tt) return true;
      const h = toH(slot);
      return h >= toH(tf) && h < toH(tt);
    });
  };

  // ── Modal open ─────────────────────────────────────────────────────────────

  const openNew = (bay, slot) => {
    setSelB({ isNew: true, type: "bay", bay, time: slot, dur: "1h", date: dateKey(resDate), custId: null, custObj: null, cardId: null, notes: "" });
    setCustCards([]);
    setCustSearch("");
    setSqSearch({ loading: false, results: [], done: false });
    setLessonPkg(null);
  };

  const openExisting = (bk) => {
    const cust = customers.find(c => c.id === bk.customer_id);
    setSelB({ ...bk, isNew: false, custObj: cust || null, dur: slotsToLabel(bk.duration_slots), time: bk.start_time, notes: bk.admin_notes || "", cardId: null });
    if (cust) { loadCards(cust.id); loadLessonPkg(cust.id); }
    setCustSearch("");
  };

  // ── Create booking ─────────────────────────────────────────────────────────

  const createBooking = async () => {
    const info = selB.newCustInfo || {};
    if (!selB.custId && !(selB.isWalkIn && info.firstName && info.phone)) return;
    setSaving(true);

    let custId  = selB.custId;
    let custObj = selB.custObj;

    // Create new walk-in customer
    if (selB.isWalkIn && !custId) {
      const phone   = (info.phone || "").replace(/\D/g, "");
      const newRows = await db.post("customers", { first_name: info.firstName, last_name: info.lastName || "", phone, email: info.email || "", tier: "none" });
      const newCust = Array.isArray(newRows) ? newRows[0] : newRows;
      if (newCust?.id) {
        custId  = newCust.id;
        custObj = newCust;
        const sqResult = await sq("customer.create", { first_name: info.firstName, last_name: info.lastName || "", phone, email: info.email || "", supabase_id: custId });
        const sqId = sqResult?.customer?.id;
        if (sqId) {
          await db.patch("customers", `id=eq.${custId}`, { square_customer_id: sqId });
          custObj = { ...custObj, square_customer_id: sqId };
        }
      }
    }

    const durSlots    = DUR_MAP[selB.dur] || 2;
    const bookingDate = selB.date || dateKey(resDate);
    const bookingTime = selB.time || "9:00 AM";
    const creditInfo  = getCreditInfo(custObj, durSlots);
    const creditsUsed = creditInfo?.isEB || creditInfo?.isChampion ? durSlots * 0.5 : (creditInfo?.used || 0);
    const hasLessonPkg = !!(lessonPkg?.remaining_credits > 0 && selB.type === "lesson");

    // ── Conflict check ────────────────────────────────────────────────────────
    const newStart = toH(bookingTime);
    const newEnd   = newStart + durSlots * 0.5;
    const conflict = bookings.find(b =>
      b.bay === selB.bay && b.date === bookingDate && b.status !== "cancelled" &&
      (() => { const bs = toH(b.start_time), be = bs + (b.duration_slots || 2) * 0.5; return newStart < be && newEnd > bs; })()
    );
    if (conflict) {
      const cc = customers.find(c => c.id === conflict.customer_id);
      fire(`Bay ${selB.bay} is already booked at ${conflict.start_time}${cc ? " · " + cn(cc) : ""}. Choose a different bay or time.`);
      setSaving(false);
      return;
    }

    // ── Charge via Square catalog actions (matches booking app) ───────────────
    let sqPaymentId = null;
    const sqCard = custCards.find(c => c.id === selB.cardId);

    if (selB.cardId && selB.cardId !== "in_person" && custObj?.square_customer_id && sqCard?.square_card_id) {
      if (selB.type === "lesson") {
        if (!hasLessonPkg) {
          // Use lesson.purchase catalog action — matches booking app path, accrues loyalty
          const isMem = !!(custObj?.tier && custObj.tier !== "none");
          const chargeRes = await sq("lesson.purchase", {
            square_customer_id: custObj.square_customer_id,
            card_id:            sqCard.square_card_id,
            coach_id:           selB.coach_id || selB.coach_name,
            hours:              1,
            is_member:          isMem,
            source_name:        "BGS Admin App",
          });
          sqPaymentId = chargeRes?.payment?.id || null;
          if (chargeRes?.error || !sqPaymentId) {
            fire("Payment failed — please try again.");
            setSaving(false);
            return;
          }
        } else {
          // $0 credit lesson — create tracking order
          const orderRes = await sq("order.create", {
            square_customer_id: custObj.square_customer_id,
            apply_tax: false,
            source_name: "BGS Admin App",
            line_items: [{
              name: `Lesson Credit · ${selB.coach_name || ""}`,
              quantity: "1",
              base_price_money: { amount: 0, currency: "USD" },
            }],
          });
          sqPaymentId = orderRes?.order?.id || null;
        }
      } else {
        // Bay booking — use bay.charge catalog action (loyalty, catalog tracking, tax server-side)
        const isWeekend = new Date(bookingDate + "T12:00:00").getDay() % 6 === 0;
        const isPeak    = !isWeekend && toH(bookingTime) >= 17;
        const tierForCharge = (creditInfo?.isEB || creditInfo?.isChampion)
          ? custObj.tier.replace("_founders", "") // normalize founders → early_birdie for Square
          : custObj?.tier || "public";

        // For paid portion only: EB/Champion are $0, Player uses remaining after credits, others full
        const paidSlots = creditInfo?.isEB || creditInfo?.isChampion ? 0
                        : creditInfo ? Math.round(creditInfo.remain * 2)
                        : durSlots;

        if (paidSlots > 0) {
          const chargeRes = await sq("bay.charge", {
            square_customer_id: custObj.square_customer_id,
            card_id:            sqCard.square_card_id,
            slots:              paidSlots,
            is_peak:            isPeak,
            tier:               tierForCharge,
            note:               `Bay ${selB.bay} · ${bookingDate} · ${bookingTime} · Admin`,
            source_name:        "BGS Admin App",
          });
          sqPaymentId = chargeRes?.payment?.id || null;
          if (chargeRes?.error || !sqPaymentId) {
            fire("Payment failed — please try again.");
            setSaving(false);
            return;
          }
        } else {
          // $0 booking (full credit coverage) — tracking order only
          const orderRes = await sq("bay.charge", {
            square_customer_id: custObj.square_customer_id,
            card_id:            null,
            slots:              durSlots,
            is_peak:            isPeak,
            tier:               tierForCharge,
            note:               `Bay ${selB.bay} · ${bookingDate} · ${bookingTime} · Member Credit · Admin`,
            track_only:         true,
            source_name:        "BGS Admin App",
          });
          sqPaymentId = orderRes?.order?.id || null;
        }
      }
    }

    // Recalculate actual amount charged (for transaction record)
    let amount = 0;
    if (selB.cardId && selB.cardId !== "in_person" && sqPaymentId) {
      if (selB.type === "lesson" && !hasLessonPkg) {
        amount = custObj?.tier && custObj.tier !== "none" ? LESSON_RATE_MEMBER : LESSON_RATE_DEFAULT;
      } else if (selB.type !== "lesson") {
        const paidSlots = creditInfo?.isEB || creditInfo?.isChampion ? 0
                        : creditInfo ? Math.round(creditInfo.remain * 2)
                        : durSlots;
        if (paidSlots > 0) {
          const skipSlots = durSlots - paidSlots;
          const startHour = toH(bookingTime) + skipSlots * 0.5;
          const adjTime   = SLOTS.find(s => Math.abs(toH(s) - startHour) < 0.01) || bookingTime;
          const calc      = calcBayTotal(paidSlots, adjTime, bookingDate, cfg);
          amount = calc.total;
        }
      }
    }

    // Write booking
    const newBookingRows = await db.post("bookings", {
      customer_id:       custId || null,
      type:              selB.type || "bay",
      bay:               selB.bay  || 1,
      date:              bookingDate,
      start_time:        bookingTime,
      duration_slots:    durSlots,
      status:            "confirmed",
      amount,
      credits_used:      creditsUsed,
      discount:          0,
      coach_name:        selB.type === "lesson" ? (selB.coach_name || "") : "",
      coach_id:          selB.type === "lesson" ? (selB.coach_id || null) : null,
      admin_notes:       selB.notes || "",
      square_payment_id: sqPaymentId,
    });

    const newBookingId = Array.isArray(newBookingRows) ? newBookingRows[0]?.id : newBookingRows?.id;

    // Google Calendar — create event for Santiago's lessons
    if (selB.type === "lesson" && newBookingId) {
      const calId = coachCalendarId(selB.coach_id);
      if (calId) {
        const gcalRes = await gcal("event.create", {
          calendarId: calId,
          booking: {
            bookingId:    newBookingId,
            customerName: cn(custObj) || "Walk-in",
            date:         bookingDate,
            startTime:    bookingTime,
            bay:          selB.bay || 1,
            coachName:    selB.coach_name || "",
          },
        });
        if (gcalRes?.eventId) {
          await db.patch("bookings", `id=eq.${newBookingId}`, { google_event_id: gcalRes.eventId });
        }
      }
    }

    // Deduct bay credits (Player only — EB/Champion have unlimited)
    if (!creditInfo?.isEB && !creditInfo?.isChampion && creditsUsed > 0 && custObj?.id) {
      await db.patch("customers", `id=eq.${custObj.id}`, { bay_credits_remaining: Math.max(0, (custObj.bay_credits_remaining || 0) - creditsUsed) });
    }

    // Deduct lesson credits if package was used
    if (hasLessonPkg && lessonPkg?.id) {
      const newRemaining = Math.max(0, lessonPkg.remaining_credits - 1);
      await db.patch("lesson_packages", `id=eq.${lessonPkg.id}`, {
        remaining_credits: newRemaining,
        status: newRemaining === 0 ? "exhausted" : "active",
      });
    }

    // Transaction record
    if (custId) {
      await db.post("transactions", {
        customer_id:       custId,
        description:       `${selB.type === "lesson" ? "Lesson" : "Bay"} Booking · Bay ${selB.bay} · ${bookingTime}`,
        date:              bookingDate,
        amount,
        payment_label:     selB.cardId === "in_person" ? "In Person" : hasLessonPkg ? "Lesson Credit" : creditsUsed > 0 && amount === 0 ? "Member Credit" : "Card",
        square_payment_id: sqPaymentId,
      });
    }

    // Confirmation email
    if (custObj?.email) {
      const fmtDateStr = new Date(bookingDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      const isLesson   = selB.type === "lesson";
      const isMember   = !!(custObj?.tier && custObj.tier !== "none");

      // Lesson package credits remaining after this booking
      const pkgCreditsAfter = hasLessonPkg && lessonPkg
        ? Math.max(0, lessonPkg.remaining_credits - 1)
        : null;

      await sq("email.send", {
        customer_name:     cn(custObj) || custObj.first_name,
        customer_email:    custObj.email,
        coach:             isLesson ? (selB.coach_name || undefined) : undefined,
        date:              fmtDateStr,
        time:              bookingTime,
        bay:               "Bay " + (selB.bay || 1),
        // "Total" field — amount due
        total:             isLesson
                             ? (hasLessonPkg ? "Package Credit" : "$" + (isMember ? "120" : "150") + ".00")
                             : (amount > 0 ? "$" + amount.toFixed(2) : "To be collected"),
        // "Payment" field — status
        payment_method:    hasLessonPkg
                             ? "Package Credit"
                             : selB.cardId === "in_person"
                               ? "Pay in Person"
                               : sqPaymentId
                                 ? "Paid"
                                 : "To be collected",
        // Credits remaining — lesson packages only
        credits_remaining: pkgCreditsAfter !== null
                             ? `Remaining package credits after this lesson: ${pkgCreditsAfter}`
                             : null,
        type:              isLesson ? "lesson_booking" : "bay_booking",
        send_admin:        true,
      });
    }

    // Log creation
    if (newBookingId) {
      await logBkChange(newBookingId, "Created", `${cn(custObj) || "Walk-in"} · Bay ${selB.bay} · ${bookingTime}`);
    }

    fire("Booking created ✓");
    setSaving(false);
    closeModal();
    reload();
  };

  // ── Save edits ─────────────────────────────────────────────────────────────

  const saveEdits = async () => {
    setSaving(true);
    const durSlots = DUR_MAP[selB.dur] || selB.duration_slots || 2;
    const newBay   = selB.bay;
    const newTime  = selB.time  || selB.start_time;
    const newDate  = selB.date  || dateKey(resDate);
    const newStart = toH(newTime);
    const newEnd   = newStart + durSlots * 0.5;

    const conflict = bookings.find(b =>
      b.id !== selB.id && b.bay === newBay && b.date === newDate && b.status !== "cancelled" &&
      (() => { const bs = toH(b.start_time), be = bs + (b.duration_slots || 2) * 0.5; return newStart < be && newEnd > bs; })()
    );
    if (conflict) {
      const cc = customers.find(c => c.id === conflict.customer_id);
      fire(`Bay ${newBay} is already booked at ${conflict.start_time}${cc ? " · " + cn(cc) : ""}. Choose a different bay.`);
      setSaving(false);
      return;
    }

    const orig    = bookings.find(b => b.id === selB.id);
    const changes = [];
    if (orig) {
      if (orig.date !== newDate)                         changes.push(`${orig.date} → ${newDate}`);
      if (orig.bay !== newBay)                           changes.push(`Bay ${orig.bay} → Bay ${newBay}`);
      if (orig.start_time !== newTime)                   changes.push(`${orig.start_time} → ${newTime}`);
      if ((orig.duration_slots || 2) !== durSlots)       changes.push(`${slotsToLabel(orig.duration_slots || 2)} → ${slotsToLabel(durSlots)}`);
      if (orig.status !== selB.status)                   changes.push(`Status: ${orig.status} → ${selB.status}`);
    }

    await db.patch("bookings", `id=eq.${selB.id}`, { status: selB.status, bay: newBay, date: newDate, start_time: newTime, duration_slots: durSlots, admin_notes: selB.notes || "" });
    // Update Google Calendar event if lesson details changed
    // Also create event if this lesson never got one (e.g. booked before calendar integration)
    if (selB.type === "lesson" && changes.length > 0) {
      // Fall back to name-based lookup for old bookings that have no coach_id
      const resolvedCoachId = selB.coach_id
        || (selB.coach_name?.includes("Espinosa") ? "TMiznwW3c_E9-NTW"
          : selB.coach_name?.includes("Cavero")   ? "TMa5N23NEiU89Spy"
          : null);
      const calId = coachCalendarId(resolvedCoachId);
      if (calId) {
        const gcalBooking = {
          bookingId:    selB.id,
          customerName: cn(selB.custObj) || "Walk-in",
          date:         newDate,
          startTime:    newTime,
          bay:          newBay,
          coachName:    selB.coach_name || "",
        };
        if (selB.google_event_id) {
          // Update existing calendar event
          await gcal("event.update", { calendarId: calId, eventId: selB.google_event_id, booking: gcalBooking });
        } else {
          // No event yet (booked before integration) — create it now
          const gcalRes = await gcal("event.create", { calendarId: calId, booking: gcalBooking });
          if (gcalRes?.eventId) {
            await db.patch("bookings", `id=eq.${selB.id}`, { google_event_id: gcalRes.eventId });
          }
        }
      }
    }

    await logBkChange(selB.id, "Updated", `${cn(selB.custObj) || "Walk-in"} · ${changes.length ? changes.join(", ") : "Saved"}`);
    fire("Booking updated ✓");
    setSaving(false);
    closeModal();
    reload();
  };

  // ── Cancel booking — with refund, credit return, and email ──────────────────

  const cancelBooking = async () => {
    setSaving(true);
    const bk   = selB;
    const cust = bk.custObj;

    // Mark cancelled
    await db.patch("bookings", `id=eq.${bk.id}`, {
      status:       "cancelled",
      cancelled_at: new Date().toISOString(),
    });

    const refundParts = [];

    // Refund bay credits if any were used (Player only)
    const creditInfo = getCreditInfo(cust, bk.duration_slots || 2);
    const creditsUsed = bk.credits_used || 0;
    if (creditsUsed > 0 && cust?.id && !creditInfo?.isEB && !creditInfo?.isChampion) {
      const newCredits = cust.tier === "player"
        ? Math.min((cust.bay_credits_remaining || 0) + creditsUsed, 8)
        : (cust.bay_credits_remaining || 0) + creditsUsed;
      await db.patch("customers", `id=eq.${cust.id}`, { bay_credits_remaining: newCredits });
      refundParts.push(`${creditsUsed} hr credit${creditsUsed !== 1 ? "s" : ""} returned`);
    }

    // Refund card charge if any money was paid
    if (bk.square_payment_id && bk.amount > 0 && !bk.square_payment_id.startsWith("POS_PAID")) {
      await sq("payment.refund", {
        payment_id: bk.square_payment_id,
        amount:     bk.amount,
        reason:     "Admin cancellation",
      });
      refundParts.push(`$${Number(bk.amount).toFixed(2)} refunded to card`);
    }

    // Transaction record
    const refundDesc = refundParts.length > 0
      ? refundParts.join(" + ") + " · Cancelled by admin"
      : "No refund applicable · Cancelled by admin";

    if (cust?.id) {
      await db.post("transactions", {
        customer_id:   cust.id,
        description:   `Cancellation · ${bk.type === "lesson" ? "Lesson" : "Bay " + bk.bay} · ${bk.date} · ${bk.start_time || bk.time} — ${refundDesc}`,
        date:          dateKey(new Date()),
        amount:        bk.amount > 0 && bk.square_payment_id ? -(bk.amount) : 0,
        payment_label: bk.amount > 0 ? "Refund" : "N/A",
      });
    }

    // Cancellation emails — customer + staff
    if (cust?.email) {
      const emailPayload = {
        customer_email: cust.email,
        customer_name:  cn(cust),
        booking_type:   bk.type === "lesson" ? "Lesson" : "Bay Booking",
        bay:            bk.bay ? "Bay " + bk.bay : null,
        date:           bk.date,
        time:           bk.start_time || bk.time,
        refund_info:    refundDesc,
      };
      await sq("email.send", { type: "cancellation", ...emailPayload });
      await sq("email.send", { type: "cancellation", ...emailPayload, customer_email: "info@birdiegolfstudios.com", customer_name: "Staff" });
    }

    // Delete Google Calendar event if this was a lesson
    if (bk.type === "lesson" && bk.google_event_id) {
      const resolvedCoachId = bk.coach_id
        || (bk.coach_name?.includes("Espinosa") ? "TMiznwW3c_E9-NTW"
          : bk.coach_name?.includes("Cavero")   ? "TMa5N23NEiU89Spy"
          : null);
      const calId = coachCalendarId(resolvedCoachId);
      if (calId) {
        await gcal("event.delete", { calendarId: calId, eventId: bk.google_event_id });
      }
    }

    await logBkChange(bk.id, "Cancelled", `${cn(cust) || "Walk-in"} · Bay ${bk.bay} · ${bk.start_time || bk.time} · ${refundDesc}`);
    fire(refundParts.length > 0 ? "Cancelled · " + refundParts.join(" + ") : "Booking cancelled");
    setSaving(false);
    closeModal();
    reload();
  };

  // ── Refund ─────────────────────────────────────────────────────────────────

  const issueRefund = async (asCredits) => {
    if (!refundModal) return;
    setSaving(true);
    const bk   = refundModal;
    const cust = customers.find(c => c.id === bk.customer_id);

    if (asCredits && cust) {
      const back = (bk.duration_slots || 2) * 0.5;
      await db.patch("customers", `id=eq.${cust.id}`, { bay_credits_remaining: (cust.bay_credits_remaining || 0) + back });
      await db.post("transactions", { customer_id: cust.id, description: `Refund (credits) · Bay ${bk.bay}`, date: dateKey(new Date()), amount: back, payment_label: "Credits" });
      fire(`${back} credits refunded ✓`);
    } else if (!asCredits && bk.square_payment_id) {
      await sq("payment.refund", { payment_id: bk.square_payment_id, amount: bk.amount || 0, reason: "Admin refund" });
      await db.post("transactions", { customer_id: bk.customer_id, description: `Refund · Bay ${bk.bay}`, date: dateKey(new Date()), amount: -(bk.amount || 0), payment_label: "Refund" });
      fire("Refund issued ✓");
    } else {
      fire("No payment on file to refund");
    }

    setSaving(false);
    setRefundModal(null);
    closeModal();
    reload();
  };

  // ── Amount preview for new booking payment section ─────────────────────────

  const creditInfo = selB ? getCreditInfo(selB.custObj, DUR_MAP[selB.dur] || 2) : null;

  const getAmountPreview = () => {
    if (!selB?.custObj || selB.isWalkIn) return null;
    const isLes  = selB.type === "lesson";
    const noCard = custCards.length === 0 && !loadingCards;

    if (isLes) {
      if (lessonPkg?.remaining_credits > 0) return { type: "lesson_credit", pkg: lessonPkg, noCard };
      const isMem = !!(selB.custObj.tier && selB.custObj.tier !== "none");
      return { type: "lesson", price: isMem ? LESSON_RATE_MEMBER : LESSON_RATE_DEFAULT, isMem, noCard };
    }

    const durSlots  = DUR_MAP[selB.dur] || 2;
    const date      = selB.date || dateKey(resDate);
    const startHour = toH(selB.time || "9:00 AM");

    // Early Birdie and Champion: $0 — fully covered
    if (creditInfo?.isEB) {
      return { type: "bay_eb", totalHrs: durSlots * 0.5, noCard };
    }
    if (creditInfo?.isChampion) {
      return { type: "bay_champion", totalHrs: durSlots * 0.5, noCard };
    }

    const paidSlots = creditInfo ? Math.round(creditInfo.remain * 2) : durSlots;
    const skipSlots = durSlots - paidSlots;

    let subtotal = 0;
    for (let i = skipSlots; i < durSlots; i++) {
      const h      = startHour + i * 0.5;
      const isPeak = !(new Date(date + "T12:00:00").getDay() % 6 === 0) && h >= 17;
      subtotal    += (isPeak ? cfg.pk : cfg.op) * 0.5;
    }
    subtotal       = Math.round(subtotal * 100) / 100;
    const tax      = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total    = Math.round((subtotal + tax) * 100) / 100;
    return { type: "bay", subtotal, tax, total, paidHrs: paidSlots * 0.5, creditInfo, noCard };
  };

  const preview = selB?.isNew ? getAmountPreview() : null;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", background: "#f0f0ee", borderRadius: 8, padding: 3, gap: 3 }}>
            {[["calendar", "Calendar"], ["changes", "Changes & Cancellations"]].map(([v, l]) => (
              <button key={v}
                style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: ff,
                  background: resView === v ? "#fff" : "transparent", color: resView === v ? "#1a1a1a" : "#888",
                  boxShadow: resView === v ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}
                onClick={() => { setResView(v); if (v === "changes") loadChangeLog(); }}>{l}</button>
            ))}
          </div>
          <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12, background: "#4A6FA5" }} onClick={reload}>↻ Refresh</button>
          <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={() => openNew(1, "9:00 AM")}>{X.plus(14)} New Booking</button>
        </div>
      </div>

      {/* ── Calendar view ── */}
      {resView === "calendar" && (<>

        {/* Legend */}
        <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
          {[["Member Bay", BK_C.bay_member], ["Walk-in Bay", BK_C.bay_walkin], ["Lesson", BK_C.lesson], ["Blocked", RED]].map(([l, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
              <span style={{ fontSize: 10, color: "#888" }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Bay grid */}
        <div style={{ display: "grid", gridTemplateColumns: "80px repeat(5,1fr)", border: "1px solid #e8e8e6", borderRadius: 12, overflow: "hidden", background: "#fff", minWidth: 700 }}>
          <div style={GS.hdr}><span style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>TIME</span></div>
          {[1,2,3,4,5].map(b => <div key={b} style={GS.hdr}><span style={{ fontSize: 13, fontWeight: 700 }}>Bay {b}</span></div>)}

          {(() => {
            const rendered = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
            return slots.map(slot => (
              <React.Fragment key={slot}>
                <div style={GS.timeCell}>
                  <span style={{ fontSize: 11, color: "#888", fontFamily: mono }}>{slot}</span>
                </div>
                {[1,2,3,4,5].map(bay => {
                  const bk      = getBkAt(bay, slot);
                  const blocked = isBlocked(bay, slot);

                  if (bk && !rendered[bay].has(bk.id)) {
                    rendered[bay].add(bk.id);
                    const cust    = customers.find(c => c.id === bk.customer_id);
                    const color   = getBkColor(bk);
                    const notPaid = !bk.square_payment_id && bk.customer_id && bk.status !== "cancelled";
                    const h       = (bk.duration_slots || 2) * 29 - 2;
                    return (
                      <div key={bay} style={{ ...GS.cell, position: "relative" }}>
                        <div style={{ ...GS.booking, background: color, borderLeft: `3px solid ${color}`, height: h, cursor: "pointer", zIndex: 3 }} onClick={() => openExisting(bk)}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#fff", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                            {cust ? cn(cust) : "Walk-in"}
                          </p>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 1 }}>
                            {cust?.tier && cust.tier !== "none" && <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.25)", padding: "1px 4px", borderRadius: 3, fontFamily: mono }}>{TB[cust.tier]}</span>}
                            {bk.type === "lesson" && bk.coach_name && <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.25)", padding: "1px 4px", borderRadius: 3, fontFamily: mono }}>{bk.coach_name.split(" ").map(w => w[0]).join("")}</span>}
                            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.8)" }}>{(bk.duration_slots || 2) * 0.5}hr</span>
                            {bk.credits_used > 0 && <span style={{ fontSize: 7, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.2)", padding: "1px 4px", borderRadius: 3 }}>CR</span>}
                            {notPaid && <span style={{ fontSize: 7, fontWeight: 800, color: "#fff", background: RED, padding: "1px 4px", borderRadius: 3 }}>NOT PAID</span>}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  if (bk && rendered[bay].has(bk.id)) return <div key={bay} style={GS.cell} />;
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

        {/* ══ BOOKING MODAL ══ */}
        {selB && (
          <div style={S.ov} onClick={closeModal}>
            <div style={S.mod} onClick={e => e.stopPropagation()}>

              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                {selB.isNew ? "New Booking" : "Booking Details"}
              </h3>

              {/* Customer section */}
              {selB.isNew ? (
                <div style={{ marginBottom: 14 }}>
                  <label style={GS.label}>CUSTOMER *</label>

                  {!selB.isWalkIn && !selB.custObj && (<>
                    <input
                      style={GS.input}
                      placeholder="Search by name, phone, or email..."
                      value={custSearch}
                      onChange={e => { setCustSearch(e.target.value); setSqSearch({ loading: false, results: [], done: false }); }}
                    />
                    {custSearch && (
                      <div style={{ border: "1px solid #e8e8e6", borderRadius: 8, marginTop: 4, maxHeight: 280, overflowY: "auto" }}>
                        {customers
                          .filter(c => cn(c).toLowerCase().includes(custSearch.toLowerCase()) || (c.phone || "").includes(custSearch))
                          .slice(0, 8)
                          .map(c => (
                            <div key={c.id} style={{ padding: "8px 12px", borderBottom: "1px solid #f2f2f0", cursor: "pointer", fontSize: 13 }}
                              onClick={() => { setSelB(p => ({ ...p, custId: c.id, custObj: c, cardId: null, isWalkIn: false })); setCustSearch(""); loadCards(c.id); loadLessonPkg(c.id); }}>
                              <span style={{ fontWeight: 600 }}>{cn(c)}</span>
                              <span style={{ color: "#888", fontSize: 11, marginLeft: 6 }}>{c.phone}</span>
                              {c.tier && c.tier !== "none" && <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", background: TC[c.tier], padding: "2px 6px", borderRadius: 4, marginLeft: 6, fontFamily: mono }}>{TB[c.tier]}</span>}
                            </div>
                          ))}
                        {customers.filter(c => cn(c).toLowerCase().includes(custSearch.toLowerCase()) || (c.phone || "").includes(custSearch)).length === 0 && (
                          <div style={{ padding: "8px 12px", fontSize: 12, color: "#aaa" }}>No customers found in app</div>
                        )}
                        <div style={{ padding: "10px 12px", fontSize: 12, cursor: "pointer", color: "#4A6FA5", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid #f2f2f0", background: "#f8fbff" }}
                          onClick={() => searchSquareDirectory(custSearch)}>
                          {X.search(13)} Search Square directory for unregistered customers
                        </div>
                        {sqSearch.loading && <div style={{ padding: "8px 12px", fontSize: 12, color: "#aaa", fontStyle: "italic" }}>Searching Square...</div>}
                        {sqSearch.done && sqSearch.results.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12, color: "#aaa" }}>No unregistered customers found in Square</div>}
                        {sqSearch.results.map(sqC => (
                          <div key={sqC.id} style={{ padding: "10px 12px", borderTop: "1px solid #f2f2f0", cursor: "pointer", background: "#f8f4ff" }} onClick={() => importSquareCustomer(sqC)}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{[sqC.given_name, sqC.family_name].filter(Boolean).join(" ") || "Unknown"}</span>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: "#4A6FA5", padding: "1px 5px", borderRadius: 3 }}>SQ</span>
                              <span style={{ fontSize: 10, color: "#4A6FA5", fontWeight: 600, marginLeft: "auto" }}>+ Import & Select</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#888" }}>
                              {sqC.phone_number && <span>{sqC.phone_number}</span>}
                              {sqC.email_address && <span style={{ marginLeft: 8 }}>{sqC.email_address}</span>}
                            </div>
                          </div>
                        ))}
                        <div style={{ padding: "10px 12px", fontSize: 12, cursor: "pointer", color: GREEN, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid #f2f2f0" }}
                          onClick={() => { setSelB(p => ({ ...p, isWalkIn: true, newCustInfo: { firstName: "", lastName: "", phone: custSearch.replace(/\D/g, ""), email: "", cardName: "", cardNumber: "", cardExp: "", cardCvc: "" } })); setCustSearch(""); }}>
                          {X.plus(13)} Add new customer
                        </div>
                      </div>
                    )}
                  </>)}

                  {!selB.isWalkIn && selB.custObj && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: GREEN + "10", borderRadius: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{cn(selB.custObj)}</span>
                      {selB.custObj.tier && selB.custObj.tier !== "none" && <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: TC[selB.custObj.tier], padding: "2px 6px", borderRadius: 4, fontFamily: mono }}>{TB[selB.custObj.tier]}</span>}
                      <button style={{ marginLeft: "auto", fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }}
                        onClick={() => { setSelB(p => ({ ...p, custId: null, custObj: null, cardId: null })); setCustCards([]); setLessonPkg(null); }}>Change</button>
                    </div>
                  )}

                  {selB.isWalkIn && (
                    <div style={{ background: "#fafaf8", border: "1px solid #e8e8e6", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>NEW CUSTOMER INFO</span>
                        <button style={{ fontSize: 11, color: "#aaa", background: "none", border: "none", cursor: "pointer" }} onClick={() => setSelB(p => ({ ...p, isWalkIn: false, newCustInfo: null }))}>Back to search</button>
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
                      <div style={{ borderTop: "1px solid #e8e8e6", paddingTop: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 8 }}>CARD ON FILE (optional)</span>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ ...GS.label, fontSize: 10 }}>NAME ON CARD</label>
                          <input style={GS.input} value={selB.newCustInfo?.cardName || ""} onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardName: e.target.value } }))} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 2 }}>
                            <label style={{ ...GS.label, fontSize: 10 }}>CARD NUMBER</label>
                            <input style={GS.input} placeholder="4242 4242 4242 4242" maxLength={19} value={selB.newCustInfo?.cardNumber || ""}
                              onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,16); setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardNumber: v.match(/.{1,4}/g)?.join(" ") || v } })); }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ ...GS.label, fontSize: 10 }}>EXP (MM/YY)</label>
                            <input style={GS.input} placeholder="12/27" maxLength={5} value={selB.newCustInfo?.cardExp || ""}
                              onChange={e => { let v = e.target.value.replace(/\D/g,"").slice(0,4); if (v.length > 2) v = v.slice(0,2)+"/"+v.slice(2); setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardExp: v } })); }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ ...GS.label, fontSize: 10 }}>CVC</label>
                            <input style={GS.input} placeholder="123" maxLength={4} value={selB.newCustInfo?.cardCvc || ""}
                              onChange={e => setSelB(p => ({ ...p, newCustInfo: { ...p.newCustInfo, cardCvc: e.target.value.replace(/\D/g,"").slice(0,4) } }))} />
                          </div>
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
                    {["bay", "lesson"].map(t => (
                      <button key={t} style={{ ...GS.togBtn, flex: 1, ...((selB.type || "bay") === t ? { background: t === "lesson" ? PURPLE : GREEN, color: "#fff" } : {}) }}
                        onClick={() => setSelB(p => ({ ...p, type: t }))}>
                        {t === "lesson" ? "Lesson" : "Bay"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={GS.label}>BAY</label>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1,2,3,4,5].map(b => (
                      <button key={b} style={{ ...GS.togBtn, flex: 1, padding: "7px 4px", ...(selB.bay === b ? { background: GREEN, color: "#fff" } : {}) }}
                        onClick={() => setSelB(p => ({ ...p, bay: b }))}>{b}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date / Time / Duration */}
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

              {/* Coach (lesson only) */}
              {(selB.type || "bay") === "lesson" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={GS.label}>COACH</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {COACHES.map(c => (
                      <button key={c.id} style={{ ...GS.togBtn, flex: 1, ...(selB.coach_id === c.id ? { background: PURPLE, color: "#fff" } : {}) }}
                        onClick={() => setSelB(p => ({ ...p, coach_id: c.id, coach_name: c.name }))}>
                        {c.name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment section */}
              {selB.custObj && !selB.isWalkIn && (
                selB.square_payment_id && selB.amount > 0 ? (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>✓ Paid ${Number(selB.amount).toFixed(2)}</span>
                    <span style={{ fontSize: 11, color: "#888", marginLeft: "auto" }}>via {selB.custObj.first_name}'s card on file</span>
                  </div>
                ) : !selB.isNew ? (
                  <div style={{ background: "#fafaf8", border: "1px solid #e8e8e6", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: RED }}>● Not paid</span>
                    <button style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: GREEN, background: GREEN + "14", border: `1px solid ${GREEN}44`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: ff }}
                      onClick={async () => {
                        const durSlots = DUR_MAP[selB.dur] || selB.duration_slots || 2;
                        const calc     = calcBayTotal(durSlots, selB.time || selB.start_time, selB.date || dateKey(resDate), cfg);
                        await db.patch("bookings", `id=eq.${selB.id}`, { square_payment_id: "POS_PAID", amount: calc.total });
                        await logBkChange(selB.id, "Marked as Paid", `$${calc.total.toFixed(2)} via Square POS`);
                        fire("Marked as paid ✓");
                        setSelB(p => ({ ...p, square_payment_id: "POS_PAID", amount: calc.total }));
                        reload();
                      }}>Mark as Paid (Square POS)</button>
                  </div>
                ) : (
                  <div style={{ background: "#fafaf8", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <label style={GS.label}>PAYMENT</label>
                    {loadingCards ? (
                      <p style={{ fontSize: 12, color: "#aaa" }}>Loading cards...</p>
                    ) : custCards.length === 0 ? (
                      <p style={{ fontSize: 12, color: "#aaa" }}>No cards on file — collect payment in person or ask customer to add card in their app.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {custCards.map(card => (
                          <button key={card.id}
                            style={{ ...GS.togBtn, display: "flex", alignItems: "center", gap: 8, ...(selB.cardId === card.id ? { background: GREEN, color: "#fff", borderColor: GREEN } : {}) }}
                            onClick={() => setSelB(p => ({ ...p, cardId: card.id }))}>
                            {X.card(14)}
                            <span>{card.brand} •••• {card.last4}</span>
                            {card.is_default && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: "auto" }}>default</span>}
                          </button>
                        ))}
                        <button style={{ ...GS.togBtn, ...(selB.cardId === "in_person" ? { background: "#888", color: "#fff", borderColor: "#888" } : {}) }}
                          onClick={() => setSelB(p => ({ ...p, cardId: "in_person" }))}>Pay in person</button>
                      </div>
                    )}

                    {/* Amount preview — dynamic, always visible once customer is selected */}
                    {preview && (
                      <div style={{ marginTop: 10, borderTop: "1px solid #f0f0ee", paddingTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                        {(preview.type === "bay_eb" || preview.type === "bay_champion") && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>
                              {preview.type === "bay_eb" ? "Early Birdie — Included (8am–4pm window)" : "Champion — Unlimited"}
                            </span>
                            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: GREEN }}>$0.00</span>
                          </div>
                        )}

                        {preview.type === "lesson_credit" && (<>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>1 lesson credit applied</span>
                            <span style={{ fontSize: 12, color: "#888" }}>{preview.pkg.remaining_credits} remaining</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f0f0ee", paddingTop: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
                            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: GREEN }}>$0.00</span>
                          </div>
                        </>)}

                        {preview.type === "lesson" && (<>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: "#888" }}>1hr Lesson · {preview.isMem ? "Member rate" : "Non-member rate"}</span>
                            <span style={{ fontSize: 12, color: "#888" }}>${preview.price}.00</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f0f0ee", paddingTop: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{preview.noCard ? "Amount to Collect" : "Total"}</span>
                            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: preview.noCard ? ORANGE : "#1a1a1a" }}>${preview.price}.00</span>
                          </div>
                          {preview.noCard && <p style={{ fontSize: 11, color: ORANGE, fontWeight: 600 }}>⚠ No card on file — collect ${preview.price}.00 in person</p>}
                          <p style={{ fontSize: 11, color: "#aaa" }}>Lessons are not subject to sales tax.</p>
                        </>)}

                        {preview.type === "bay" && (<>
                          {preview.creditInfo?.used > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 12, color: GREEN }}>{preview.creditInfo.used} credit{preview.creditInfo.used !== 1 ? "s" : ""} applied ({preview.creditInfo.avail} available)</span>
                              <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>{preview.creditInfo.used}hr covered</span>
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: "#888" }}>{preview.paidHrs}hr subtotal</span>
                            <span style={{ fontSize: 12, color: "#888" }}>${preview.subtotal.toFixed(2)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: "#888" }}>Tax (7%)</span>
                            <span style={{ fontSize: 12, color: "#888" }}>${preview.tax.toFixed(2)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f0f0ee", paddingTop: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{preview.noCard ? "Amount to Collect" : "Total"}</span>
                            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: preview.noCard ? ORANGE : "#1a1a1a" }}>${preview.total.toFixed(2)}</span>
                          </div>
                          {preview.noCard && <p style={{ fontSize: 11, color: ORANGE, fontWeight: 600 }}>⚠ No card on file — collect ${preview.total.toFixed(2)} in person</p>}
                        </>)}
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Status (existing bookings only) */}
              {!selB.isNew && (
                <div style={{ marginBottom: 12 }}>
                  <label style={GS.label}>STATUS</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["confirmed", "checked-in", "completed", "cancelled"].map(st => (
                      <button key={st} style={{ ...GS.togBtn, fontSize: 11, ...(selB.status === st ? { background: st === "cancelled" ? RED : GREEN, color: "#fff" } : {}) }}
                        onClick={() => setSelB(p => ({ ...p, status: st }))}>{st}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin notes */}
              <div style={{ marginBottom: 14 }}>
                <label style={GS.label}>ADMIN NOTES (not visible to customer)</label>
                <textarea style={{ ...GS.input, minHeight: 60, resize: "vertical" }} value={selB.notes || ""} onChange={e => setSelB(p => ({ ...p, notes: e.target.value }))} placeholder="Internal notes..." />
              </div>

              {/* Validation warnings */}
              {selB.isNew && !selB.custId && !selB.isWalkIn && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: ORANGE + "18", borderRadius: 8, marginBottom: 12 }}>
                  {X.warn(14)}<span style={{ fontSize: 12, color: ORANGE, fontWeight: 600 }}>Search for a customer or enter new customer details above</span>
                </div>
              )}
              {selB.isNew && selB.isWalkIn && !(selB.newCustInfo?.firstName && selB.newCustInfo?.phone) && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: ORANGE + "18", borderRadius: 8, marginBottom: 12 }}>
                  {X.warn(14)}<span style={{ fontSize: 12, color: ORANGE, fontWeight: 600 }}>First name and phone are required</span>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selB.isNew ? (
                  <button
                    style={{ ...S.b1, flex: 1, opacity: (selB.custId || (selB.isWalkIn && selB.newCustInfo?.firstName && selB.newCustInfo?.phone)) ? 1 : 0.35 }}
                    disabled={!selB.custId && !(selB.isWalkIn && selB.newCustInfo?.firstName && selB.newCustInfo?.phone) || saving}
                    onClick={createBooking}>
                    {saving ? "Saving..." : "Create Booking"}
                  </button>
                ) : (<>
                  <button style={{ ...S.b1, flex: 1 }} onClick={saveEdits} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                  {selB.square_payment_id && (
                    <button style={{ ...GS.togBtn, display: "flex", alignItems: "center", gap: 4, padding: "10px 14px" }} onClick={() => setRefundModal(selB)}>
                      {X.refund(14)} Refund
                    </button>
                  )}
                  <button style={{ ...S.bDanger, padding: "10px 14px" }} onClick={cancelBooking} disabled={saving}>{X.trash(14)} Cancel</button>
                </>)}
                <button style={{ ...GS.togBtn, padding: "10px 14px" }} onClick={async () => { await loadBookingHistory(selB.id); setHistModal(selB.id); }}>History</button>
                <button style={{ ...GS.togBtn, padding: "10px 14px" }} onClick={closeModal}>Close</button>
              </div>

            </div>
          </div>
        )}

        {/* ══ REFUND MODAL ══ */}
        {refundModal && (
          <div style={S.ov} onClick={() => setRefundModal(null)}>
            <div style={{ ...S.mod, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Issue Refund</h3>
              <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Choose how to refund Bay {refundModal.bay} · {(refundModal.duration_slots || 2) * 0.5}hr</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button style={{ ...S.b1, background: GREEN }} onClick={() => issueRefund(true)} disabled={saving}>{X.refund(14)} Refund as Credits</button>
                <button style={{ ...S.b1, background: refundModal.square_payment_id ? GREEN : "#ccc" }} onClick={() => issueRefund(false)} disabled={!refundModal.square_payment_id || saving}>
                  {X.card(14)} Refund to Card — ${(refundModal.amount || 0).toFixed(2)}
                </button>
                {!refundModal.square_payment_id && <p style={{ fontSize: 11, color: "#aaa", textAlign: "center" }}>No card payment found for this booking</p>}
                <button style={{ ...GS.togBtn, width: "100%" }} onClick={() => setRefundModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

      </>)}

      {/* ── Changes & Cancellations view ── */}
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
                const c = row.action === "Cancelled" ? RED : row.action === "Created" ? GREEN : ORANGE;
                return (
                  <div key={row.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: i < changeLog.length - 1 ? "1px solid #f2f2f0" : "none" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{row.action}</span>
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
              <div style={{ display: "flex", flexDirection: "column", border: "1px solid #e8e8e6", borderRadius: 12, overflow: "hidden" }}>
                {histLog.map((row, i) => {
                  const c = row.action === "Cancelled" ? RED : row.action === "Created" ? GREEN : ORANGE;
                  return (
                    <div key={row.id || i} style={{ display: "flex", gap: 12, padding: "10px 14px", borderBottom: i < histLog.length - 1 ? "1px solid #f2f2f0" : "none", background: "#fff" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, marginTop: 4, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{row.action}</span>
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

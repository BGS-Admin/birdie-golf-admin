import React, { useState, useCallback, useEffect, useRef } from "react";
import { db } from "./lib/db.js";
import { CSS, S, TEAM, X, ff, mono, GREEN, FD_LOCK_MINUTES } from "./lib/constants.jsx";
import ReservationsTab from "./tabs/ReservationsTab.jsx";
import CustomersTab    from "./tabs/CustomersTab.jsx";
import MembersTab      from "./tabs/MembersTab.jsx";
import FacilityTab     from "./tabs/FacilityTab.jsx";
import ReportsTab      from "./tabs/ReportsTab.jsx";

// ⚠️  PRE-LAUNCH TODO: Add proper authentication before going live.
//     - Owners: PIN login (Daniel=1212, Marco=0101) or Supabase Auth
//     - Front Desk: 4-digit PIN (stored in admin_settings), auto-lock after 2hrs
//     - Both apps need enhanced security — see security notes in project docs.

const LS = {
  w:  { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(155deg,#0B2E1A,#1A5C3A 45%,#2D8A5E)", fontFamily: ff, padding: 20 },
  c:  { background: "#fff", borderRadius: 22, padding: "32px 28px", width: "100%", maxWidth: 400, boxShadow: "0 28px 80px rgba(0,0,0,0.28)" },
  rb: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid #e8e8e6", borderRadius: 12, background: "#fff", cursor: "pointer", fontFamily: ff, width: "100%", marginBottom: 6 },
  ri: { width: 40, height: 40, borderRadius: 10, background: "#124A2B", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, fontFamily: mono, flexShrink: 0 },
};

export default function AdminApp() {
  const [logged,      setLogged]      = useState(false);
  const [uN,          setUN]          = useState("");
  const [userRole,    setUserRole]    = useState("");
  const [view,        setView]        = useState("res");
  const [toast,       setToast]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const lockTimer                     = useRef(null);

  // PIN login state
  const [pinStep,      setPinStep]      = useState(null);  // null | {team member obj}
  const [pinEntry,     setPinEntry]     = useState("");
  const [pinError,     setPinError]     = useState("");
  const [pinFails,     setPinFails]     = useState(0);
  const [pinLocked,    setPinLocked]    = useState(0);     // timestamp when lockout ends
  const [changePinModal, setChangePinModal] = useState(false);
  const [cpStep,       setCpStep]       = useState(1);     // 1=current, 2=new, 3=confirm
  const [cpCurrent,    setCpCurrent]    = useState("");
  const [cpNew,        setCpNew]        = useState("");
  const [cpConfirm,    setCpConfirm]    = useState("");
  const [cpError,      setCpError]      = useState("");
  const [cpSaving,     setCpSaving]     = useState(false);

  // Owner PINs loaded from admin_settings
  const [danielPin,    setDanielPin]    = useState("1212");
  const [marcoPin,     setMarcoPin]     = useState("0101");

  // Front desk staff (loaded from Supabase)
  const [fdStaff,      setFdStaff]      = useState([]);
  const [fdStaffStep,  setFdStaffStep]  = useState(null); // selected staff member

  const [customers,   setCustomers]   = useState([]);
  const [bookings,    setBookings]    = useState([]);
  const [bayBlocks,   setBayBlocks]   = useState([]);
  const [cfg,         setCfg]         = useState({ pk: 75, op: 50, wk: 50 });
  const [hoursConfig, setHoursConfig] = useState(null);
  const [fdPin,       setFdPin]       = useState("2025");
  const [enrollmentFeeEnabled, setEnrollmentFeeEnabled] = useState(true);

  /* ── Load settings on mount ── */
  useEffect(() => {
    db.get("front_desk_staff", "select=*&order=id.asc&active=eq.true").then(rows => {
      if (rows?.length) setFdStaff(rows);
    });
    db.get("admin_settings", "select=*&limit=1").then(rows => {
      if (rows?.[0]) {
        if (rows[0].fd_pin)     setFdPin(rows[0].fd_pin);
        if (rows[0].daniel_pin) setDanielPin(rows[0].daniel_pin);
        if (rows[0].marco_pin)  setMarcoPin(rows[0].marco_pin);
        if (rows[0].weekday_open) setHoursConfig({
          weekday_open:  rows[0].weekday_open,
          weekday_close: rows[0].weekday_close,
          weekend_open:  rows[0].weekend_open,
          weekend_close: rows[0].weekend_close,
        });
        if (rows[0].enrollment_fee_enabled !== undefined) setEnrollmentFeeEnabled(rows[0].enrollment_fee_enabled !== false);
      }
    });
  }, []);

  /* ── Activity logger ── */
  const logActivity = useCallback(async (action) => {
    await db.post("admin_activity_log", {
      user_name: uN,
      user_role: userRole,
      action,
      logged_at: new Date().toISOString(),
    });
  }, [uN, userRole]);

  const fire = useCallback(m => {
    setToast(m);
    setTimeout(() => setToast(null), 3200);
  }, []);

  /* ── Front Desk auto-lock (2hrs) ── */
  const startLockTimer = useCallback(() => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => {
      setLogged(false); setView("res"); setUN(""); setUserRole("");
    }, FD_LOCK_MINUTES * 60 * 1000);
  }, []);

  /* ── Data loader ── */
  const load = useCallback(async () => {
    setLoading(true);
    const [c, b, bl, pr, settings] = await Promise.all([
      db.get("customers",      "select=*&order=created_at.desc"),
      db.get("bookings",       "select=*&order=created_at.desc&limit=500"),
      db.get("bay_blocks",     "select=*"),
      db.get("pricing_config", "select=*"),
      db.get("admin_settings", "select=*&limit=1"),
    ]);
    setCustomers(c  || []);
    setBookings( b  || []);
    setBayBlocks(bl || []);
    if (pr?.[0]) setCfg({ pk: pr[0].peak_rate, op: pr[0].off_peak_rate, wk: pr[0].weekend_rate });
    // load front desk staff
    const staff = await db.get("front_desk_staff", "select=*&order=id.asc&active=eq.true");
    if (staff?.length) setFdStaff(staff);

    if (settings?.[0]) {
      if (settings[0].fd_pin)     setFdPin(settings[0].fd_pin);
      if (settings[0].daniel_pin) setDanielPin(settings[0].daniel_pin);
      if (settings[0].marco_pin)  setMarcoPin(settings[0].marco_pin);
      if (settings[0].weekday_open) setHoursConfig({
        weekday_open:  settings[0].weekday_open,
        weekday_close: settings[0].weekday_close,
        weekend_open:  settings[0].weekend_open,
        weekend_close: settings[0].weekend_close,
      });
      if (settings[0].enrollment_fee_enabled !== undefined) setEnrollmentFeeEnabled(settings[0].enrollment_fee_enabled !== false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (logged) load(); }, [logged, load]);

  /* ── Keyboard input for PIN pad ── */
  useEffect(() => {
    const onKey = (e) => {
      if (!pinStep) return;
      if (e.key >= "0" && e.key <= "9") handlePinKey(e.key);
      if (e.key === "Backspace") handlePinKey("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinStep, pinEntry, pinFails, pinError]);

  /* ── PIN helpers ── */
  // For the combined Admin button, resolve which owner entered the PIN
  const resolveAdmin = (pin) => {
    if (pin === danielPin) return { name: "Daniel Duran", field: "daniel_pin" };
    if (pin === marcoPin)  return { name: "Marco Montilla", field: "marco_pin" };
    return null;
  };

  const getPinForMember = (t) => {
    // front desk staff: pin stored on the staff object itself
    if (t.role === "front_desk") return t.pin;
    return null; // admin: checked differently via resolveAdmin
  };

  const handleNameClick = (t) => {
    if (t.id === "TMfd") {
      // show staff picker instead of PIN pad directly
      setFdStaffStep("pick");
      return;
    }
    setPinStep(t);
    setPinEntry("");
    setPinError("");
    setPinFails(0);
  };

  const handleStaffPick = (staffMember) => {
    setFdStaffStep(null);
    setPinStep({ ...staffMember, role: "front_desk", id: "fd_" + staffMember.id });
    setPinEntry("");
    setPinError("");
    setPinFails(0);
  };

  const handlePinKey = async (key) => {
    if (key === "del") { setPinEntry(p => p.slice(0, -1)); return; }
    const next = (pinEntry + key).slice(0, 4);
    setPinEntry(next);
    if (next.length === 4) {
      let loginName = pinStep.name;
      let loginRole = pinStep.role;
      let matched   = false;

      if (pinStep.role === "owner") {
        // Admin button — check both PINs and resolve the real name
        const resolved = resolveAdmin(next);
        if (resolved) { matched = true; loginName = resolved.name; }
      } else {
        // Front desk staff — exact PIN match
        matched = next === pinStep.pin;
      }

      if (matched) {
        setPinStep(null); setPinEntry(""); setPinError(""); setPinFails(0);
        setUN(loginName); setUserRole(loginRole); setLogged(true);
        if (loginRole === "front_desk") startLockTimer();
        await db.post("admin_activity_log", {
          user_name: loginName, user_role: loginRole,
          action: "Logged in", logged_at: new Date().toISOString(),
        });
      } else {
        setPinFails(f => f + 1);
        setPinEntry("");
        setPinError("Incorrect PIN — try again");
      }
    }
  };

  /* ── Change PIN (owners only) ── */
  const openChangePin = () => {
    setCpStep(1); setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpError("");
    setChangePinModal(true);
  };

  const handleChangePinKey = (key, which) => {
    const setter = which === "current" ? setCpCurrent : which === "new" ? setCpNew : setCpConfirm;
    const val    = which === "current" ? cpCurrent    : which === "new" ? cpNew    : cpConfirm;
    if (key === "del") { setter(val.slice(0, -1)); return; }
    setter((val + key).slice(0, 4));
  };

  const submitChangePin = async () => {
    setCpError("");
    // Verify current PIN and identify which owner
    const resolved = resolveAdmin(cpCurrent);
    if (!resolved || resolved.name !== uN) { setCpError("Current PIN is incorrect."); setCpCurrent(""); return; }
    if (cpNew.length < 4)    { setCpError("New PIN must be 4 digits."); return; }
    if (cpNew !== cpConfirm) { setCpError("PINs don't match."); setCpConfirm(""); return; }
    if (cpNew === cpCurrent) { setCpError("New PIN must be different."); setCpNew(""); setCpConfirm(""); return; }
    setCpSaving(true);
    await db.patch("admin_settings", "id=gt.0", { [resolved.field]: cpNew });
    if (resolved.field === "daniel_pin") setDanielPin(cpNew); else setMarcoPin(cpNew);
    setCpSaving(false);
    setChangePinModal(false);
    fire("PIN updated successfully!");
    await logActivity("Changed PIN");
  };

  /* ── Sign out ── */
  const signOut = async () => {
    await logActivity("Signed out");
    if (lockTimer.current) clearTimeout(lockTimer.current);
    setLogged(false); setView("res"); setUN(""); setUserRole("");
  };

  /* ── Nav — Front Desk: Reservations, Customers, Members only ── */
  const allNav = [
    { k: "res",      l: "Reservations", ic: X.cal    },
    { k: "cust",     l: "Customers",    ic: X.user   },
    { k: "members",  l: "Members",      ic: X.crown  },
    { k: "reports",  l: "Reports",      ic: X.bar    },
    { k: "facility", l: "Facility",     ic: X.wrench },
  ];
  const nav = userRole === "front_desk"
    ? allNav.filter(n => ["res","cust","members"].includes(n.k))
    : allNav;

  /* ══════════════ LOGIN SCREEN ══════════════ */
  if (!logged) {
    const PIN_KEYS = ["1","2","3","4","5","6","7","8","9","","0","del"];

    return (
      <div style={LS.w}>
        <style>{CSS}</style>
        <div style={LS.c}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: "#0B2E1A", letterSpacing: 3 }}>BIRDIE GOLF STUDIOS</h1>
            <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Admin Dashboard</p>
          </div>

          {!pinStep && fdStaffStep !== "pick" ? (
            /* ── Step 1: pick role ── */
            <>
              {/* Single Admin button for both owners */}
              <button style={LS.rb} onClick={() => handleNameClick({ id: "admin", name: "Admin", role: "owner" })}>
                <div style={LS.ri}>AD</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Admin</p>
                  <p style={{ fontSize: 11, color: "#888" }}>Owner access</p>
                </div>
                <span style={{ fontSize: 11, color: "#aaa" }}>{X.lock(14)}</span>
              </button>
              {/* Front Desk group button */}
              {fdStaff.length > 0 && (
                <button style={LS.rb} onClick={() => setFdStaffStep("pick")}>
                  <div style={{ ...LS.ri, background: "#3A3A5C" }}>FD</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>Front Desk</p>
                    <p style={{ fontSize: 11, color: "#888" }}>{fdStaff.length} staff members</p>
                  </div>
                  <span style={{ fontSize: 11, color: "#aaa" }}>{X.lock(14)}</span>
                </button>
              )}

            </>

          ) : fdStaffStep === "pick" ? (
            /* ── Step 1b: pick staff member ── */
            <>
              <button onClick={() => setFdStaffStep(null)}
                style={{ background: "none", border: "none", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: ff, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}>
                ← Back
              </button>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0B2E1A", marginBottom: 12, textAlign: "center", letterSpacing: 1 }}>SELECT STAFF MEMBER</p>
              {fdStaff.map(s => (
                <button key={s.id} style={LS.rb} onClick={() => handleStaffPick(s)}>
                  <div style={{ ...LS.ri, background: "#3A3A5C" }}>{s.name.slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: "#888" }}>Front Desk</p>
                  </div>
                  <span style={{ fontSize: 11, color: "#aaa" }}>{X.lock(14)}</span>
                </button>
              ))}
            </>
          ) : (
            /* ── Step 2: PIN pad ── */
            <>
              <button onClick={() => { setPinStep(null); setPinEntry(""); setPinError(""); }}
                style={{ background: "none", border: "none", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: ff, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}>
                ← Back
              </button>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ ...LS.ri, margin: "0 auto 10px", width: 48, height: 48, fontSize: 15 }}>
                  {pinStep.id === "admin" ? "AD" : pinStep.name.split(" ").map(n => n[0]).join("")}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700 }}>{pinStep.name}</p>
                <p style={{ fontSize: 12, color: "#888" }}>Enter your PIN</p>
              </div>

              {/* Hidden input for mobile numeric keyboard */}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                value={pinEntry}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g,"").slice(0,4);
                  // feed each new digit through handlePinKey
                  if (val.length > pinEntry.length) {
                    handlePinKey(val[val.length - 1]);
                  } else if (val.length < pinEntry.length) {
                    handlePinKey("del");
                  }
                }}
                style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
                readOnly={false}
              />

              {/* PIN dots */}
              <div className={pinError ? "shake" : ""} style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 8 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 14, height: 14, borderRadius: "50%",
                    background: i < pinEntry.length ? "#0B2E1A" : "#e8e8e6",
                    transition: "background .15s" }} />
                ))}
              </div>
              {pinError && <p style={{ textAlign: "center", fontSize: 12, color: "#E03928", marginBottom: 8 }}>{pinError}</p>}

              {/* Keypad */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
                {PIN_KEYS.map((k, i) => k === "" ? (
                  <div key={i} />
                ) : (
                  <button key={i} onClick={() => handlePinKey(k)}
                    style={{ padding: "16px 8px", borderRadius: 12, border: "1px solid #e8e8e6",
                      background: "#fff", fontSize: k === "del" ? 13 : 20, fontWeight: 600,
                      cursor: "pointer", fontFamily: k === "del" ? ff : mono,
                      color: "#1a1a1a", transition: "background .1s" }}
                    onMouseDown={e => e.currentTarget.style.background = "#f0f0ee"}
                    onMouseUp={e => e.currentTarget.style.background = "#fff"}
                  >{k === "del" ? "⌫" : k}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════ MAIN APP ══════════════ */
  return (
    <div style={S.shell}>
      <style>{CSS}</style>
      <div style={S.side}>
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #1a3d2a" }}>
          <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#fff" }}>BGS ADMIN</span>
          <p style={{ fontSize: 10, color: "#ffffff66", marginTop: 4 }}>{uN}</p>
        </div>
        <div style={{ padding: "8px", flex: 1 }}>
          {nav.map(n => (
            <button key={n.k} style={{ ...S.nB, ...(view === n.k ? S.nBA : {}) }} onClick={() => setView(n.k)}>
              {n.ic(16)}<span>{n.l}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1a3d2a", display: "flex", flexDirection: "column", gap: 8 }}>
          {userRole === "owner" && (
            <button style={{ background: "none", border: "none", color: "#ffffff66", fontSize: 11, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", gap: 6 }} onClick={openChangePin}>
              {X.lock(14)} Change PIN
            </button>
          )}
          <button style={{ background: "none", border: "none", color: "#ffffff66", fontSize: 11, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", gap: 6 }} onClick={signOut}>
            {X.out(14)} Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {view === "res"      && <ReservationsTab customers={customers} bookings={bookings} bayBlocks={bayBlocks} cfg={cfg} hoursConfig={hoursConfig} fire={fire} reload={load} logActivity={logActivity} />}
          {view === "cust"     && <CustomersTab    customers={customers} bookings={bookings} onRefresh={load} logActivity={logActivity} />}
          {view === "members"  && <MembersTab      customers={customers} fire={fire} reload={load} logActivity={logActivity} />}
          {view === "reports"  && <ReportsTab      bookings={bookings} customers={customers} />}
          {view === "facility" && <FacilityTab     bayBlocks={bayBlocks} setBayBlocks={setBayBlocks} cfg={cfg} setCfg={setCfg} hoursConfig={hoursConfig} setHoursConfig={setHoursConfig} fdPin={fdPin} setFdPin={setFdPin} userRole={userRole} fire={fire} reload={load} logActivity={logActivity} enrollmentFeeEnabled={enrollmentFeeEnabled} setEnrollmentFeeEnabled={setEnrollmentFeeEnabled} />}
        </div>
      </div>

      {/* ── Change PIN Modal ── */}
      {changePinModal && (() => {
        const CP_KEYS = ["1","2","3","4","5","6","7","8","9","","0","del"];
        const activeVal    = cpStep === 1 ? cpCurrent : cpStep === 2 ? cpNew : cpConfirm;
        const activeWhich  = cpStep === 1 ? "current" : cpStep === 2 ? "new" : "confirm";
        const stepLabel    = cpStep === 1 ? "Enter current PIN" : cpStep === 2 ? "Enter new PIN" : "Confirm new PIN";
        const canAdvance   = activeVal.length === 4;
        return (
          <div style={S.ov} onClick={() => setChangePinModal(false)}>
            <div style={{ ...S.mod, maxWidth: 340 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Change PIN</h3>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>{stepLabel}</p>

              {/* dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 8 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 14, height: 14, borderRadius: "50%",
                    background: i < activeVal.length ? "#0B2E1A" : "#e8e8e6",
                    transition: "background .15s" }} />
                ))}
              </div>
              {cpError && <p style={{ textAlign: "center", fontSize: 12, color: "#E03928", marginBottom: 8 }}>{cpError}</p>}

              {/* keypad */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12, marginBottom: 16 }}>
                {CP_KEYS.map((k, i) => k === "" ? <div key={i} /> : (
                  <button key={i} onClick={() => handleChangePinKey(k, activeWhich)}
                    style={{ padding: "14px 8px", borderRadius: 12, border: "1px solid #e8e8e6",
                      background: "#fff", fontSize: k === "del" ? 13 : 18, fontWeight: 600,
                      cursor: "pointer", fontFamily: k === "del" ? ff : mono, color: "#1a1a1a" }}
                  >{k === "del" ? "⌫" : k}</button>
                ))}
              </div>

              {canAdvance && cpStep < 3 && (
                <button style={S.b1} onClick={() => { setCpError(""); setCpStep(s => s + 1); }}>
                  Continue
                </button>
              )}
              {canAdvance && cpStep === 3 && (
                <button style={S.b1} disabled={cpSaving} onClick={submitChangePin}>
                  {cpSaving ? "Saving..." : "Save New PIN"}
                </button>
              )}
              <button style={{ ...S.b1, background: "#f0f0ee", color: "#555", marginTop: 8 }}
                onClick={() => setChangePinModal(false)}>Cancel</button>
            </div>
          </div>
        );
      })()}

      {toast && <div style={S.toast}>{toast}</div>}
      {loading && <div style={{ position: "fixed", top: 12, right: 12, background: GREEN, color: "#fff", padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, zIndex: 200 }}>Loading...</div>}
    </div>
  );
}

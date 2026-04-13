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

  const [customers,   setCustomers]   = useState([]);
  const [bookings,    setBookings]    = useState([]);
  const [bayBlocks,   setBayBlocks]   = useState([]);
  const [cfg,         setCfg]         = useState({ pk: 75, op: 50, wk: 50 });
  const [hoursConfig, setHoursConfig] = useState(null);
  const [fdPin,       setFdPin]       = useState("2025");

  /* ── Load settings on mount ── */
  useEffect(() => {
    db.get("admin_settings", "select=*&limit=1").then(rows => {
      if (rows?.[0]) {
        if (rows[0].fd_pin)       setFdPin(rows[0].fd_pin);
        if (rows[0].weekday_open) setHoursConfig({
          weekday_open:  rows[0].weekday_open,
          weekday_close: rows[0].weekday_close,
          weekend_open:  rows[0].weekend_open,
          weekend_close: rows[0].weekend_close,
        });
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
    if (settings?.[0]) {
      if (settings[0].fd_pin)       setFdPin(settings[0].fd_pin);
      if (settings[0].weekday_open) setHoursConfig({
        weekday_open:  settings[0].weekday_open,
        weekday_close: settings[0].weekday_close,
        weekend_open:  settings[0].weekend_open,
        weekend_close: settings[0].weekend_close,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (logged) load(); }, [logged, load]);

  /* ── Login ── */
  const login = async (t) => {
    setUN(t.name);
    setUserRole(t.role);
    setLogged(true);
    if (t.role === "front_desk") startLockTimer();
    await db.post("admin_activity_log", {
      user_name: t.name,
      user_role: t.role,
      action:    "Logged in",
      logged_at: new Date().toISOString(),
    });
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
  if (!logged) return (
    <div style={LS.w}>
      <style>{CSS}</style>
      <div style={LS.c}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: "#0B2E1A", letterSpacing: 3 }}>BIRDIE GOLF STUDIOS</h1>
          <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Admin Dashboard</p>
        </div>
        {TEAM.map(t => (
          <button key={t.id} style={LS.rb} onClick={() => login(t)}>
            <div style={LS.ri}>{t.name.split(" ").map(n => n[0]).join("")}</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</p>
              <p style={{ fontSize: 11, color: "#888" }}>{t.title}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

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
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1a3d2a" }}>
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
          {view === "facility" && <FacilityTab     bayBlocks={bayBlocks} setBayBlocks={setBayBlocks} cfg={cfg} setCfg={setCfg} hoursConfig={hoursConfig} setHoursConfig={setHoursConfig} fdPin={fdPin} setFdPin={setFdPin} userRole={userRole} fire={fire} reload={load} logActivity={logActivity} />}
        </div>
      </div>

      {toast && <div style={S.toast}>{toast}</div>}
      {loading && <div style={{ position: "fixed", top: 12, right: 12, background: GREEN, color: "#fff", padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, zIndex: 200 }}>Loading...</div>}
    </div>
  );
}

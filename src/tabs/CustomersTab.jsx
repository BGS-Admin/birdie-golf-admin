import React, { useState } from "react";
import { db, SB_URL, SB_KEY } from "../lib/db.js";
import { GREEN, TC, TN, mono, ff, cn, X, S, GS } from "../lib/constants.jsx";

const sq = async (action, params = {}) => {
  try {
    const r = await fetch(`${SB_URL}/functions/v1/square-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SB_KEY}` },
      body: JSON.stringify({ action, ...params }),
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
};

export default function CustomersTab({ customers, bookings, onRefresh, logActivity }) {
  const [search,    setSearch]    = useState("");
  const [addModal,  setAddModal]  = useState(false);
  const [form,      setForm]      = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");

  const filtered = search
    ? customers.filter(c =>
        cn(c).toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || "").includes(search) ||
        (c.email || "").includes(search)
      )
    : customers;

  const openAdd = () => {
    setForm({ firstName: "", lastName: "", phone: "", email: "" });
    setSaveError("");
    setAddModal(true);
  };

  const saveCustomer = async () => {
    setSaveError("");
    const phone = form.phone.replace(/\D/g, "");
    if (!form.firstName.trim()) { setSaveError("First name is required."); return; }
    if (phone.length < 10) { setSaveError("Please enter a valid 10-digit phone number."); return; }

    // Check for duplicate phone
    const existing = await db.get("customers", `phone=eq.${phone}&select=id`);
    if (existing?.length) { setSaveError("A customer with this phone number already exists."); return; }

    setSaving(true);
    // 1. Create in Supabase
    const rows = await db.post("customers", {
      first_name: form.firstName.trim(),
      last_name:  form.lastName.trim(),
      phone,
      email:      form.email.trim(),
      tier:       "none",
      bay_credits_remaining: 0,
      bay_credits_total:     0,
    });
    const newCust = Array.isArray(rows) ? rows[0] : rows;
    if (!newCust?.id) { setSaveError("Failed to create customer. Please try again."); setSaving(false); return; }

    // 2. Create in Square (fire and forget — link square_customer_id back when done)
    sq("customer.create", {
      first_name:  form.firstName.trim(),
      last_name:   form.lastName.trim(),
      phone,
      email:       form.email.trim(),
      supabase_id: newCust.id,
    }).then(async sqResult => {
      const sqId = sqResult?.customer?.id;
      if (sqId) await db.patch("customers", `id=eq.${newCust.id}`, { square_customer_id: sqId });
    });

    await logActivity?.(`Added new customer: ${form.firstName.trim()} ${form.lastName.trim()} (${phone})`);
    setSaving(false);
    setAddModal(false);
    onRefresh();
  };

  return (
    <div style={S.pad}>
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

      <div style={S.srch}>
        {X.search(16)}
        <input
          style={S.srchIn}
          placeholder="Search name, phone, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={S.empty}><p>No customers {search ? "match" : "yet"}</p></div>
      ) : (
        filtered.map(c => {
          const bkCount = bookings.filter(b => b.customer_id === c.id).length;
          return (
            <div key={c.id} style={S.cR}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: (TC[c.tier] || "#888") + "18",
                color: TC[c.tier] || "#888",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 13, fontFamily: mono, flexShrink: 0
              }}>
                {(c.first_name || "?")[0]}{(c.last_name || "?")[0]}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{cn(c)}</p>
                <p style={{ fontSize: 11, color: "#888" }}>
                  {c.phone || ""}{c.email ? " · " + c.email : ""}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: TC[c.tier] || "#888", padding: "3px 8px", borderRadius: 5, fontFamily: mono }}>
                  {TN[c.tier] || "None"}
                </span>
                <p style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>
                  {bkCount} booking{bkCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          );
        })
      )}

      {/* ── Add Customer Modal ── */}
      {addModal && (
        <div style={S.ov} onClick={() => setAddModal(false)}>
          <div style={{ ...S.mod, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Add New Customer</h3>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
              Creates a profile so they can log in with their phone number — no onboarding required.
            </p>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={GS.label}>FIRST NAME *</label>
                <input
                  style={GS.input}
                  placeholder="First"
                  value={form.firstName}
                  onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                  autoFocus
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={GS.label}>LAST NAME</label>
                <input
                  style={GS.input}
                  placeholder="Last"
                  value={form.lastName}
                  onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={GS.label}>PHONE NUMBER *</label>
              <input
                style={GS.input}
                placeholder="3051234567"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={GS.label}>EMAIL</label>
              <input
                style={GS.input}
                placeholder="optional"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>

            {saveError && (
              <div style={{ background: "#FFF0F0", border: "1px solid #E0392822", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: "#E03928" }}>{saveError}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...GS.togBtn, flex: 1, padding: "12px 16px" }} onClick={() => setAddModal(false)}>
                Cancel
              </button>
              <button
                style={{ ...S.b1, flex: 2, opacity: (form.firstName && form.phone.replace(/\D/g,"").length >= 10) ? 1 : 0.4 }}
                disabled={saving || !form.firstName || form.phone.replace(/\D/g,"").length < 10}
                onClick={saveCustomer}
              >
                {saving ? "Saving..." : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
import { GREEN, TC, TN, TB, mono, ff, cn, X, S, GS } from "../lib/constants.jsx";

export default function CustomersTab({ customers, bookings, onRefresh }) {
  const [search, setSearch] = React.useState("");

  const filtered = search
    ? customers.filter(c =>
        cn(c).toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || "").includes(search) ||
        (c.email || "").includes(search)
      )
    : customers;

  return (
    <div style={S.pad}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Customers ({customers.length})</h2>
        <button style={{ ...S.b1, width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={onRefresh}>
          \u21bb Refresh
        </button>
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
                  {c.phone || ""}{c.email ? " \u00b7 " + c.email : ""}
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
    </div>
  );
}

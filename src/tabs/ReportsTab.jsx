import React from "react";
import { mono, S } from "../lib/constants.jsx";

export default function ReportsTab({ bookings, customers }) {
  const totalRev  = bookings.reduce((s, b) => s + Number(b.amount || 0), 0);
  const memCount  = customers.filter(c => c.tier && c.tier !== "none").length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthBk   = bookings.filter(b => (b.date || "").startsWith(thisMonth)).length;

  return (
    <div style={S.pad}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Reports</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <div style={S.kpi}>
          <p style={S.kpiL}>TOTAL REVENUE</p>
          <p style={S.kpiV}>${totalRev.toFixed(0)}</p>
        </div>
        <div style={S.kpi}>
          <p style={S.kpiL}>TOTAL BOOKINGS</p>
          <p style={S.kpiV}>{bookings.length}</p>
        </div>
        <div style={S.kpi}>
          <p style={S.kpiL}>ACTIVE MEMBERS</p>
          <p style={S.kpiV}>{memCount}</p>
        </div>
        <div style={S.kpi}>
          <p style={S.kpiL}>BOOKINGS THIS MONTH</p>
          <p style={S.kpiV}>{monthBk}</p>
        </div>
      </div>

      <div style={S.empty}>
        <p style={{ fontSize: 14 }}>Detailed reports coming soon</p>
        <p style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Revenue breakdowns, utilization charts, tier analytics, and more.</p>
      </div>
    </div>
  );
}

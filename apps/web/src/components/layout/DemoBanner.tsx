import React, { useEffect, useState } from "react";
import { Info, ShieldAlert } from "lucide-react";
import { apiClient } from "@/services/apiClient";

export const DemoBanner: React.FC = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.getHealth()
      .then((health) => active && setEnabled(health.uniid_demo_mode === true))
      .catch(() => active && setEnabled(false));
    return () => { active = false; };
  }, []);

  if (!enabled) return null;

  return (
    <aside
      aria-label="Simulation Mode Notice"
      style={{
        backgroundColor: "#08121f",
        color: "#94a3b8",
        borderBottom: "1px solid #1e293b",
        fontSize: "var(--font-size-xs)",
        padding: "6px 16px",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "rgba(217, 119, 6, 0.2)",
              color: "#f59e0b",
              padding: "1px 6px",
              borderRadius: "4px",
              fontWeight: 600,
              fontSize: "11px",
              letterSpacing: "0.5px",
            }}
          >
            <ShieldAlert size={12} />
            DEMO ENVIRONMENT
          </span>
          <span>
            DEMO ENVIRONMENT · Simulated institutional data
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
          <Info size={12} />
          <span>Synthetic records only &bull; no live institutional connection</span>
        </div>
      </div>
    </aside>
  );
};

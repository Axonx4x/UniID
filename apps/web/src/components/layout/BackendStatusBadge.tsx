import React, { useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";
import { HealthResponse, ReadyResponse } from "@/types";
import { RefreshCw } from "lucide-react";

export const BackendStatusBadge: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [ready, setReady] = useState<ReadyResponse | null>(null);
  const [status, setStatus] = useState<"checking" | "connected" | "degraded" | "error">("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    setIsRefreshing(true);
    try {
      const [healthData, readyData] = await Promise.all([
        apiClient.getHealth(),
        apiClient.getReadiness().catch((err) => {
          // If readiness returns 503, database might be down while API is up
          return {
            status: "not_ready" as const,
            timestamp: new Date().toISOString(),
            environment: "unknown",
            version: "0.1.0",
            database: {
              connected: false,
              latency_ms: 0,
              error: err instanceof Error ? err.message : "Database offline",
            },
          };
        }),
      ]);

      setHealth(healthData);
      setReady(readyData);

      if (readyData.database.connected) {
        setStatus("connected");
        setErrorMessage(null);
      } else {
        setStatus("degraded");
        setErrorMessage("DB Offline");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "API Offline");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Re-check periodically every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: "#f1f5f9",
        padding: "4px 10px",
        borderRadius: "var(--radius-full)",
        border: "1px solid #e2e8f0",
        fontSize: "var(--font-size-xs)",
        color: "#334155",
      }}
      title={
        status === "connected"
          ? `API: Healthy | DB: Connected (${ready?.database.latency_ms || 0}ms)`
          : status === "degraded"
          ? "API Online, Database disconnected"
          : `API Disconnected: ${errorMessage || "Offline"}`
      }
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor:
            status === "connected"
              ? "#10b981"
              : status === "degraded"
              ? "#f59e0b"
              : status === "checking"
              ? "#38bdf8"
              : "#ef4444",
          boxShadow:
            status === "connected"
              ? "0 0 6px rgba(16, 185, 129, 0.4)"
              : status === "degraded"
              ? "0 0 6px rgba(245, 158, 11, 0.4)"
              : "0 0 6px rgba(239, 68, 68, 0.4)",
        }}
      />

      <span style={{ fontWeight: 500 }}>
        {status === "checking" && "Connecting..."}
        {status === "connected" && `API v${health?.version || "1.0"} • DB Live (${ready?.database.latency_ms}ms)`}
        {status === "degraded" && "API Live • DB Offline"}
        {status === "error" && "Backend Offline"}
      </span>

      <button
        type="button"
        onClick={checkStatus}
        disabled={isRefreshing}
        style={{
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          padding: "2px",
          transition: "color var(--transition-fast)",
        }}
        aria-label="Refresh backend status"
      >
        <RefreshCw size={11} className={isRefreshing ? "spinner" : ""} />
      </button>
    </div>
  );
};

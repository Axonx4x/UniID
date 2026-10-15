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
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        padding: "4px 10px",
        borderRadius: "var(--radius-full)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        fontSize: "var(--font-size-xs)",
        color: "#f8fafc",
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
              ? "0 0 6px #10b981"
              : status === "degraded"
              ? "0 0 6px #f59e0b"
              : "0 0 6px #ef4444",
        }}
      />

      <span style={{ fontWeight: 500 }}>
        {status === "checking" && "Connecting..."}
        {status === "connected" && `API v${health?.version || "1.0"} &bull; DB Live (${ready?.database.latency_ms}ms)`}
        {status === "degraded" && "API Live &bull; DB Offline"}
        {status === "error" && "Backend Offline"}
      </span>

      <button
        type="button"
        onClick={checkStatus}
        disabled={isRefreshing}
        style={{
          color: "#94a3b8",
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

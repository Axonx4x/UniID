import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div
      className="container"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        padding: "48px 16px",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: "var(--status-warning-bg)",
          color: "var(--status-warning)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <AlertTriangle size={28} />
      </div>
      <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>Page Not Found</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: 440, marginBottom: 24 }}>
        The requested screen does not exist or has not been unlocked in Phase 1 of the platform foundation.
      </p>
      <Link to="/" className="btn btn-primary btn-md">
        <ArrowLeft size={16} />
        <span>Return to Platform Overview</span>
      </Link>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  Clock,
  ExternalLink,
  History,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StudentCredentialHistoryResponse } from "@/types";

export const StudentCredentialsPage: React.FC = () => {
  const [history, setHistory] = useState<StudentCredentialHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getStudentCredentialsHistory();
      setHistory(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const copyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  if (loading && !history) {
    return (
      <div className="uni-student-loading-state">
        <div className="uni-spinner-lg" />
        <p>Loading credential history & cryptographic events...</p>
      </div>
    );
  }

  const current = history?.current_credential;
  const credentials = history?.credentials || [];

  return (
    <div className="uni-credentials-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Digital Credentials & Lifecycle History</h1>
          <p className="uni-page-sub">
            Audit cryptographic credentials, append-only lifecycle events, and historical digital IDs.
          </p>
        </div>
        <div className="uni-header-action-group">
          <Link to="/student/id" className="uni-btn-primary">
            <CreditCard size={16} />
            <span>View Active ID Card</span>
          </Link>
        </div>
      </div>

      {/* Current Active Credential Card */}
      <div className="uni-card-preview-section">
        <div className="uni-section-header-row">
          <h2 className="uni-section-title">
            <ShieldCheck size={18} />
            <span>Current Digital Credential</span>
          </h2>
          {current?.public_reference && (
            <Link to="/student/id/verify" className="uni-section-link">
              <QrCode size={15} />
              <span>Present Code</span>
            </Link>
          )}
        </div>

        {current && current.status === "active" ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid var(--stu-border)",
              borderRadius: "16px",
              padding: "24px 28px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "12px",
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "var(--stu-deep-navy)" }}>
                    Institutional Student Credential
                  </h3>
                  <span className="uni-status-pill success" style={{ padding: "3px 10px", fontSize: "11px" }}>
                    ACTIVE & VERIFIED
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--stu-text-muted)", marginTop: "4px" }}>
                  Reference: <span style={{ fontFamily: "monospace", fontWeight: "600" }}>{current.public_reference}</span>
                  {current.issued_at && (
                    <span> • Issued: {new Date(current.issued_at).toLocaleDateString()}</span>
                  )}
                  {current.expires_at && (
                    <span> • Expires: {new Date(current.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {current.public_reference && (
                <Link
                  to={`/verify/${current.public_reference}`}
                  target="_blank"
                  rel="noreferrer"
                  className="uni-btn-secondary"
                >
                  <ExternalLink size={14} />
                  <span>Public Verifier</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <AlertTriangle size={24} color="#d97706" />
            <div>
              <div style={{ fontWeight: "700", color: "#92400e", fontSize: "14px" }}>No Active Credential Issued</div>
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#78350f" }}>
                Your student identity verification may be pending institutional review or photograph upload. Complete outstanding actions to receive your digital ID.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Historical Credentials & Lifecycle Events */}
      <div className="uni-student-card">
        <div className="uni-card-header-simple">
          <h2 className="uni-card-title-sm">
            <History size={16} />
            <span>Append-Only Credential Lifecycle Trail</span>
          </h2>
        </div>

        {credentials.length === 0 ? (
          <p style={{ fontSize: "13.5px", color: "var(--stu-text-muted)", padding: "16px 0" }}>
            No prior credential issuance records found.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {credentials.map((credItem) => (
              <div
                key={credItem.id}
                style={{
                  border: "1px solid var(--stu-border)",
                  borderRadius: "12px",
                  padding: "18px 20px",
                  background: credItem.is_current ? "#f8fafc" : "#ffffff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--stu-deep-navy)" }}>
                      Credential {credItem.public_reference}
                    </span>
                    <span
                      className={`uni-status-pill ${
                        credItem.status === "active" ? "success" : credItem.status === "expired" ? "warning" : "danger"
                      }`}
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                    >
                      {credItem.status.toUpperCase()}
                    </span>
                    {credItem.is_current && (
                      <span style={{ fontSize: "11px", background: "#243b80", color: "#ffffff", padding: "2px 6px", borderRadius: "4px" }}>
                        CURRENT
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="uni-btn-request-correction"
                    onClick={() => copyReference(credItem.public_reference)}
                  >
                    {copiedRef === credItem.public_reference ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    <span>Copy Ref</span>
                  </button>
                </div>

                {/* Dates & Policy */}
                <div style={{ fontSize: "12.5px", color: "var(--stu-text-muted)", marginBottom: "14px" }}>
                  <span>Issued: {credItem.issued_at ? new Date(credItem.issued_at).toLocaleString() : "—"}</span>
                  {credItem.expires_at && <span> • Expiry: {new Date(credItem.expires_at).toLocaleString()}</span>}
                  {credItem.revoked_at && (
                    <span style={{ color: "#b91c1c" }}> • Revoked: {new Date(credItem.revoked_at).toLocaleString()}</span>
                  )}
                  {credItem.revocation_reason && (
                    <div style={{ marginTop: "4px", color: "#b91c1c" }}>Reason: {credItem.revocation_reason}</div>
                  )}
                </div>

                {/* Events list */}
                {credItem.events && credItem.events.length > 0 && (
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                    <div style={{ fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", color: "var(--stu-text-muted)", marginBottom: "8px" }}>
                      Cryptographic Audit Events
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {credItem.events.map((evt) => (
                        <div key={evt.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", background: "#f8fafc", padding: "8px 12px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Clock size={13} color="#647084" />
                            <strong>{evt.event_type}</strong>
                            {evt.reason && <span style={{ color: "var(--stu-text-muted)" }}>— {evt.reason}</span>}
                          </div>
                          <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>
                            {new Date(evt.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

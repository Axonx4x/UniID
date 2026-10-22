import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Lock,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Mail,
  LogOut,
  Smartphone,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/auth/AuthContext";
import { StudentDashboardResponse } from "@/types";

interface StudentContextType {
  dashboard: StudentDashboardResponse | null;
  refreshDashboard: () => void;
  loading: boolean;
}

export const StudentSecurityPage: React.FC = () => {
  const { dashboard } = useOutletContext<StudentContextType>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.changeStudentPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccessMsg(res.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password. Please check your current password.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  const emailVerified = dashboard?.account?.email_verified ?? true;
  const userEmail = user?.email || dashboard?.account?.email || "Unknown";

  return (
    <div className="uni-student-security-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Security & Authentication</h1>
          <p className="uni-page-sub">
            Manage your credentials, active session tokens, and security settings.
          </p>
        </div>
      </div>

      {/* Security Status Card */}
      <div className="uni-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="uni-stat-card">
          <div className="uni-stat-icon-wrap" style={{ background: "rgba(36, 59, 128, 0.08)", color: "#243B80" }}>
            <Mail size={22} />
          </div>
          <div className="uni-stat-info">
            <span className="uni-stat-label">Institutional Account Email</span>
            <span className="uni-stat-value" style={{ fontSize: "16px", wordBreak: "break-all" }}>
              {userEmail}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              {emailVerified ? (
                <span className="uni-pill-success" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <CheckCircle2 size={12} /> Email Verified
                </span>
              ) : (
                <span className="uni-pill-warning" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <AlertCircle size={12} /> Pending Verification
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="uni-stat-card">
          <div className="uni-stat-icon-wrap" style={{ background: "rgba(35, 123, 75, 0.08)", color: "#237B4B" }}>
            <Shield size={22} />
          </div>
          <div className="uni-stat-info">
            <span className="uni-stat-label">Session Protection</span>
            <span className="uni-stat-value" style={{ fontSize: "16px" }}>
              Encrypted Session
            </span>
            <span style={{ fontSize: "12px", color: "#647084", marginTop: "4px" }}>
              HttpOnly Secure Cookie JWT
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
        {/* Password Change Form */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E6EF",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #E2E6EF", paddingBottom: "16px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(36, 59, 128, 0.08)",
                color: "#243B80",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#172033" }}>Change Password</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#647084" }}>
                Ensure your account uses a secure password of 8+ characters.
              </p>
            </div>
          </div>

          {successMsg && (
            <div className="uni-callout-box success">
              <CheckCircle2 size={18} />
              <div>{successMsg}</div>
            </div>
          )}

          {errorMsg && (
            <div className="uni-callout-box error">
              <AlertCircle size={18} />
              <div>{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Current Password */}
            <div>
              <label className="uni-label" htmlFor="currentPassword">
                Current Password <span style={{ color: "#B42318" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  className="uni-input"
                  style={{ paddingRight: "40px" }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#647084",
                  }}
                  aria-label="Toggle password visibility"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="uni-label" htmlFor="newPassword">
                New Password <span style={{ color: "#B42318" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  className="uni-input"
                  style={{ paddingRight: "40px" }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#647084",
                  }}
                  aria-label="Toggle new password visibility"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="uni-label" htmlFor="confirmPassword">
                Confirm New Password <span style={{ color: "#B42318" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  className="uni-input"
                  style={{ paddingRight: "40px" }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#647084",
                  }}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="uni-btn-primary"
              disabled={submitting}
              style={{ marginTop: "8px" }}
            >
              <Lock size={16} />
              <span>{submitting ? "Updating Password..." : "Update Password"}</span>
            </button>
          </form>
        </div>

        {/* Security Policies & Session Management */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Active Session & Logout */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E6EF",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(180, 35, 24, 0.08)",
                  color: "#B42318",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Smartphone size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#172033" }}>Session Management</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#647084" }}>
                  Active login token for UniID Student Portal.
                </p>
              </div>
            </div>

            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E6EF",
                borderRadius: "10px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#172033", display: "block" }}>
                  Current Device & Browser
                </span>
                <span style={{ fontSize: "12px", color: "#647084" }}>
                  Authenticated via institutional SSO / credentials
                </span>
              </div>
              <span className="uni-pill-success" style={{ fontSize: "11px" }}>
                Active Now
              </span>
            </div>

            <button
              type="button"
              className="uni-btn-secondary"
              onClick={handleSignOut}
              style={{ color: "#B42318", borderColor: "#FCA5A5", alignSelf: "flex-start" }}
            >
              <LogOut size={16} />
              <span>Sign Out Everywhere</span>
            </button>
          </div>

          {/* Security Best Practices */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E6EF",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#172033" }}>
              Wallet Security Guidance
            </h3>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
              <li>Never share your credentials, QR presentation tokens, or temporary access passcodes.</li>
              <li>Only present your QR verification code to official university inspectors or authorized campus terminals.</li>
              <li>Always sign out when accessing UniID from public computers or library terminals.</li>
              <li>If you notice unauthorized account activity, immediately change your password and contact institutional support.</li>
            </ul>

            <div className="uni-callout-box info" style={{ marginTop: "4px" }}>
              <Info size={16} />
              <div style={{ fontSize: "12px" }}>
                Institution-governed profile fields cannot be modified via password or profile forms. Corrections must be submitted via the Requests tab.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import {
  User,
  Bell,
  Shield,
  Building2,
  CheckCircle2,
  Smartphone,
  LogOut,
  Save,
  KeyRound,
  ShieldCheck,
  Camera,
  Phone,
  Mail,
  Briefcase,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { OfficerPageHeader } from "@/components/officer/OfficerComponents";
import { StaffPhotoUploadModal } from "./StaffPhotoUploadModal";

const DEFAULT_OFFICER_PHOTO = "/assets/images/Review_Officer.jpeg";
const OFFICER_PHOTO_KEY = "officer_profile_photo_dataurl";

export const StaffSettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "security" | "institution">("profile");

  // ── Officer profile form state ───────────────────────────────────────────────
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phoneNumber, setPhoneNumber] = useState("+265 888 123 456");
  const [department, setDepartment] = useState("Office of the University Registrar");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Photo ────────────────────────────────────────────────────────────────────
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [officerPhoto, setOfficerPhoto] = useState<string>(() => {
    try {
      return localStorage.getItem(OFFICER_PHOTO_KEY) || DEFAULT_OFFICER_PHOTO;
    } catch {
      return DEFAULT_OFFICER_PHOTO;
    }
  });

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
  }, [user]);

  // ── Notification preferences ─────────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState({
    newVerificationReady: true,
    studentInfoSubmitted: true,
    correctionRequestFiled: true,
    dailySummaryDigest: true,
    securityAlerts: true,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // ── Password change state ────────────────────────────────────────────────────
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const activeMembership = user?.memberships?.[0];
  const institutionName = activeMembership?.institution?.name || "University of Malawi";
  const institutionCode = activeMembership?.institution?.institution_code || "UNIMA";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    if (!fullName.trim()) { setProfileError("Full name cannot be empty."); return; }
    setProfileSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3500);
  };

  const handlePhotoSuccess = (dataUrl: string) => {
    setOfficerPhoto(dataUrl);
    try {
      localStorage.setItem(OFFICER_PHOTO_KEY, dataUrl);
      window.dispatchEvent(new Event("officer-photo-updated"));
    } catch { /* quota */ }
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters long."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    setPasswordSuccess(true);
    setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = (fullName || "RO")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="uni-officer-dashboard-content">
      <OfficerPageHeader
        title="Review Officer Settings"
        description="Manage your officer profile, verification alert preferences, active sessions, and authorized institutional scope."
        badgeText="Verified Officer Account"
        badgeType="success"
      />

      <div className="uni-officer-main-card">
        {/* Navigation Tabs */}
        <div className="uni-officer-card-header-bar">
          <div className="uni-officer-filter-pills" role="tablist">
            {(
              [
                { id: "profile", label: "Officer Profile", icon: <User size={13} /> },
                { id: "notifications", label: "Alert Preferences", icon: <Bell size={13} /> },
                { id: "security", label: "Security & Sessions", icon: <Shield size={13} /> },
                { id: "institution", label: "Assigned Institution", icon: <Building2 size={13} /> },
              ] as const
            ).map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                className={`uni-filter-pill ${activeTab === id ? "active" : ""}`}
                onClick={() => setActiveTab(id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB: OFFICER PROFILE ─────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div style={{ padding: "28px 28px 36px" }}>

            {/* Photo & Identity Hero */}
            <div style={{
              display: "flex", alignItems: "center", gap: 22, padding: "22px 24px",
              background: "linear-gradient(135deg, #F0F6FF 0%, #EEF2FF 100%)",
              borderRadius: 14, border: "1px solid #E0EAFF", marginBottom: 26,
            }}>
              {/* Avatar with camera badge */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                {officerPhoto ? (
                  <img
                    src={officerPhoto}
                    alt={fullName}
                    style={{
                      width: 84, height: 84, borderRadius: "50%", objectFit: "cover",
                      border: "3px solid #1E60FF", boxShadow: "0 4px 14px rgba(30,96,255,0.22)",
                    }}
                  />
                ) : (
                  <div style={{
                    width: 84, height: 84, borderRadius: "50%", background: "#DBEAFE",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "3px solid #1E60FF", boxShadow: "0 4px 14px rgba(30,96,255,0.22)",
                    fontSize: 28, fontWeight: 800, color: "#1E40AF", letterSpacing: "-0.03em",
                  }}>
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  title="Change profile photo"
                  style={{
                    position: "absolute", bottom: 1, right: 1,
                    width: 26, height: 26, borderRadius: "50%",
                    background: "#1E60FF", color: "#fff", border: "2px solid #fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                  }}
                >
                  <Camera size={12} />
                </button>
              </div>

              {/* Identity text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", lineHeight: 1.25 }}>
                  {fullName || "Review Officer"}
                </div>
                <div style={{ fontSize: 12.5, color: "#475569", marginTop: 3 }}>
                  {user?.email || "officer@institution.ac.mw"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0",
                    borderRadius: 9999, padding: "3px 10px", fontSize: 11.5, fontWeight: 600,
                  }}>
                    <ShieldCheck size={12} />Verified Review Officer
                  </span>
                  <span style={{
                    background: "#EEF2FF", color: "#3730A3", border: "1px solid #C7D2FE",
                    borderRadius: 9999, padding: "3px 10px", fontSize: 11.5, fontWeight: 600,
                  }}>
                    {institutionCode}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPhotoModalOpen(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  background: "#ffffff", color: "#1E60FF", border: "1px solid #BFDBFE",
                  borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", flexShrink: 0, transition: "all 0.15s ease",
                }}
              >
                <Camera size={15} />
                <span>{officerPhoto ? "Change Photo" : "Upload Photo"}</span>
              </button>
            </div>

            {/* Feedback banners */}
            {profileSaved && (
              <div className="uni-officer-success-banner" style={{ marginBottom: 16 }}>
                <CheckCircle2 size={16} />
                <span>Profile information updated successfully.</span>
              </div>
            )}
            {profileError && (
              <div className="uni-officer-error-banner" style={{ marginBottom: 16 }}>
                <div className="uni-officer-error-content">
                  <AlertCircle size={16} className="uni-officer-error-icon" />
                  <span style={{ fontSize: 13, color: "#991B1B" }}>{profileError}</span>
                </div>
              </div>
            )}

            {/* Editable form */}
            <form onSubmit={handleSaveProfile} style={{ maxWidth: 540 }}>

              {/* Full Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Full Name / Display Name
                </label>
                <div style={{ position: "relative" }}>
                  <User size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }} />
                  <input
                    type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name" required
                    style={{
                      width: "100%", padding: "10px 12px 10px 37px", fontSize: 13.5,
                      fontWeight: 500, color: "#0F172A", border: "1px solid #E2E8F0",
                      borderRadius: 9, background: "#FFFFFF", outline: "none", boxSizing: "border-box",
                    }}
                    className="uni-officer-input-focus"
                  />
                </div>
              </div>

              {/* Email (locked) */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Institutional Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }} />
                  <input
                    type="email" value={user?.email || ""} disabled
                    style={{
                      width: "100%", padding: "10px 12px 10px 37px", fontSize: 13.5,
                      color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 9,
                      background: "#F8FAFC", cursor: "not-allowed", boxSizing: "border-box",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 4, display: "block" }}>
                  Email is bound to the institutional identity provider — contact IT to change.
                </span>
              </div>

              {/* Phone */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Contact Phone Number
                </label>
                <div style={{ position: "relative" }}>
                  <Phone size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }} />
                  <input
                    type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+265 888 123 456"
                    style={{
                      width: "100%", padding: "10px 12px 10px 37px", fontSize: 13.5,
                      fontWeight: 500, color: "#0F172A", border: "1px solid #E2E8F0",
                      borderRadius: 9, background: "#FFFFFF", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Department */}
              <div style={{ marginBottom: 26 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Administrative Department / Unit
                </label>
                <div style={{ position: "relative" }}>
                  <Briefcase size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }} />
                  <input
                    type="text" value={department} onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Office of the University Registrar"
                    style={{
                      width: "100%", padding: "10px 12px 10px 37px", fontSize: 13.5,
                      fontWeight: 500, color: "#0F172A", border: "1px solid #E2E8F0",
                      borderRadius: 9, background: "#FFFFFF", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="uni-officer-btn-primary" disabled={profileSaving}>
                  {profileSaving
                    ? <><Loader2 size={15} className="animate-spin" /><span>Saving...</span></>
                    : <><Save size={15} /><span>Save Profile Changes</span></>}
                </button>
                <button type="button" className="uni-officer-btn-secondary" onClick={() => setPhotoModalOpen(true)}>
                  <Camera size={14} /><span>{officerPhoto ? "Change Photo" : "Upload Photo"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB: NOTIFICATIONS ──────────────────────────────────────────────── */}
        {activeTab === "notifications" && (
          <div className="uni-settings-section-body">
            <form onSubmit={handleSaveNotifications} className="max-w-2xl">
              <h3 className="section-title mb-2">Operational Alert Toggles</h3>
              <p className="text-sm text-muted mb-6">
                Choose which institutional queue events trigger dashboard notifications and reviewer alerts.
              </p>

              {notifSaved && (
                <div className="uni-officer-success-banner mb-4">
                  <CheckCircle2 size={16} /><span>Notification preferences saved.</span>
                </div>
              )}

              <div className="uni-toggle-list">
                {[
                  { key: "newVerificationReady" as const, title: "New Student Applications", desc: "Notify when a student finishes email OTP verification and enters queue." },
                  { key: "studentInfoSubmitted" as const, title: "Student Information Updates", desc: "Notify when a student responds to a follow-up request with evidence." },
                  { key: "correctionRequestFiled" as const, title: "Correction Requests", desc: "Alert for newly filed student profile, programme, or campus updates." },
                  { key: "dailySummaryDigest" as const, title: "Daily Verification Digest", desc: "Receive an end-of-day summary of completed decisions and outstanding backlog." },
                  { key: "securityAlerts" as const, title: "Security & Audit Notices", desc: "Mandatory alert for session sign-ins, IP changes, or roster imports." },
                ].map(({ key, title, desc }) => (
                  <label key={key} className="uni-toggle-row">
                    <div>
                      <span className="toggle-title">{title}</span>
                      <span className="toggle-desc">{desc}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs[key]}
                      onChange={(e) => setNotifPrefs({ ...notifPrefs, [key]: e.target.checked })}
                      className="toggle-checkbox"
                    />
                  </label>
                ))}
              </div>

              <button type="submit" className="uni-officer-btn-primary mt-6">
                <Save size={15} /><span>Save Notification Preferences</span>
              </button>
            </form>
          </div>
        )}

        {/* ── TAB: SECURITY ───────────────────────────────────────────────────── */}
        {activeTab === "security" && (
          <div className="uni-settings-section-body">
            <div className="max-w-2xl">
              <h3 className="section-title mb-2">Authentication &amp; Security</h3>
              <p className="text-sm text-muted mb-6">
                Review officer credentials are cryptographically bound to institutional verification audits.
              </p>

              {passwordSuccess && (
                <div className="uni-officer-success-banner mb-4">
                  <CheckCircle2 size={16} /><span>Password changed successfully.</span>
                </div>
              )}
              {passwordError && (
                <div className="uni-officer-warning-banner mb-4"><span>{passwordError}</span></div>
              )}

              <form onSubmit={handleChangePassword} className="mb-8">
                <h4 className="font-semibold text-navy mb-3 flex items-center gap-2">
                  <KeyRound size={16} /><span>Update Password</span>
                </h4>
                <div className="form-group mb-3">
                  <label className="form-label">Current Password</label>
                  <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="uni-officer-input" required />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">New Password (min 8 chars)</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="uni-officer-input" required />
                </div>
                <div className="form-group mb-4">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="uni-officer-input" required />
                </div>
                <button type="submit" className="uni-officer-btn-secondary"><span>Update Password</span></button>
              </form>

              <div className="active-sessions-box mb-8">
                <h4 className="font-semibold text-navy mb-3 flex items-center gap-2">
                  <Smartphone size={16} /><span>Active Authorized Sessions</span>
                </h4>
                <div className="session-item-row">
                  <div>
                    <span className="font-semibold block text-sm">Chrome on Linux (This Device)</span>
                    <span className="text-xs text-muted">IP: 10.45.244.120 • Current Active Session</span>
                  </div>
                  <span className="uni-status-badge approved">Current</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button type="button" className="uni-officer-btn-secondary text-danger" onClick={handleLogout}>
                  <LogOut size={16} /><span>Safe Sign Out from Review Officer Portal</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: INSTITUTION ────────────────────────────────────────────────── */}
        {activeTab === "institution" && (
          <div className="uni-settings-section-body">
            <div className="max-w-2xl">
              <h3 className="section-title mb-2">Institutional Scope &amp; Role Permissions</h3>
              <p className="text-sm text-muted mb-6">
                Institutional boundary enforcement is strictly applied. Review officers cannot access,
                inspect, or modify records belonging to other higher education institutions.
              </p>

              <div className="institution-info-card mb-6">
                <div className="inst-header">
                  <Building2 size={24} className="text-primary" />
                  <div>
                    <h4 className="font-bold text-navy text-lg">{institutionName}</h4>
                    <span className="text-xs text-muted">
                      Tenant ID: {activeMembership?.institution?.id || "tenant-uuid"}
                    </span>
                  </div>
                </div>
                <div className="inst-meta-grid mt-4">
                  <div><span className="label">Assigned Role:</span><span className="val font-semibold">Institutional Review Officer (Registry Admin)</span></div>
                  <div><span className="label">Verification Mode:</span><span className="val">Hybrid (Direct SIS API &amp; Roster Review)</span></div>
                  <div><span className="label">Access Boundary:</span><span className="val font-mono">STRICT TENANT ISOLATED</span></div>
                  <div><span className="label">Audit Recording:</span><span className="val text-success font-medium">Active (100% Traceable)</span></div>
                </div>
              </div>

              <div className="permitted-capabilities-box">
                <h4 className="font-semibold text-navy mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" /><span>Permitted Role Capabilities</span>
                </h4>
                <ul className="capabilities-list">
                  {[
                    "Review and certify student identity and enrollment evidence",
                    "Approve or decline digital student ID credentials with recorded rationale",
                    "Resolve student-submitted profile correction and programme transfer requests",
                    "Upload and commit institutional registrar student roster CSV files",
                    "Inspect tamper-evident institutional audit logs and export reports",
                  ].map((cap) => (
                    <li key={cap} className="flex items-center gap-2 text-sm text-slate-700 py-1">
                      <CheckCircle2 size={15} color="#059669" /><span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Photo Upload Modal */}
      <StaffPhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onSuccess={handlePhotoSuccess}
        currentPhotoUrl={officerPhoto}
      />
    </div>
  );
};

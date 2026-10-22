import React, { useState, useEffect } from "react";
import {
  Sliders,
  Bell,
  Eye,
  CheckCircle2,
  Sparkles,
  Smartphone,
  RotateCcw,
} from "lucide-react";

export const StudentSettingsPage: React.FC = () => {
  // Appearance Preferences
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem("uni_pref_reduced_motion") === "true";
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem("uni_pref_high_contrast") === "true";
  });
  const [compactLayout, setCompactLayout] = useState<boolean>(() => {
    return localStorage.getItem("uni_pref_compact_layout") === "true";
  });

  // Notification Preferences
  const [notifyCredential, setNotifyCredential] = useState<boolean>(() => {
    return localStorage.getItem("uni_pref_notify_cred") !== "false";
  });
  const [notifySecurity, setNotifySecurity] = useState<boolean>(() => {
    return localStorage.getItem("uni_pref_notify_sec") !== "false";
  });
  const [notifyRequests, setNotifyRequests] = useState<boolean>(() => {
    return localStorage.getItem("uni_pref_notify_req") !== "false";
  });

  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    localStorage.setItem("uni_pref_reduced_motion", String(reducedMotion));
    localStorage.setItem("uni_pref_high_contrast", String(highContrast));
    localStorage.setItem("uni_pref_compact_layout", String(compactLayout));
    localStorage.setItem("uni_pref_notify_cred", String(notifyCredential));
    localStorage.setItem("uni_pref_notify_sec", String(notifySecurity));
    localStorage.setItem("uni_pref_notify_req", String(notifyRequests));

    // Apply reduced motion or contrast to root if enabled
    if (reducedMotion) {
      document.documentElement.classList.add("reduced-motion");
    } else {
      document.documentElement.classList.remove("reduced-motion");
    }

    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [reducedMotion, highContrast, compactLayout, notifyCredential, notifySecurity, notifyRequests]);

  const handleResetDefaults = () => {
    setReducedMotion(false);
    setHighContrast(false);
    setCompactLayout(false);
    setNotifyCredential(true);
    setNotifySecurity(true);
    setNotifyRequests(true);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleSave = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div className="uni-student-settings-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Preferences & Accessibility</h1>
          <p className="uni-page-sub">
            Customize your wallet display, accessibility modes, and delivery preferences.
          </p>
        </div>
        <div className="uni-header-action-group">
          <button type="button" className="uni-btn-secondary" onClick={handleResetDefaults}>
            <RotateCcw size={15} />
            <span>Reset Defaults</span>
          </button>
          <button type="button" className="uni-btn-primary" onClick={handleSave}>
            <Sparkles size={15} />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="uni-callout-box success">
          <CheckCircle2 size={18} />
          <div>Preferences saved and applied to your current device session.</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
        {/* Visual & Accessibility */}
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
              <Eye size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#172033" }}>
                Display & Accessibility
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#647084" }}>
                Tailor animations, color contrast, and wallet styling.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Reduced Motion */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "#F8FAFC",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", color: "#172033", display: "block" }}>Reduced Motion</strong>
                <span style={{ fontSize: "12px", color: "#647084" }}>
                  Disables card flip transitions and pulsing badges.
                </span>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#243B80" }}
              />
            </label>

            {/* High Contrast */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "#F8FAFC",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", color: "#172033", display: "block" }}>High Contrast Borders</strong>
                <span style={{ fontSize: "12px", color: "#647084" }}>
                  Enhance border contrast on credentials and QR codes for outdoor readability.
                </span>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#243B80" }}
              />
            </label>

            {/* Compact Layout */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "#F8FAFC",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", color: "#172033", display: "block" }}>Compact View</strong>
                <span style={{ fontSize: "12px", color: "#647084" }}>
                  Reduces padding on cards and information lists for small displays.
                </span>
              </div>
              <input
                type="checkbox"
                checked={compactLayout}
                onChange={(e) => setCompactLayout(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#243B80" }}
              />
            </label>
          </div>
        </div>

        {/* Notification Preferences */}
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
                background: "rgba(35, 123, 75, 0.08)",
                color: "#237B4B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#172033" }}>
                Alert Preferences
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#647084" }}>
                Configure in-app and institutional notification alerts.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Credential alerts */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "#F8FAFC",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", color: "#172033", display: "block" }}>Credential Lifecycle Alerts</strong>
                <span style={{ fontSize: "12px", color: "#647084" }}>
                  Notify me when an ID is issued, refreshed, or nearing expiration.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifyCredential}
                onChange={(e) => setNotifyCredential(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#243B80" }}
              />
            </label>

            {/* Security Alerts */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "#F8FAFC",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", color: "#172033", display: "block" }}>Security & Login Notices</strong>
                <span style={{ fontSize: "12px", color: "#647084" }}>
                  Immediate notification on password changes and authentication events.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifySecurity}
                onChange={(e) => setNotifySecurity(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#243B80" }}
              />
            </label>

            {/* Request Status Updates */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "#F8FAFC",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              <div>
                <strong style={{ fontSize: "14px", color: "#172033", display: "block" }}>Support & Correction Status</strong>
                <span style={{ fontSize: "12px", color: "#647084" }}>
                  Alert when an institutional registrar reviews or resolves a request.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifyRequests}
                onChange={(e) => setNotifyRequests(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#243B80" }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Device & Client Status */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E6EF",
          borderRadius: "16px",
          padding: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Smartphone size={22} color="#647084" />
          <div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#172033", display: "block" }}>
              Local Device Storage
            </span>
            <span style={{ fontSize: "12px", color: "#647084" }}>
              Preferences are saved in your browser&apos;s local cache and persist across sessions.
            </span>
          </div>
        </div>
        <span className="uni-pill-neutral" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
          <Sliders size={13} /> Browser Storage Synced
        </span>
      </div>
    </div>
  );
};

import React, { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import {
  GraduationCap,
  Shield,
  Landmark,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  Zap,
} from "lucide-react";
import { Alert } from "@/components/common/Alert";
import { useAuth } from "@/auth/AuthContext";
import { apiClient, ApiError } from "@/services/apiClient";
import { UNIVERSITY_BRANDS } from "@/config/universities";
import { CurrentUser } from "@/types";

const getTargetRoute = (u: CurrentUser | null): string => {
  if (!u) return "/student";
  const hasStaff = u.memberships?.some(
    (m) => m.role === "verifier" || m.role === "registry_admin" || m.role === "platform_admin"
  );
  const hasStudent = u.memberships?.some((m) => m.role === "student");
  if (hasStaff && !hasStudent) return "/staff";
  return "/student";
};

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);

  if (user) return <Navigate to={getTargetRoute(user)} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const me = await apiClient.getCurrentUser();
      const fromPath = (location.state as { from?: string } | null)?.from;
      navigate(fromPath || getTargetRoute(me), { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to sign in. Please verify your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (demoEmail: string, demoPass: string, defaultPath: string = "/staff") => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setSubmitting(true);
    try {
      await login(demoEmail, demoPass);
      const me = await apiClient.getCurrentUser();
      const fromPath = (location.state as { from?: string } | null)?.from;
      navigate(fromPath || defaultPath || getTargetRoute(me), { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to sign in with demo account.");
    } finally {
      setSubmitting(false);
    }
  };

  const expired = Boolean((location.state as { expired?: boolean } | null)?.expired);

  return (
    <div className="uni-login-viewport">
      {/* =========================================================================
          LEFT SIDE: Campus Hero Banner
          ========================================================================= */}
      <div className="uni-login-banner-side">
        <div className="uni-login-banner-overlay" />

        <div className="uni-login-banner-content">
          {/* Top Brand Logo */}
          <Link to="/" className="uni-login-banner-logo" style={{ textDecoration: "none" }}>
            <div className="uni-login-banner-logo-icon">
              <GraduationCap size={20} />
            </div>
            <div>
              <div className="uni-login-banner-brand-text">UniID</div>
              <div className="uni-login-banner-brand-sub">Digital Student Identity</div>
            </div>
          </Link>

          {/* Center Welcome Copy */}
          <div className="uni-login-banner-center">
            <h1 className="uni-login-welcome-title">Welcome Back</h1>
            <p className="uni-login-welcome-desc">
              Sign in to access your digital student ID, manage your credentials, and connect with your university services.
            </p>
          </div>

          {/* Bottom 3 Feature Pillars */}
          <div className="uni-login-banner-footer-props">
            <div className="uni-login-prop-item">
              <Shield size={18} className="uni-login-prop-icon" />
              <div className="uni-login-prop-text">
                <strong>Secure Access</strong>
                <span>Your data is protected</span>
              </div>
            </div>

            <div className="uni-login-prop-item">
              <Landmark size={18} className="uni-login-prop-icon" />
              <div className="uni-login-prop-text">
                <strong>University Verified</strong>
                <span>Institution-aware access</span>
              </div>
            </div>

            <div className="uni-login-prop-item">
              <Lock size={18} className="uni-login-prop-icon" />
              <div className="uni-login-prop-text">
                <strong>24/7 Availability</strong>
                <span>Access from anywhere</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT SIDE: Sign In Form
          ========================================================================= */}
      <div className="uni-login-form-side">
        <div className="uni-login-card-container">
          <div className="uni-login-header-block">
            <h2 className="uni-login-title">Sign In</h2>
            <p className="uni-login-subtitle">Enter your credentials to continue</p>
          </div>

          {expired && (
            <Alert variant="warning" title="Session Expired">
              Your session has ended. Please sign in again.
            </Alert>
          )}

          {error && (
            <Alert variant="error" title="Sign-in failed">
              {error}
            </Alert>
          )}

          {/* Quick Demo Access Bar */}
          <div className="uni-quick-fill-panel" style={{ marginBottom: 20 }}>
            <div className="uni-quick-fill-header">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Zap size={14} color="#15803D" />
                <strong style={{ color: "#0F172A" }}>Quick Access &bull; LUANAR Demo</strong>
              </span>
              <span style={{ fontSize: "0.6875rem", color: "#64748B" }}>1-Click Instant Login</span>
            </div>
            <div className="uni-quick-fill-buttons" style={{ display: "flex", flexDirection: "column", gap: 8 }}>

              {/* LUANAR Reviewer */}
              <button
                type="button"
                className="uni-quick-chip"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#F0FDF4",
                  borderColor: "#BBF7D0",
                  color: "#14532D",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
                onClick={() => quickLogin("luanar.registry@demo.invalid", "LuanarRegistry!2026", "/staff")}
                disabled={submitting}
                title="Sign in as LUANAR Registry Administrator / Reviewer"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#DCFCE7" }}>
                    <img
                      src="/assets/logos/luanar.jpg"
                      alt="LUANAR"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.parentElement as HTMLElement).innerHTML = '<span style="font-size:12px;font-weight:700;color:#15803D">LU</span>'; }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#14532D" }}>
                      LUANAR &bull; Reviewer Dashboard
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#16A34A" }}>
                      Dr. Evelyn Nkhoma &bull; Registry Admin &bull; City Campus
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803D", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  Enter &rarr;
                </span>
              </button>

              {/* LUANAR Student */}
              <button
                type="button"
                className="uni-quick-chip"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#FAFFF5",
                  borderColor: "#D1FAE5",
                  color: "#166534",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
                onClick={() => quickLogin("luanar.student@demo.invalid", "LuanarStudent!2026", "/student")}
                disabled={submitting}
                title="Sign in as LUANAR BSc Agribusiness Student"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", color: "#15803D", flexShrink: 0 }}>
                    <GraduationCap size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#14532D" }}>
                      LUANAR &bull; Student Portal
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#16A34A" }}>
                      Chikondi Phiri &bull; BSc Agribusiness &bull; Year 2
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#16A34A", flexShrink: 0 }}>
                  Enter &rarr;
                </span>
              </button>

            </div>
          </div>

          <form onSubmit={submit}>
            {/* Email Field with Mail Icon */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="uni-input-with-icon-wrapper">
                <Mail size={17} className="uni-input-lead-icon" />
                <input
                  id="email"
                  type="email"
                  className="uni-input-with-icon"
                  placeholder="you@example.ac.mw"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field with Lock Icon & Eye Toggle */}
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="uni-input-with-icon-wrapper">
                <Lock size={17} className="uni-input-lead-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="uni-input-with-icon"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="uni-input-trail-action"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="uni-login-options-row">
              <label className="uni-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="uni-forgot-link"
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                onClick={() => alert("Please contact your university registry to reset your password.")}
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              className="uni-submit-button"
              disabled={submitting || !email || !password}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: 15, height: 15, marginRight: 8 }} />
                  <span>Signing In...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Divider "or" */}
            <div className="uni-or-divider">
              <span>or</span>
            </div>

            {/* Secondary Button: Select Institution */}
            <button
              type="button"
              className="uni-secondary-button"
              onClick={() => setShowInstitutionModal(true)}
            >
              <Building2 size={16} color="#475569" />
              <span>Select Institution</span>
            </button>

            {/* Contact Institution Link */}
            <div className="uni-login-bottom-action">
              <span>New student? </span>
              <Link
                to="/onboarding"
                style={{ fontWeight: 600, color: "#1E88E5", textDecoration: "underline" }}
              >
                Verify institutional email & register →
              </Link>
            </div>

            {/* Micro Footer Tag */}
            <div className="uni-login-footer-tag">
              UniID &bull; Digital Student Identity Platform
            </div>
          </form>
        </div>
      </div>

      {/* Institution Selector Modal */}
      {showInstitutionModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowInstitutionModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: "8px", backgroundColor: "#EFF6FF", color: "#0066FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Landmark size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.125rem", color: "#0F172A", fontWeight: 700 }}>Select Your Institution</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748B" }}>Choose your university to sign in</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "20px 0" }}>
              {UNIVERSITY_BRANDS.map((inst) => (
                <button
                  key={inst.code}
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                    backgroundColor: "#FFFFFF",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0066FF";
                    e.currentTarget.style.backgroundColor = "#F8FAFC";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#E2E8F0";
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }}
                  onClick={() => {
                    setShowInstitutionModal(false);
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className={`login-institution-logo university-logo-frame university-logo-frame--${inst.slug}`}>
                        <img className="university-logo" src={inst.logoSrc} alt="" />
                      </div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0F172A" }}>{inst.name}</div>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{inst.campus}</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#0066FF", fontWeight: 600 }}>Select &rarr;</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-md"
              style={{ width: "100%", borderRadius: "8px" }}
              onClick={() => setShowInstitutionModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

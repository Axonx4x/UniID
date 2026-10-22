import React from "react";
import { Link } from "react-router-dom";
import { GraduationCap, LogOut, LayoutDashboard, Building2 } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const isStaff = user?.memberships?.some(
    (m) => ["verifier", "registry_admin", "platform_admin"].includes(m.role) && m.status === "active"
  );

  return (
    <header className="uni-navbar">
      <div className="container">
        <div className="uni-navbar-inner">
          {/* Brand Logo & Subtitle */}
          <Link to="/" className="uni-brand-link">
            <div className="uni-brand-logo-icon">
              <GraduationCap size={22} />
            </div>
            <div className="uni-brand-name">UniID</div>
            <div className="uni-brand-divider" />
            <div className="uni-brand-tagline">
              <span>Digital Student Identity</span>
              <span>for a Smarter Tomorrow</span>
            </div>
          </Link>

          {/* Center Navigation Links: Briefing only */}
          <nav className="uni-nav-links desktop-nav">
            <a href="/#about" className="uni-nav-link">
              About
            </a>
            <a href="/#features" className="uni-nav-link">
              Features
            </a>
            <a href="/#how-it-works" className="uni-nav-link">
              How It Works
            </a>
            <a href="/#universities" className="uni-nav-link">
              Universities
            </a>
            <a href="/#support" className="uni-nav-link">
              Support
            </a>
            <Link
              to="/staff"
              className="uni-nav-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                color: "#1E88E5",
                fontWeight: 600,
              }}
            >
              <Building2 size={15} />
              <span>Reviewer Portal</span>
            </Link>
          </nav>

          {/* Right Action / Authentication */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {user ? (
              <>
                <Link
                  to={isStaff ? "/staff" : "/app"}
                  className="uni-btn-login"
                  style={{ gap: "6px" }}
                >
                  <LayoutDashboard size={15} />
                  <span>{isStaff ? "Reviewer Console" : "Dashboard"}</span>
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void logout()}
                  style={{ color: "#64748B" }}
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/staff"
                  className="uni-btn-login mobile-only"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    color: "#1E88E5",
                    borderColor: "#BFDBFE",
                    backgroundColor: "#EFF6FF",
                  }}
                >
                  <Building2 size={14} />
                  <span>Reviewer</span>
                </Link>
                <Link to="/login" className="uni-btn-login">
                  Sign In
                </Link>
                <Link to="/onboarding" className="btn btn-primary btn-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

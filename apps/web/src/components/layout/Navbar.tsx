import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield, BookOpen } from "lucide-react";
import { BackendStatusBadge } from "./BackendStatusBadge";

export const Navbar: React.FC = () => {
  const location = useLocation();

  const navLinks = [
    { label: "Overview", path: "/" },
    { label: "Architecture", path: "/#architecture" },
    { label: "API Contracts", path: "/#api-contracts" },
    { label: "Roadmap", path: "/#roadmap" },
  ];

  return (
    <header
      style={{
        backgroundColor: "var(--color-primary)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
        }}
      >
        {/* Brand / Logo */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#ffffff",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "8px",
              backgroundColor: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-family-display)",
                fontWeight: 700,
                fontSize: "1.125rem",
                letterSpacing: "-0.3px",
                lineHeight: 1.1,
              }}
            >
              AstraMind
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                fontWeight: 600,
              }}
            >
              Digital Student ID
            </div>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav
          style={{
            display: "none",
            alignItems: "center",
            gap: "24px",
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.path}
              style={{
                color: location.hash === link.path.replace("/", "") ? "#ffffff" : "#94a3b8",
                fontSize: "var(--font-size-sm)",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color var(--transition-fast)",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Action & Status Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BackendStatusBadge />
          <a
            href="http://localhost:8000/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            style={{
              color: "#ffffff",
              borderColor: "rgba(255, 255, 255, 0.2)",
              fontSize: "12px",
            }}
          >
            <BookOpen size={13} />
            <span>API Docs</span>
          </a>
        </div>
      </div>
    </header>
  );
};

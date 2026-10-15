import { ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: "#060f1c",
        borderTop: "1px solid #1e293b",
        color: "#94a3b8",
        padding: "48px 0 24px 0",
        marginTop: "auto",
        fontSize: "var(--font-size-sm)",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "36px",
            marginBottom: "36px",
          }}
        >
          {/* Brand & Purpose */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ffffff", marginBottom: "12px" }}>
              <ShieldCheck size={20} color="var(--color-accent)" />
              <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "1.1rem" }}>
                AstraMind Digital Student ID
              </span>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6 }}>
              A multi-tenant digital student identity, lifecycle management, and credential verification platform for
              higher education institutions in Malawi.
            </p>
          </div>

          {/* Architectural Constraints */}
          <div>
            <h4 style={{ color: "#f8fafc", fontSize: "0.875rem", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Engineering Tenets
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "#64748b", fontSize: "0.8125rem", lineHeight: 1.8 }}>
              <li>&bull; Multi-Tenant Isolation per University</li>
              <li>&bull; Institutional System of Record as Authority</li>
              <li>&bull; Verification via Backend Cryptographic Rules</li>
              <li>&bull; Payment Separation from Eligibility</li>
              <li>&bull; Explicit UTC Audit Logging</li>
            </ul>
          </div>

          {/* Target Institutions Context */}
          <div>
            <h4 style={{ color: "#f8fafc", fontSize: "0.875rem", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Pilot & Integration Scope
            </h4>
            <p style={{ color: "#64748b", fontSize: "0.8125rem", lineHeight: 1.6 }}>
              Designed for pilot evaluation with public and private universities in Malawi (e.g. LUANAR City Campus, KUHeS, MUST, MZUNI).
            </p>
            <div style={{ marginTop: "12px", fontSize: "0.75rem", color: "#475569" }}>
              All institution marks and sample records in this demo remain illustrative.
            </div>
          </div>
        </div>

        {/* Bottom Bar & Disclaimer */}
        <div
          style={{
            borderTop: "1px solid #1e293b",
            paddingTop: "24px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            fontSize: "0.75rem",
            color: "#64748b",
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} AstraMind Labs. Phase 1 Engineering Foundation &amp; Architecture Contracts.
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <span>FastAPI 0.115+</span>
            <span>SQLAlchemy 2.0</span>
            <span>PostgreSQL 16</span>
            <span>React 18 + Vite</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

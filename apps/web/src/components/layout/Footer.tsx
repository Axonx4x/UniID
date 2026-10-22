import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

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
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#ffffff", marginBottom: "12px" }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "6px",
                  backgroundColor: "#0066FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                }}
              >
                <GraduationCap size={18} />
              </div>
              <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.3px" }}>
                UniID Platform
              </span>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6 }}>
              A secure digital student identity and credential verification
              platform for higher education institutions across Malawi.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: "#f8fafc", fontSize: "0.875rem", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Quick Links
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "#64748b", fontSize: "0.8125rem", lineHeight: 2.2 }}>
              <li><Link to="/" style={{ color: "#94a3b8", textDecoration: "none" }}>Home</Link></li>
              <li><a href="#features" style={{ color: "#94a3b8", textDecoration: "none" }}>Features</a></li>
              <li><a href="#universities" style={{ color: "#94a3b8", textDecoration: "none" }}>University Directory</a></li>
              <li><Link to="/login" style={{ color: "#94a3b8", textDecoration: "none" }}>Student Login</Link></li>
              <li><a href="#support" style={{ color: "#94a3b8", textDecoration: "none" }}>Help & Support</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: "#f8fafc", fontSize: "0.875rem", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Contact Us
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", color: "#64748b", fontSize: "0.8125rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={14} style={{ flexShrink: 0 }} />
                <span>support@uniid.mw</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Phone size={14} style={{ flexShrink: 0 }} />
                <span>+265 1 234 567</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={14} style={{ flexShrink: 0 }} />
                <span>Lilongwe, Malawi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
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
            &copy; {new Date().getFullYear()} UniID &bull; AstraMind Digital Student Identity.
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <a href="#" style={{ color: "#94a3b8", textDecoration: "none" }}>Privacy Policy</a>
            <a href="#" style={{ color: "#94a3b8", textDecoration: "none" }}>Terms of Service</a>
            <a href="#" style={{ color: "#94a3b8", textDecoration: "none" }}>Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

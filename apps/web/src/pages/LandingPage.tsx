import React from "react";
import {
  Shield,
  Zap,
  Landmark,
  Smartphone,
  Building2,
  Users,
  CreditCard,
  QrCode,
  ArrowRight,
  CheckCircle2,
  Star,
  GraduationCap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StudentIdCard } from "@/components/card/StudentIdCard";
import { useAuth } from "@/auth/AuthContext";
import { LayoutDashboard } from "lucide-react";
import { UNIVERSITY_BRANDS } from "@/config/universities";

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh" }}>
      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <section className="uni-hero-section">
        {/* Contextual Background: Holographic Digital ID Cards & Security Geometry */}
        <div className="uni-bg-context-decorations" aria-hidden="true">
          <div className="uni-ambient-glow-1" />
          <div className="uni-ambient-glow-2" />

          {/* Guilloché & Security Geometric Wave Patterns */}
          <svg className="uni-bg-security-geometry" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="secGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0066FF" stopOpacity="0.18" />
                <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
              <pattern id="secMesh" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#0066FF" strokeWidth="0.75" strokeOpacity="0.05" />
                <circle cx="24" cy="24" r="1.5" fill="#0066FF" fillOpacity="0.1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#secMesh)" />
            <path d="M-100,180 C200,80 400,320 800,220 C1200,120 1350,280 1550,200" stroke="url(#secGrad)" strokeWidth="2.5" fill="none" />
            <path d="M-100,210 C200,110 400,350 800,250 C1200,150 1350,310 1550,230" stroke="url(#secGrad)" strokeWidth="1.5" strokeDasharray="6 4" fill="none" />
            <path d="M-100,240 C200,140 400,380 800,280 C1200,180 1350,340 1550,260" stroke="url(#secGrad)" strokeWidth="1" fill="none" />
            <path d="M-100,520 C300,420 500,680 900,560 C1300,440 1400,620 1600,540" stroke="url(#secGrad)" strokeWidth="2" fill="none" />
          </svg>

          {/* Floating Contextual ID Card 1 (Holographic University Digital ID) */}
          <div className="uni-bg-floating-card-1">
            <div className="uni-card-ghost-header">
              <div className="uni-card-ghost-logo">
                <GraduationCap size={16} />
                <span>MALAWI STUDENT IDENTITY</span>
              </div>
              <div className="uni-card-ghost-chip" />
            </div>
            <div className="uni-card-ghost-body">
              <div className="uni-card-ghost-avatar" />
              <div className="uni-card-ghost-lines">
                <div className="uni-ghost-line w-80" />
                <div className="uni-ghost-line w-60" />
                <div className="uni-ghost-line w-40" />
              </div>
            </div>
            <div className="uni-card-ghost-footer">
              <span>UNIMA &bull; VERIFIED</span>
              <QrCode size={14} style={{ opacity: 0.6 }} />
            </div>
          </div>

          {/* Floating Contextual ID Card 2 (Institutional Digital Badge) */}
          <div className="uni-bg-floating-card-2">
            <div className="uni-card-ghost-header">
              <div className="uni-card-ghost-logo">
                <Building2 size={15} />
                <span>MUST SMART CREDENTIAL</span>
              </div>
              <CheckCircle2 size={15} color="#059669" style={{ opacity: 0.8 }} />
            </div>
            <div className="uni-card-ghost-body">
              <div className="uni-card-ghost-avatar" style={{ borderRadius: "50%", width: "46px", height: "46px" }} />
              <div className="uni-card-ghost-lines">
                <div className="uni-ghost-line w-80" />
                <div className="uni-ghost-line w-40" />
              </div>
            </div>
            <div className="uni-card-ghost-footer">
              <span>OFFICIAL STUDENT REGISTRATION</span>
              <span>2025/2026</span>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="uni-hero-grid">
            {/* Left Column: Headlines & Features */}
            <div className="uni-hero-left">
              {/* Headline */}
              <h1 className="uni-hero-title">
                Your Student Identity.
                <span className="highlight-blue">Digital, Safe, and Always</span>
                <span className="highlight-blue">With You.</span>
              </h1>

              {/* Subtitle */}
              <p className="uni-hero-subtitle">
                UniID provides a secure and convenient digital student ID for Malawi's universities.
                Access your campus services, manage your credentials and stay connected &mdash; all in one place.
              </p>

              {/* Hero Action Buttons */}
              <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "32px", flexWrap: "wrap" }}>
                {user ? (
                  <Link
                    to="/app"
                    className="uni-primary-btn"
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px", fontSize: "0.9375rem" }}
                  >
                    <LayoutDashboard size={18} />
                    <span>Go to My Dashboard</span>
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/onboarding"
                      className="uni-primary-btn"
                      style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px", fontSize: "0.9375rem" }}
                    >
                      <span>Get Started</span>
                      <ArrowRight size={16} />
                    </Link>
                    <Link
                      to="/login"
                      className="uni-secondary-btn"
                      style={{ padding: "12px 24px", fontSize: "0.9375rem" }}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/staff"
                      className="uni-secondary-btn"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 22px",
                        fontSize: "0.9375rem",
                        borderColor: "#BFDBFE",
                        backgroundColor: "#EFF6FF",
                        color: "#1D4ED8",
                        fontWeight: 600,
                      }}
                      title="Direct access to the Institutional Reviewer Console"
                    >
                      <Building2 size={16} color="#1D4ED8" />
                      <span>Reviewer Console</span>
                    </Link>
                  </>
                )}
              </div>

              {/* 4 Feature Columns */}
              <div id="features" className="uni-features-row">
                <div className="uni-feature-item">
                  <div className="uni-feature-icon-box blue">
                    <Shield size={20} />
                  </div>
                  <div className="uni-feature-title">Secure &amp; Verified</div>
                  <div className="uni-feature-desc">Designed for multi-institution higher-education demonstrations.</div>
                </div>

                <div className="uni-feature-item">
                  <div className="uni-feature-icon-box green">
                    <Zap size={20} />
                  </div>
                  <div className="uni-feature-title">Easy Access</div>
                  <div className="uni-feature-desc">Your student ID and services in one place.</div>
                </div>

                <div className="uni-feature-item">
                  <div className="uni-feature-icon-box purple">
                    <Landmark size={20} />
                  </div>
                  <div className="uni-feature-title">University Connected</div>
                  <div className="uni-feature-desc">Integrated with your institution's systems.</div>
                </div>

                <div className="uni-feature-item">
                  <div className="uni-feature-icon-box cyan">
                    <Smartphone size={20} />
                  </div>
                  <div className="uni-feature-title">Always Available</div>
                  <div className="uni-feature-desc">Access from any device, anytime, anywhere.</div>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Cutout & Floating Student ID Card */}
            <div className="uni-hero-visual-wrapper">
              {/* Azure Circular Backdrop */}
              <div className="uni-hero-circle-backdrop" />

              {/* Floating ID Card */}
              <div className="uni-floating-card-anchor">
                <StudentIdCard
                  name="Chisomo Banda"
                  studentNo="2024/00123"
                  programme="BSc Computer Science"
                  college="Chancellor College"
                  institutionName="University of Malawi"
                  status="Active"
                  photoUrl="/assets/images/student_id_photo.jpg"
                />
              </div>

              {/* Student Photo Cutout Frame */}
              <div className="uni-hero-student-frame">
                <img
                  src="/assets/images/student_hero.jpg"
                  alt="University Student in Malawi"
                  className="uni-hero-student-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80";
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CALL-TO-ACTION BANNER
          ========================================================================= */}
      <section style={{ backgroundColor: "#F8FAFC", padding: "40px 0", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", color: "#0F172A", margin: "0 0 4px 0", fontWeight: 700 }}>
                Ready to Get Your Digital Student ID?
              </h2>
              <p style={{ color: "#64748B", fontSize: "0.875rem", margin: 0 }}>
                Sign in with your university credentials to access your digital identity, campus services, and more.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {user ? (
                <Link to="/app" className="uni-btn-login" style={{ fontSize: "0.9375rem", padding: "10px 24px" }}>
                  <span>Go to My Dashboard</span>
                  <ArrowRight size={16} style={{ marginLeft: "6px" }} />
                </Link>
              ) : (
                <>
                  <Link to="/onboarding" className="uni-primary-btn" style={{ fontSize: "0.9375rem", padding: "10px 24px" }}>
                    <span>Get Started</span>
                    <ArrowRight size={16} style={{ marginLeft: "6px" }} />
                  </Link>
                  <Link to="/login" className="uni-btn-login" style={{ fontSize: "0.9375rem", padding: "10px 24px" }}>
                    <span>Sign In</span>
                  </Link>
                </>
              )}
              <a
                href="#how-it-works"
                className="btn btn-secondary btn-md"
                style={{ borderRadius: "8px", fontWeight: 600 }}
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          HOW IT WORKS
          ========================================================================= */}
      <section id="how-it-works" style={{ padding: "72px 0", backgroundColor: "#ffffff" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 56px auto" }}>
            <h2 style={{ fontSize: "1.875rem", marginBottom: 12 }}>How It Works</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
              Getting started with your digital student ID is quick and straightforward. Here's how the process works.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32, maxWidth: 960, margin: "0 auto" }}>
            {[
              {
                step: "01",
                title: "University Enrollment",
                desc: "Your institution registers you in the UniID system as part of the enrollment process.",
                color: "#0066FF",
                bgColor: "#EFF6FF",
              },
              {
                step: "02",
                title: "Credential Issuance",
                desc: "Once verified by your university registry, your digital student ID credential is issued securely.",
                color: "#059669",
                bgColor: "#ecfdf5",
              },
              {
                step: "03",
                title: "Access & Verify",
                desc: "Sign in to view your ID, present your QR code for verification, and access campus services instantly.",
                color: "#7c3aed",
                bgColor: "#f3e8ff",
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  textAlign: "center",
                  padding: "32px 24px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--bg-border)",
                  backgroundColor: "#ffffff",
                  transition: "box-shadow 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    backgroundColor: item.bgColor,
                    color: item.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "1.25rem",
                    fontFamily: "var(--font-family-display)",
                    margin: "0 auto 16px auto",
                  }}
                >
                  {item.step}
                </div>
                <h3 style={{ fontSize: "1.125rem", marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          PLATFORM BENEFITS
          ========================================================================= */}
      <section
        id="about"
        style={{
          backgroundColor: "#F8FAFC",
          padding: "72px 0",
          borderTop: "1px solid var(--bg-border)",
          borderBottom: "1px solid var(--bg-border)",
        }}
      >
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 48px auto" }}>
            <h2 style={{ fontSize: "1.875rem", marginBottom: 12 }}>Why Universities Choose UniID</h2>
            <p style={{ color: "var(--text-muted)" }}>
              Designed specifically for the higher education landscape in Malawi, UniID delivers security, transparency, and operational efficiency.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                icon: <Building2 size={20} />,
                title: "Institution-Level Security",
                desc: "Each university operates within its own secure environment. Student data, credentials, and administrative actions are fully isolated between institutions.",
                iconBg: "#e0f2fe",
                iconColor: "#0284c7",
              },
              {
                icon: <Users size={20} />,
                title: "Registry Integration",
                desc: "UniID connects with your university's student registry to ensure real-time eligibility verification and enrollment status, eliminating outdated records.",
                iconBg: "#ecfdf5",
                iconColor: "#059669",
              },
              {
                icon: <CreditCard size={20} />,
                title: "Transparent Fee Management",
                desc: "Card fees and student verification are tracked independently. Payment status does not affect enrollment verification, ensuring fair and accurate records.",
                iconBg: "#fef3c7",
                iconColor: "#d97706",
              },
              {
                icon: <QrCode size={20} />,
                title: "Secure QR Verification",
                desc: "Every student ID includes a tamper-proof QR code verified in real-time against the university's records. No personal data is exposed on the code itself.",
                iconBg: "#f3e8ff",
                iconColor: "#9333ea",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: 24,
                  backgroundColor: "#ffffff",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--bg-border)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "8px",
                    backgroundColor: item.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.iconColor,
                    marginBottom: 16,
                  }}
                >
                  {item.icon}
                </div>
                <h3 style={{ fontSize: "1.125rem", marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          UNIVERSITY DIRECTORY
          ========================================================================= */}
      <section id="universities" style={{ padding: "72px 0", backgroundColor: "#ffffff" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px auto" }}>
            <h2 style={{ fontSize: "1.875rem", marginBottom: 12 }}>University directory</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
              Institutions represented in this Malawi higher-education demonstration.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 20,
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            {UNIVERSITY_BRANDS.map((uni) => (
              <div
                key={uni.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 20px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--bg-border)",
                  backgroundColor: "#f8fafc",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div className={`landing-institution-logo university-logo-frame university-logo-frame--${uni.slug}`}>
                  <img className="university-logo" src={uni.logoSrc} alt={`${uni.name} logo`} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0F172A" }}>{uni.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
                    <CheckCircle2 size={11} style={{ display: "inline", marginRight: 3, verticalAlign: "-1px" }} />
                    Institution directory
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.5, maxWidth: 700, margin: "24px auto 0", textAlign: "center" }}>
            University names and marks are displayed for identification only. They do not indicate endorsement, affiliation, or a live institutional integration.
          </p>
        </div>
      </section>

      {/* =========================================================================
          STUDENT TESTIMONIALS
          ========================================================================= */}
      <section style={{ padding: "64px 0", backgroundColor: "#F8FAFC", borderTop: "1px solid var(--bg-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px auto" }}>
            <h2 style={{ fontSize: "1.875rem", marginBottom: 12 }}>What Students Say</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
              Hear from students across Malawi who are already using UniID.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, maxWidth: 960, margin: "0 auto" }}>
            {[
              {
                quote: "I no longer worry about losing my ID card. UniID is always on my phone and I can verify my identity anywhere on campus.",
                name: "Chisomo B.",
                programme: "BSc Computer Science",
                uni: "University of Malawi",
              },
              {
                quote: "The QR verification is so fast. Security just scans my phone and I'm through the gate in seconds. Much better than the old plastic cards.",
                name: "Thandiwe M.",
                programme: "Diploma in Agriculture",
                uni: "LUANAR",
              },
              {
                quote: "As a registry administrator, the credential lifecycle management has streamlined our entire ID issuance process. It's a game changer.",
                name: "James K.",
                programme: "Registry Office",
                uni: "MUBAS",
              },
            ].map((t) => (
              <div
                key={t.name}
                style={{
                  padding: 24,
                  backgroundColor: "#ffffff",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--bg-border)",
                }}
              >
                <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} fill="#FBBF24" color="#FBBF24" />
                  ))}
                </div>
                <p style={{ fontSize: "0.9375rem", color: "#334155", lineHeight: 1.7, fontStyle: "italic", marginBottom: 16 }}>
                  "{t.quote}"
                </p>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0F172A" }}>{t.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{t.programme} &bull; {t.uni}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          FINAL CTA
          ========================================================================= */}
      <section id="support" style={{ padding: "72px 0", backgroundColor: "#ffffff" }}>
        <div className="container" style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: "1.875rem", marginBottom: 12 }}>Get Started Today</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", marginBottom: 28 }}>
            If your university is part of the UniID network, sign in with your institutional credentials to access your digital student ID. Need help? Contact your university's registry office.
          </p>
          {user ? (
            <Link
              to="/app"
              className="uni-primary-btn"
              style={{ fontSize: "1rem", padding: "12px 32px", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <LayoutDashboard size={18} />
              <span>Go to My Dashboard</span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                to="/onboarding"
                className="uni-primary-btn"
                style={{ fontSize: "1rem", padding: "12px 32px", display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <span>Get Started</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="uni-btn-login"
                style={{ fontSize: "1rem", padding: "12px 32px", display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

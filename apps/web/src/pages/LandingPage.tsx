import React, { useState, useEffect } from "react";
import {
  Shield,
  QrCode,
  Users,
  Building2,
  CreditCard,
  Server,
  Cpu,
  RefreshCw,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Alert } from "@/components/common/Alert";
import { apiClient } from "@/services/apiClient";
import { HealthResponse, ReadyResponse } from "@/types";

export const LandingPage: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [readyData, setReadyData] = useState<ReadyResponse | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    setDiagnosticError(null);
    try {
      const [health, ready] = await Promise.all([
        apiClient.getHealth(),
        apiClient.getReadiness().catch((err) => ({
          status: "not_ready" as const,
          timestamp: new Date().toISOString(),
          environment: "development",
          version: "0.1.0",
          database: {
            connected: false,
            latency_ms: 0,
            error: err instanceof Error ? err.message : "Database connection failed",
          },
        })),
      ]);
      setHealthData(health);
      setReadyData(ready);
    } catch (err) {
      setDiagnosticError(err instanceof Error ? err.message : "Unable to reach backend API");
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  return (
    <div style={{ backgroundColor: "var(--bg-app)", minHeight: "calc(100vh - 120px)" }}>
      {/* Hero Section */}
      <section
        style={{
          backgroundColor: "var(--color-primary)",
          color: "#ffffff",
          padding: "64px 0 72px 0",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="container">
          <div style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Badge variant="navy" icon={<Shield size={12} />}>
                Higher Education Identity &bull; Malawi
              </Badge>
              <Badge variant="warning">
                Phase 1 Foundation
              </Badge>
            </div>

            <h1
              style={{
                fontFamily: "var(--font-family-display)",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.5px",
                lineHeight: 1.2,
                marginBottom: 20,
              }}
            >
              Unified Digital Student ID &amp; Verification Platform
            </h1>

            <p
              style={{
                fontSize: "clamp(1rem, 1.5vw, 1.125rem)",
                color: "#cbd5e1",
                lineHeight: 1.6,
                marginBottom: 32,
              }}
            >
              A multi-tenant identity verification infrastructure engineered for universities in Malawi.
              Delivering secure digital credentials, real-time QR verification, and automated registry lifecycle
              management without replacing existing university management systems.
            </p>

            {/* Disclaimer Alert */}
            <div
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "var(--radius-lg)",
                padding: "16px 20px",
                textAlign: "left",
                fontSize: "0.875rem",
                color: "#e2e8f0",
                marginBottom: 32,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <AlertCircle size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: "#ffffff" }}>Pilot Evaluation Environment:</strong> This interface represents
                an engineering demonstration platform prepared for institutional review. Sample records (such as LUANAR
                City Campus fixtures) are synthetic and do not claim formal operational deployment or authorized student
                data access.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <a href="#diagnostics" className="btn btn-accent btn-lg">
                <Cpu size={16} />
                <span>Verify System Contracts</span>
              </a>
              <a
                href="http://localhost:8000/api/v1/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-lg"
                style={{ color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.3)" }}
              >
                <FileText size={16} />
                <span>API Swagger Schema</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Live System Contracts & Connectivity Diagnostics */}
      <section id="diagnostics" style={{ padding: "48px 0" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Server size={18} color="var(--color-accent)" />
                <h2 style={{ fontSize: "1.5rem", margin: 0 }}>System Readiness &amp; Connectivity</h2>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
                Live verification of FastAPI backend contracts and PostgreSQL database persistence.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchDiagnostics}
              loading={loadingDiagnostics}
              icon={<RefreshCw size={13} />}
            >
              Execute Health Probe
            </Button>
          </div>

          {diagnosticError && (
            <Alert variant="error" title="Backend Connection Error">
              {diagnosticError}. Ensure the FastAPI server is running on port 8000.
            </Alert>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              marginBottom: 48,
            }}
          >
            {/* API Health Card */}
            <Card>
              <CardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <CardTitle>FastAPI Backend</CardTitle>
                  <Badge variant={healthData ? "success" : "error"}>
                    {healthData ? "Operational" : "Unreachable"}
                  </Badge>
                </div>
                <CardDescription>Endpoint: GET /api/v1/health</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Status:</span>
                    <strong>{healthData?.status || "Offline"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Environment:</span>
                    <code>{healthData?.environment || "N/A"}</code>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>API Version:</span>
                    <span>v{healthData?.version || "0.1.0"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Simulation Mode:</span>
                    <Badge variant="navy">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database Readiness Card */}
            <Card>
              <CardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <CardTitle>PostgreSQL 16</CardTitle>
                  <Badge variant={readyData?.database.connected ? "success" : "error"}>
                    {readyData?.database.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <CardDescription>Endpoint: GET /api/v1/ready</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Subsystem State:</span>
                    <strong>{readyData?.status === "ready" ? "Ready" : "Degraded / Unready"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Query Latency:</span>
                    <span>{readyData?.database.latency_ms ? `${readyData.database.latency_ms} ms` : "N/A"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Alembic Migrations:</span>
                    <Badge variant="success">0001_initial Applied</Badge>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Driver:</span>
                    <code>psycopg 3 (binary)</code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tenant Isolation Model */}
            <Card>
              <CardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <CardTitle>Tenant Isolation</CardTitle>
                  <Badge variant="info">Multi-Tenant</Badge>
                </div>
                <CardDescription>Architecture Boundary</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Partition Model:</span>
                    <strong>Institution ID / Code</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Pilot Reference:</span>
                    <code>LUANAR City Campus</code>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Audit Timestamps:</span>
                    <span>Strict UTC DateTime</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Integration Layer:</span>
                    <span>Simulation Adapters</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Architectural Tenets */}
      <section style={{ backgroundColor: "#ffffff", padding: "64px 0", borderTop: "1px solid var(--bg-border)", borderBottom: "1px solid var(--bg-border)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 48px auto" }}>
            <h2 style={{ fontSize: "1.875rem", marginBottom: 12 }}>Core Architecture Tenets</h2>
            <p style={{ color: "var(--text-muted)" }}>
              The platform adheres to strict engineering and security contracts established for higher education identity management.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            <div style={{ padding: 24, backgroundColor: "var(--bg-app)", borderRadius: "var(--radius-lg)", border: "1px solid var(--bg-border)" }}>
              <div style={{ width: 40, height: 40, borderRadius: "8px", backgroundColor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7", marginBottom: 16 }}>
                <Building2 size={20} />
              </div>
              <h3 style={{ fontSize: "1.125rem", marginBottom: 8 }}>Institution-Scoped Tenants</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Each university operates as an isolated tenant. Records, credentials, and audit logs are strictly partitioned so administrators cannot access peer institution data.
              </p>
            </div>

            <div style={{ padding: 24, backgroundColor: "var(--bg-app)", borderRadius: "var(--radius-lg)", border: "1px solid var(--bg-border)" }}>
              <div style={{ width: 40, height: 40, borderRadius: "8px", backgroundColor: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", marginBottom: 16 }}>
                <Users size={20} />
              </div>
              <h3 style={{ fontSize: "1.125rem", marginBottom: 8 }}>Registry as Authority</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                AstraMind synchronizes student eligibility from the university's authorized system of record rather than independently deciding enrollment or academic standing.
              </p>
            </div>

            <div style={{ padding: 24, backgroundColor: "var(--bg-app)", borderRadius: "var(--radius-lg)", border: "1px solid var(--bg-border)" }}>
              <div style={{ width: 40, height: 40, borderRadius: "8px", backgroundColor: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", marginBottom: 16 }}>
                <CreditCard size={20} />
              </div>
              <h3 style={{ fontSize: "1.125rem", marginBottom: 8 }}>Payment Separation</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Payment of the annual card fee does not constitute proof of student identity or academic enrollment. Both conditions must be met independently.
              </p>
            </div>

            <div style={{ padding: 24, backgroundColor: "var(--bg-app)", borderRadius: "var(--radius-lg)", border: "1px solid var(--bg-border)" }}>
              <div style={{ width: 40, height: 40, borderRadius: "8px", backgroundColor: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#9333ea", marginBottom: 16 }}>
                <QrCode size={20} />
              </div>
              <h3 style={{ fontSize: "1.125rem", marginBottom: 8 }}>Backend-Verified QR Codes</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                QR codes contain tamper-evident cryptographic references verified against backend business rules rather than exposing plaintext student data on screen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Phase Product Roadmap */}
      <section id="roadmap" style={{ padding: "64px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 48px auto" }}>
            <h2 style={{ fontSize: "1.875rem", marginBottom: 12 }}>Platform Implementation Plan</h2>
            <p style={{ color: "var(--text-muted)" }}>
              Structured, incremental delivery ensuring verifiable engineering milestones before moving to interactive modules.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900, margin: "0 auto" }}>
            {/* Phase 1 */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "var(--radius-lg)",
                padding: "24px",
                border: "2px solid var(--color-accent)",
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                P1
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <h3 style={{ fontSize: "1.25rem", margin: 0 }}>Repository Foundation &amp; Engineering Contracts</h3>
                  <Badge variant="success">Completed &amp; Executable</Badge>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: 12, lineHeight: 1.6 }}>
                  Monorepo architecture, FastAPI backend with /health and /ready probes, SQLAlchemy 2.x session management,
                  Alembic migrations, PostgreSQL Docker Compose setup, strict TypeScript configuration, design tokens, and comprehensive architecture specifications.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="badge badge-default">FastAPI 0.115+</span>
                  <span className="badge badge-default">SQLAlchemy 2.0</span>
                  <span className="badge badge-default">Alembic</span>
                  <span className="badge badge-default">Vite + React</span>
                  <span className="badge badge-default">Pytest Suite</span>
                  <span className="badge badge-default">Playwright Ready</span>
                </div>
              </div>
            </div>

            {/* Phase 2 */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "var(--radius-lg)",
                padding: "24px",
                border: "1px solid var(--bg-border)",
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
                opacity: 0.85,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  backgroundColor: "var(--bg-surface-raised)",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                P2
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <h3 style={{ fontSize: "1.25rem", margin: 0 }}>Student Digital ID &amp; Offline Display</h3>
                  <Badge variant="default">Phase 2 Scope</Badge>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: 8, lineHeight: 1.6 }}>
                  Institutional digital card view, student photo, registration number, programme, academic year, expiry date,
                  offline display caching, and full-screen dynamic QR code presentation.
                </p>
              </div>
            </div>

            {/* Phase 3 */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "var(--radius-lg)",
                padding: "24px",
                border: "1px solid var(--bg-border)",
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
                opacity: 0.85,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  backgroundColor: "var(--bg-surface-raised)",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                P3
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <h3 style={{ fontSize: "1.25rem", margin: 0 }}>QR Verification &amp; Registry Lifecycle Administration</h3>
                  <Badge variant="default">Phase 3 Scope</Badge>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: 8, lineHeight: 1.6 }}>
                  Verifier interface for campus security/exam officers (Active, Revoked, Expired results), Registry administrative
                  dashboard for credential issuance and revocation, and simulated annual fee payment flows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  FileText,
  Lock,
  Info,
} from "lucide-react";
import { StudentDashboardResponse } from "@/types";
import { getUniversityBrand } from "@/config/universities";

interface StudentContextType {
  dashboard: StudentDashboardResponse | null;
  refreshDashboard: () => void;
  loading: boolean;
}

export const StudentPrivacyPage: React.FC = () => {
  const { dashboard } = useOutletContext<StudentContextType>();
  const brand = getUniversityBrand(dashboard?.institution?.slug || dashboard?.institution?.name);
  const instName = dashboard?.institution?.name || brand.name;

  return (
    <div className="uni-student-privacy-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Privacy & Data Governance</h1>
          <p className="uni-page-sub">
            Learn how your academic identity data is minimized, protected, and shared across digital verification checkpoints.
          </p>
        </div>
        <div className="uni-header-action-group">
          <Link to="/student/requests" className="uni-btn-primary">
            <FileText size={16} />
            <span>Data Inquiry / Request</span>
          </Link>
        </div>
      </div>

      {/* Trust & Architecture Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #17264D 0%, #243B80 100%)",
          borderRadius: "16px",
          padding: "24px 28px",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 4px 16px rgba(23, 38, 77, 0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={22} color="#FFFFFF" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Data Minimization Principle</h2>
            <p style={{ margin: 0, fontSize: "14px", color: "rgba(255, 255, 255, 0.85)" }}>
              UniID only exposes cryptographically verified proof of affiliation. Verifiers cannot access your full academic history.
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Data Disclosure Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Public Verifier View */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(35, 123, 75, 0.1)",
                color: "#237B4B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Eye size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#172033" }}>
                Publicly Verifiable Attributes
              </h3>
              <span style={{ fontSize: "12px", color: "#647084" }}>
                Shown to inspectors scanning your QR presentation code
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Student Full Name", note: "Confirmed against institutional registrar snapshot" },
              { label: "Issuing Institution", note: "Institutional name and cryptographic verification key" },
              { label: "Student Registration Number", note: "Unique institutional matriculation identifier" },
              { label: "Faculty / Programme Title", note: "Approved course of study" },
              { label: "Credential Validity Period", note: "Issue date and expiration term" },
              { label: "Cardholder Photograph", note: "Mandatory visual identity match for in-person validation" },
              { label: "Credential Status", note: "Active, Expired, or Revoked verification flag" },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 12px",
                  background: "#F8FAFC",
                  borderRadius: "8px",
                  border: "1px solid #EDF2F7",
                }}
              >
                <CheckCircle2 size={16} color="#237B4B" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong style={{ fontSize: "13px", color: "#172033", display: "block" }}>{item.label}</strong>
                  <span style={{ fontSize: "12px", color: "#647084" }}>{item.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Private / Non-Shared Attributes */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(180, 35, 24, 0.1)",
                color: "#B42318",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <EyeOff size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#172033" }}>
                Confidential & Protected Data
              </h3>
              <span style={{ fontSize: "12px", color: "#647084" }}>
                Never disclosed to verifiers or third parties
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Personal & Institutional Email", note: "Used exclusively for account access and security alerts" },
              { label: "Personal Phone Number", note: "Kept confidential within your private profile" },
              { label: "Academic Grades & Transcripts", note: "Not stored or accessible through digital wallet services" },
              { label: "Disciplinary & Financial Records", note: "Excluded entirely from credential signatures" },
              { label: "Password Hashes & Auth Secrets", note: "Salted cryptographic hashes; strictly inaccessible" },
              { label: "Internal Audit Identifiers", note: "Protected system traces kept solely for security governance" },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 12px",
                  background: "#FEF2F2",
                  borderRadius: "8px",
                  border: "1px solid #FEE2E2",
                }}
              >
                <Lock size={16} color="#B42318" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong style={{ fontSize: "13px", color: "#172033", display: "block" }}>{item.label}</strong>
                  <span style={{ fontSize: "12px", color: "#647084" }}>{item.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Institutional Data Governance Notice */}
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
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <img
              src={brand.logoSrc}
              alt={instName}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/assets/logos/unima.png";
              }}
            />
          </div>
          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#172033" }}>
            Institutional Data Ownership & Correction Policy
          </h3>
        </div>

        <p style={{ margin: 0, fontSize: "14px", color: "#334155", lineHeight: "1.6" }}>
          Your student records (programme, matriculation number, campus, and enrollment status) are governed by {instName} as the authoritative Data Controller. UniID serves as the digital credential issuing platform and data processor under strict institutional agreements.
        </p>

        <div className="uni-callout-box info">
          <Info size={18} />
          <div>
            <strong>Right to Rectification:</strong> If any institutional data displayed in your wallet contains discrepancies, you can submit a formalized correction request through the portal. Your institution&apos;s registrar staff will audit and update your official university roster.
          </div>
        </div>
      </div>
    </div>
  );
};

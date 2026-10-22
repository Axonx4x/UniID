import React, { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  Building2,
  GraduationCap,
  FileEdit,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Info,
} from "lucide-react";
import { StudentDashboardResponse } from "@/types";
import { CorrectionRequestModal } from "./CorrectionRequestModal";
import { getUniversityBrand } from "@/config/universities";

interface StudentContextType {
  dashboard: StudentDashboardResponse | null;
  refreshDashboard: () => void;
  loading: boolean;
}

export const StudentInstitutionPage: React.FC = () => {
  const { dashboard, refreshDashboard, loading } = useOutletContext<StudentContextType>();
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetField, setTargetField] = useState("");
  const [currentVal, setCurrentVal] = useState("");
  const [copiedStudentNo, setCopiedStudentNo] = useState(false);

  if (loading && !dashboard) {
    return (
      <div className="uni-student-loading-state">
        <div className="uni-spinner-lg" />
        <p>Loading institutional records...</p>
      </div>
    );
  }

  const inst = dashboard?.institution;
  const brand = getUniversityBrand(inst?.slug || inst?.name);
  const institutionName = inst?.name || brand.name;
  const student = dashboard?.student;
  const verif = dashboard?.verification;

  const copyStudentNumber = () => {
    if (student?.student_number) {
      navigator.clipboard.writeText(student.student_number);
      setCopiedStudentNo(true);
      setTimeout(() => setCopiedStudentNo(false), 2000);
    }
  };

  const openCorrection = (field: string, val: string | null | undefined) => {
    setTargetField(field);
    setCurrentVal(val || "");
    setCorrectionModalOpen(true);
  };

  const isApiMode = verif?.verification_mode === "api_verification";

  return (
    <div className="uni-student-records-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Institutional Record & Affiliation</h1>
          <p className="uni-page-sub">
            Authoritative university enrollment records confirmed by {inst?.name || "your institution"}.
          </p>
        </div>
        <div className="uni-header-action-group">
          <button
            type="button"
            className="uni-btn-primary"
            onClick={() => openCorrection("general_record", "")}
          >
            <FileEdit size={16} />
            <span>Request Correction</span>
          </button>
        </div>
      </div>

      {/* Institution Hero Banner */}
      <div className="uni-card-preview-section">
        <div
          style={{
            background: "linear-gradient(135deg, #17264d 0%, #243b80 100%)",
            borderRadius: "16px",
            padding: "24px 28px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 16px rgba(23, 38, 77, 0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                padding: "4px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                flexShrink: 0,
              }}
            >
              <img
                src={brand.logoSrc}
                alt={institutionName}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/assets/logos/unima.png";
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.7)" }}>
                Authoritative Institution
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "2px 0 0 0" }}>{institutionName}</h2>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", marginTop: "4px" }}>
                Code: <strong>{inst?.institution_code}</strong> • Verification: <strong>{isApiMode ? "Live SIS Integration" : "Official Roster Review"}</strong>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="uni-status-pill success">
              <span className="uni-pulse-dot green" />
              <span>Affiliation Confirmed</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="uni-profile-grid">
        {/* Academic Enrollment Information */}
        <div className="uni-profile-section-card">
          <div className="uni-profile-section-header">
            <h2 className="uni-profile-section-title">
              <GraduationCap size={18} />
              <span>Academic Programme & Enrollment</span>
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div className="uni-readonly-row">
              <span className="uni-readonly-label">Student Registration Number</span>
              <div className="uni-readonly-val-wrap">
                <span className="uni-readonly-val" style={{ fontFamily: "monospace" }}>{student?.student_number || "—"}</span>
                {student?.student_number && (
                  <button type="button" className="uni-copy-icon-btn" onClick={copyStudentNumber} title="Copy">
                    {copiedStudentNo ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  </button>
                )}
                <button
                  type="button"
                  className="uni-btn-request-correction"
                  onClick={() => openCorrection("student_number", student?.student_number)}
                >
                  <FileEdit size={12} />
                  <span>Fix</span>
                </button>
              </div>
            </div>

            <div className="uni-readonly-row">
              <span className="uni-readonly-label">Programme / Degree</span>
              <div className="uni-readonly-val-wrap">
                <span className="uni-readonly-val">{student?.programme_name || "—"}</span>
                <button
                  type="button"
                  className="uni-btn-request-correction"
                  onClick={() => openCorrection("programme_name", student?.programme_name)}
                >
                  <FileEdit size={12} />
                  <span>Fix</span>
                </button>
              </div>
            </div>

            <div className="uni-readonly-row">
              <span className="uni-readonly-label">Programme Code</span>
              <div className="uni-readonly-val-wrap">
                <span className="uni-readonly-val" style={{ fontFamily: "monospace" }}>{student?.programme_code || "—"}</span>
              </div>
            </div>

            <div className="uni-readonly-row">
              <span className="uni-readonly-label">Campus Location</span>
              <div className="uni-readonly-val-wrap">
                <span className="uni-readonly-val">{student?.campus_name || "Main Campus"}</span>
                <button
                  type="button"
                  className="uni-btn-request-correction"
                  onClick={() => openCorrection("campus_name", student?.campus_name)}
                >
                  <FileEdit size={12} />
                  <span>Fix</span>
                </button>
              </div>
            </div>

            <div className="uni-readonly-row">
              <span className="uni-readonly-label">Year of Study</span>
              <div className="uni-readonly-val-wrap">
                <span className="uni-readonly-val">{student?.study_year ? `Year ${student.study_year}` : "—"}</span>
                <button
                  type="button"
                  className="uni-btn-request-correction"
                  onClick={() => openCorrection("study_year", student?.study_year?.toString())}
                >
                  <FileEdit size={12} />
                  <span>Fix</span>
                </button>
              </div>
            </div>

            <div className="uni-readonly-row">
              <span className="uni-readonly-label">Academic Session</span>
              <div className="uni-readonly-val-wrap">
                <span className="uni-readonly-val">{student?.academic_year || "Current Session"}</span>
              </div>
            </div>

            <div className="uni-readonly-row">
              <span className="uni-readonly-label">Enrollment Eligibility</span>
              <div className="uni-readonly-val-wrap">
                <span className="uni-status-pill success" style={{ padding: "3px 10px", fontSize: "12px" }}>
                  <ShieldCheck size={13} />
                  <span>{student?.enrollment_status ? student.enrollment_status.toUpperCase() : "ELIGIBLE"}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Institutional Authority & Registry Notice */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="uni-profile-section-card">
            <div className="uni-profile-section-header">
              <h2 className="uni-profile-section-title">
                <Info size={18} />
                <span>Registry Integrity Policy</span>
              </h2>
            </div>
            <p style={{ fontSize: "13px", lineHeight: "1.55", color: "var(--stu-text-muted)", margin: "0 0 14px 0" }}>
              To guarantee the legal authenticity of university qualifications, institutional identity fields are read-only and synchronized directly with the authoritative Student Information System (SIS) or university registry roster.
            </p>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid var(--stu-border)",
                borderRadius: "10px",
                padding: "14px",
                fontSize: "12.5px",
                color: "var(--stu-text-main)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldCheck size={15} color="#243b80" />
                <span>How to request record adjustments</span>
              </div>
              <p style={{ margin: 0, color: "var(--stu-text-muted)", lineHeight: "1.45" }}>
                If your legal name, programme of study, or registration number differs from official admissions letters, select <strong>Request Correction</strong> to submit supporting documentation to institutional staff.
              </p>
            </div>
          </div>

          <div className="uni-profile-section-card">
            <div className="uni-profile-section-header">
              <h2 className="uni-profile-section-title">
                <Building2 size={18} />
                <span>Verification & Administrative Routing</span>
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--stu-text-muted)" }}>Verification Method</span>
                <span style={{ fontWeight: "600" }}>{isApiMode ? "Live SIS API" : "Roster Review"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--stu-text-muted)" }}>Institution Slug</span>
                <span style={{ fontFamily: "monospace", fontWeight: "600" }}>{inst?.slug}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--stu-text-muted)" }}>Verification Case Ref</span>
                <span style={{ fontFamily: "monospace", fontWeight: "600" }}>{verif?.reference}</span>
              </div>
              <div style={{ marginTop: "10px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                <Link to="/student/verification" className="uni-notif-action-link">
                  <span>View full verification pipeline & decision audit</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CorrectionRequestModal
        isOpen={correctionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
        initialField={targetField}
        initialCurrentValue={currentVal}
        onSuccess={() => {
          refreshDashboard();
        }}
      />
    </div>
  );
};

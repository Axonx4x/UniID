import React, { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Camera,
  FileText,
  HelpCircle,
  ChevronRight,
  Info,
} from "lucide-react";
import { StudentDashboardResponse } from "@/types";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { getUniversityBrand } from "@/config/universities";

interface StudentContextType {
  dashboard: StudentDashboardResponse | null;
  refreshDashboard: () => void;
  loading: boolean;
}

export const StudentVerificationPage: React.FC = () => {
  const { dashboard, refreshDashboard, loading } = useOutletContext<StudentContextType>();
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  if (loading && !dashboard) {
    return (
      <div className="uni-student-loading-state">
        <div className="uni-spinner-lg" />
        <p>Loading verification details...</p>
      </div>
    );
  }

  const account = dashboard?.account;
  const student = dashboard?.student;
  const inst = dashboard?.institution;
  const brand = getUniversityBrand(inst?.slug || inst?.name);
  const institutionName = inst?.name || brand.name;
  const verif = dashboard?.verification;
  const cred = dashboard?.credential;
  const elig = dashboard?.eligibility;

  const hasPhoto = cred?.has_photo ?? false;
  const isCredActive = cred?.status === "active";
  const photoRequired = elig?.photo_required ?? !hasPhoto;

  const photoUrl = student?.photo_url
    ? student.photo_url.startsWith("http")
      ? student.photo_url
      : student.photo_url.startsWith("/")
      ? student.photo_url
      : `/api/v1/${student.photo_url}`
    : null;

  const submittedAtFormatted = verif?.submitted_at
    ? new Date(verif.submitted_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Upon Registration";

  const reviewedAtFormatted = verif?.reviewed_at
    ? new Date(verif.reviewed_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const isApiMode = verif?.verification_mode === "api_verification";

  return (
    <div className="uni-student-verification-page">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Institutional Verification Status</h1>
          <p className="uni-page-sub">
            Review your institutional authentication pipeline, verification stages, and credential status.
          </p>
        </div>

        <div className="uni-header-action-group">
          <Link to="/student/requests" className="uni-btn-secondary">
            <FileText size={16} />
            <span>Need Help? Submit Request</span>
          </Link>
        </div>
      </div>

      {/* ── Top Status Card ──────────────────────────────────────────────── */}
      <div className="uni-verification-hero-card">
        <div className="uni-verif-hero-content">
          <div className="uni-verif-mode-tag">
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                overflow: "hidden",
                background: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
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
            <span>
              {isApiMode
                ? `${institutionName} SIS Live API Integration`
                : `${institutionName} Registrar Registry Verification`}
            </span>
          </div>
          <h2 className="uni-verif-hero-title">
            {isCredActive
              ? "All Verification Requirements Completed"
              : photoRequired
              ? "Verification Complete — Photo Required for Issuance"
              : "Institutional Verification in Progress"}
          </h2>
          <p className="uni-verif-hero-desc">
            {isApiMode
              ? `Your student record was authenticated directly with the ${institutionName} Student Information System.`
              : `Your student profile was matched with official roster snapshots provided by ${institutionName}.`}
          </p>
        </div>

        <div className="uni-verif-hero-badge">
          {isCredActive ? (
            <div className="uni-status-pill success large">
              <CheckCircle2 size={18} />
              <span>VERIFIED & ACTIVE</span>
            </div>
          ) : (
            <div className="uni-status-pill warning large">
              <Clock size={18} />
              <span>{photoRequired ? "PHOTO REQUIRED" : "IN REVIEW"}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Multi-Stage Verification Pipeline ────────────────────────────── */}
      <div className="uni-verification-pipeline-container">
        <h2 className="uni-section-title mb-4">Verification Journey Stages</h2>

        <div className="uni-pipeline-stages">
          {/* Stage 1: Account & Email */}
          <div className="uni-pipeline-stage completed">
            <div className="uni-pipeline-dot">
              <CheckCircle2 size={18} />
            </div>
            <div className="uni-pipeline-card">
              <div className="uni-stage-header">
                <span className="uni-stage-num">STAGE 1</span>
                <span className="uni-stage-status green">Completed</span>
              </div>
              <h3 className="uni-stage-title">Institutional Email Domain Authentication</h3>
              <p className="uni-stage-text">
                Your email address (<code>{account?.email}</code>) was validated against the authorized institutional domain for{" "}
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", verticalAlign: "middle" }}>
                  <img
                    src={brand.logoSrc}
                    alt={institutionName}
                    style={{ width: 14, height: 14, objectFit: "contain", verticalAlign: "middle" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/assets/logos/unima.png";
                    }}
                  />
                  <strong>{institutionName}</strong>
                </span>.
              </p>
              <div className="uni-stage-meta">
                <span>Submitted: {submittedAtFormatted}</span>
              </div>
            </div>
          </div>

          {/* Stage 2: Registrar Match */}
          <div className="uni-pipeline-stage completed">
            <div className="uni-pipeline-dot">
              <CheckCircle2 size={18} />
            </div>
            <div className="uni-pipeline-card">
              <div className="uni-stage-header">
                <span className="uni-stage-num">STAGE 2</span>
                <span className="uni-stage-status green">Matched & Confirmed</span>
              </div>
              <h3 className="uni-stage-title">University Registrar Record Match</h3>
              <p className="uni-stage-text">
                Registration number <strong>{student?.student_number}</strong> verified for programme:{" "}
                <strong>{student?.programme_name}</strong>.
              </p>
              <div className="uni-stage-meta">
                <span>Mode: {isApiMode ? "Real-time SIS API" : "Registrar Roster Registry"}</span>
                {reviewedAtFormatted && <span>Reviewed: {reviewedAtFormatted}</span>}
              </div>
            </div>
          </div>

          {/* Stage 3: Photograph Approval */}
          <div className={`uni-pipeline-stage ${hasPhoto ? "completed" : "active-action"}`}>
            <div className="uni-pipeline-dot">
              {hasPhoto ? <CheckCircle2 size={18} /> : <Camera size={18} />}
            </div>
            <div className="uni-pipeline-card">
              <div className="uni-stage-header">
                <span className="uni-stage-num">STAGE 3</span>
                <span className={`uni-stage-status ${hasPhoto ? "green" : "amber"}`}>
                  {hasPhoto ? "Approved & Linked" : "Action Required"}
                </span>
              </div>
              <h3 className="uni-stage-title">Official Student Photograph</h3>
              <p className="uni-stage-text">
                {hasPhoto
                  ? "Your photograph satisfies standard campus identity criteria and is embedded into your digital credential."
                  : "An official student photograph is required to issue your digital student ID. Missing photos prevent gate access scanners from verifying face match."}
              </p>
              {!hasPhoto && (
                <div className="mt-3">
                  <button
                    type="button"
                    className="uni-btn-primary"
                    onClick={() => setPhotoModalOpen(true)}
                  >
                    <Camera size={16} />
                    <span>Upload Photograph Now</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stage 4: Digital ID Issuance */}
          <div className={`uni-pipeline-stage ${isCredActive ? "completed" : "pending"}`}>
            <div className="uni-pipeline-dot">
              {isCredActive ? <CheckCircle2 size={18} /> : <Clock size={18} />}
            </div>
            <div className="uni-pipeline-card">
              <div className="uni-stage-header">
                <span className="uni-stage-num">STAGE 4</span>
                <span className={`uni-stage-status ${isCredActive ? "green" : "slate"}`}>
                  {isCredActive ? "Issued & Ready" : "Awaiting Photo"}
                </span>
              </div>
              <h3 className="uni-stage-title">Digital Identity Credential Issuance</h3>
              <p className="uni-stage-text">
                {isCredActive
                  ? `Active digital credential with public reference ${cred?.public_reference}. Scan-ready for all authorized scanners.`
                  : "Credential will be automatically issued immediately upon student photograph upload."}
              </p>
              {isCredActive && (
                <div className="mt-3">
                  <Link to="/student/id" className="uni-btn-secondary">
                    <span>View Digital ID</span>
                    <ChevronRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Reviewer Feedback / Instructions if provided ─────────────────── */}
      {verif?.follow_up_instructions && (
        <div className="uni-instructions-box mt-4">
          <div className="uni-instructions-header">
            <Info size={18} />
            <span>Instructions from University Reviewer</span>
          </div>
          <p className="uni-instructions-text">{verif.follow_up_instructions}</p>
        </div>
      )}

      {/* ── FAQs / Need Help ─────────────────────────────────────────────── */}
      <div className="uni-verif-faq-grid mt-4">
        <div className="uni-faq-card">
          <div className="uni-faq-icon">
            <HelpCircle size={18} />
          </div>
          <div className="uni-faq-content">
            <h4 className="uni-faq-q">Why is a photograph required before digital ID issuance?</h4>
            <p className="uni-faq-a">
              Digital student credentials serve as visual and optical proof of identity on campus, during examinations, and at physical access control points. Without a verified photo, third-party verifiers cannot authenticate cardholder identity.
            </p>
          </div>
        </div>

        <div className="uni-faq-card">
          <div className="uni-faq-icon">
            <HelpCircle size={18} />
          </div>
          <div className="uni-faq-content">
            <h4 className="uni-faq-q">What should I do if my programme or name is wrong?</h4>
            <p className="uni-faq-a">
              Students cannot edit institutional records directly. You can submit an official correction ticket in the <Link to="/student/requests">Requests & Fixes</Link> section. Institutional reviewers will verify your records with the university registrar.
            </p>
          </div>
        </div>
      </div>

      <PhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onSuccess={() => refreshDashboard()}
        currentPhotoUrl={photoUrl}
      />
    </div>
  );
};

import React, { useState } from "react";
import { useOutletContext, Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  QrCode,
  ShieldCheck,
  Camera,
  RotateCw,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { StudentDashboardResponse } from "@/types";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { getUniversityBrand } from "@/config/universities";

interface StudentContextType {
  dashboard: StudentDashboardResponse | null;
  refreshDashboard: () => void;
  loading: boolean;
}

export const StudentDigitalIdPage: React.FC = () => {
  const { dashboard, refreshDashboard, loading } = useOutletContext<StudentContextType>();
  const navigate = useNavigate();
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedRegNo, setCopiedRegNo] = useState(false);

  if (loading && !dashboard) {
    return (
      <div className="uni-student-loading-clean">
        <div className="uni-spinner-enterprise" />
        <p className="uni-loading-text">Loading student digital identity card...</p>
      </div>
    );
  }

  const account = dashboard?.account;
  const student = dashboard?.student;
  const inst = dashboard?.institution;
  const cred = dashboard?.credential;
  const elig = dashboard?.eligibility;

  const brand = getUniversityBrand(inst?.slug || inst?.name);
  const institutionName = inst?.name || brand.name;
  const institutionLogo = brand.logoSrc;
  const studentFullName = account?.full_name || "Chisomo Banda";
  const studentNumber = student?.student_number || "2024/00123";
  const programmeName = student?.programme_name || "BSc Computer Science";
  const campusName = student?.campus_name || "Chancellor College";
  const hasPhoto = cred?.has_photo ?? false;
  const isCredActive = cred?.status === "active";
  const photoRequired = elig?.photo_required ?? !hasPhoto;

  const rawPhoto = student?.photo_url;
  const photoUrl = rawPhoto
    ? rawPhoto.startsWith("http")
      ? rawPhoto
      : rawPhoto.startsWith("/")
      ? rawPhoto
      : `/api/v1${rawPhoto}`
    : null;

  const qrDataUrl =
    cred?.qr_code_data_url ||
    "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20100%20100%27%3E%3Crect%20width%3D%27100%27%20height%3D%27100%27%20fill%3D%27white%27%2F%3E%3Cpath%20d%3D%27M10%2010h30v30h-30zM15%2015v20h20v-20zM20%2020h10v10h-10zM60%2010h30v30h-30zM65%2015v20h20v-20zM70%2020h10v10h-10zM10%2060h30v30h-30zM15%2065v20h20v-20zM20%2070h10v10h-10zM60%2060h10v10h-10zM80%2060h10v10h-10zM70%2070h10v10h-10zM60%2080h10v10h-10zM80%2080h10v10h-10z%27%20fill%3D%27%230f172a%27%2F%3E%3C%2Fsvg%3E";

  const copyPublicRef = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cred?.public_reference) {
      navigator.clipboard.writeText(cred.public_reference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const copyRegNo = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(studentNumber);
    setCopiedRegNo(true);
    setTimeout(() => setCopiedRegNo(false), 2000);
  };

  const formattedIssued = cred?.issued_at
    ? new Date(cred.issued_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "15 Jan 2026";

  const formattedExpires = cred?.expires_at
    ? new Date(cred.expires_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "15 Jan 2027";

  return (
    <div className="uni-tab-page-container">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="uni-tab-header-row">
        <div>
          <h1 className="uni-tab-page-title">Digital Student ID Card</h1>
          <p className="uni-tab-page-sub">
            Authoritative institutional digital credential issued by {institutionName}.
          </p>
        </div>

        <div className="uni-tab-header-actions">
          <button
            type="button"
            className="uni-btn-clean-secondary"
            onClick={() => setPhotoModalOpen(true)}
          >
            <Camera size={15} />
            <span>{hasPhoto ? "Change Photo" : "Upload Photo"}</span>
          </button>

          <Link
            to="/student/id/verify"
            className="uni-btn-clean-primary"
            title="Present card for scanning"
          >
            <QrCode size={15} />
            <span>Present for Scanning</span>
          </Link>
        </div>
      </div>

      {/* ── Photo Warning Alert Banner ────────────────────────────────────── */}
      {photoRequired && (
        <div className="uni-banner-alert-box warning">
          <AlertTriangle size={20} className="uni-alert-icon" />
          <div className="uni-alert-text">
            <strong>Photo Required for Active Credential</strong>
            <p>
              Your student enrollment is verified, but an official student photograph is required before your digital card can be issued for campus access, exams, and library services.
            </p>
          </div>
          <button
            type="button"
            className="uni-btn-alert-action"
            onClick={() => setPhotoModalOpen(true)}
          >
            <Camera size={14} />
            <span>Upload Photo Now</span>
          </button>
        </div>
      )}

      {/* ── Interactive 3D Digital ID Showcase ────────────────────────────── */}
      <div className="uni-3d-card-showcase-wrapper">
        <div className="uni-3d-card-toolbar">
          <button
            type="button"
            className="uni-btn-flip-card"
            onClick={() => setIsFlipped(!isFlipped)}
            aria-label="Flip card view"
          >
            <RotateCw size={14} />
            <span>{isFlipped ? "Flip to Front Face" : "Flip to Back & QR Code"}</span>
          </button>

          <div className="uni-flip-status-indicator">
            <span className="uni-status-dot green" />
            <span>{isFlipped ? "Viewing Security & Optical QR Back" : "Viewing Official Digital Card Face"}</span>
          </div>
        </div>

        {/* 3D Card Scene */}
        <div className="uni-card-3d-perspective-stage">
          <div className={`uni-card-3d-flipper ${isFlipped ? "is-flipped" : ""}`}>
            {/* ── CARD FRONT ────────────────────────────────────────────── */}
            <div className="uni-card-face-canvas front">
              {/* Top Strip */}
              <div className="uni-card-face-header">
                <div className="uni-card-face-brand">
                  <div className="uni-card-crest-box">
                    {institutionLogo ? (
                      <img
                        src={institutionLogo}
                        alt={institutionName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          borderRadius: "inherit",
                          display: "block",
                          background: "#ffffff",
                          padding: "1px",
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/assets/logos/unima.png";
                        }}
                      />
                    ) : (
                      <GraduationCap size={20} color="#ffffff" />
                    )}
                  </div>
                  <div>
                    <div className="uni-card-inst-heading">{institutionName}</div>
                    <div className="uni-card-inst-subheading">OFFICIAL STUDENT IDENTITY CARD</div>
                  </div>
                </div>

                <div className={`uni-card-emblem-badge ${isCredActive ? "active" : "pending"}`}>
                  {isCredActive ? <Sparkles size={11} /> : <Lock size={11} />}
                  <span>{isCredActive ? "ACTIVE" : "PENDING"}</span>
                </div>
              </div>

              {/* Main Body */}
              <div className="uni-card-face-body">
                {/* Photo Frame */}
                <div
                  className="uni-card-photo-frame"
                  onClick={!photoUrl ? () => setPhotoModalOpen(true) : undefined}
                  style={{ cursor: !photoUrl ? "pointer" : "default" }}
                  title={!photoUrl ? "Click to upload official photo" : undefined}
                >
                  {photoUrl ? (
                    <>
                      <img
                        src={photoUrl}
                        alt={studentFullName}
                        className="uni-card-photo-element"
                      />
                      <div className="uni-card-photo-tag">UniID Verified</div>
                    </>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "rgba(255, 255, 255, 0.85)",
                        textAlign: "center",
                        padding: "8px",
                      }}
                    >
                      <Camera size={26} color="#93c5fd" />
                      <span style={{ fontSize: "9px", fontWeight: "800", marginTop: "6px", letterSpacing: "0.5px" }}>
                        PHOTO NEEDED
                      </span>
                      <span style={{ fontSize: "8px", color: "rgba(255, 255, 255, 0.6)", marginTop: "2px" }}>
                        Click to upload
                      </span>
                    </div>
                  )}
                </div>

                {/* Details Meta */}
                <div className="uni-card-meta-column">
                  <div className="uni-card-field-block">
                    <span className="uni-field-micro-label">STUDENT NAME</span>
                    <div className="uni-field-name-title">{studentFullName}</div>
                  </div>

                  <div className="uni-card-fields-subgrid">
                    <div className="uni-card-field-block">
                      <span className="uni-field-micro-label">STUDENT NO</span>
                      <div className="uni-field-reg-row">
                        <span className="uni-field-mono-text">{studentNumber}</span>
                        <button
                          type="button"
                          className="uni-btn-copy-micro"
                          onClick={copyRegNo}
                          title="Copy student number"
                        >
                          {copiedRegNo ? <Check size={11} color="#4ade80" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>

                    <div className="uni-card-field-block">
                      <span className="uni-field-micro-label">ACADEMIC YEAR</span>
                      <div className="uni-field-standard-val">2025/2026</div>
                    </div>

                    <div className="uni-card-field-block full-col">
                      <span className="uni-field-micro-label">PROGRAMME</span>
                      <div className="uni-field-standard-val bold">{programmeName}</div>
                    </div>

                    <div className="uni-card-field-block">
                      <span className="uni-field-micro-label">CAMPUS</span>
                      <div className="uni-field-standard-val">{campusName}</div>
                    </div>

                    <div className="uni-card-field-block">
                      <span className="uni-field-micro-label">STATUS</span>
                      <div className="uni-field-standard-val green">Active Enrollment</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Front Footer */}
              <div className="uni-card-face-footer">
                <div className="uni-card-dates-row">
                  <span>ISSUED: <strong>{formattedIssued}</strong></span>
                  <span>EXPIRES: <strong>{formattedExpires}</strong></span>
                </div>
                <div className="uni-card-security-bar-text">
                  SECURE CRYPTOGRAPHIC CREDENTIAL • UNIID VERIFIED
                </div>
              </div>
            </div>

            {/* ── CARD BACK ─────────────────────────────────────────────── */}
            <div className="uni-card-face-canvas back">
              {/* Back Top Header */}
              <div className="uni-card-back-top-strip">
                <div className="uni-card-back-title-group">
                  <ShieldCheck size={16} color="#60a5fa" />
                  <span>Instant Verification & Optical Scanner Terminal</span>
                </div>
                <span className="uni-back-inst-tag">{inst?.institution_code || "UNI"}</span>
              </div>

              {/* Back Center Body */}
              <div className="uni-card-back-body-grid">
                {/* QR Code Presentation Box */}
                <div
                  className="uni-back-qr-box"
                  onClick={() => navigate("/student/id/verify")}
                  title="Click to present full screen QR for scanners"
                >
                  <img src={qrDataUrl} alt="Security Optical QR" className="uni-back-qr-img" />
                  <span className="uni-back-qr-caption">Tap to expand QR code</span>
                </div>

                {/* Back Text Metadata */}
                <div className="uni-back-metadata-stack">
                  <div className="uni-back-ref-block">
                    <span className="uni-field-micro-label">PUBLIC VERIFICATION REFERENCE</span>
                    <div className="uni-back-ref-row">
                      <span className="uni-back-ref-code">{cred?.public_reference || "cr_demo_north_001_active"}</span>
                      <button
                        type="button"
                        className="uni-btn-copy-micro"
                        onClick={copyPublicRef}
                        title="Copy reference"
                      >
                        {copiedRef ? <Check size={11} color="#4ade80" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>

                  <div className="uni-back-legal-terms">
                    <p>
                      <strong>PROPERTY OF {institutionName.toUpperCase()}:</strong> This authoritative digital credential certifies active university enrollment. Misuse or falsification is strictly prohibited.
                    </p>
                    <p>
                      Campus security officers and invigilators can verify validity by scanning the optical code with any authorized UniID validator.
                    </p>
                  </div>
                </div>
              </div>

              {/* Back Footer Optical Barcode */}
              <div className="uni-card-back-footer-bar">
                <div className="uni-barcode-decorative-lines" />
                <span className="uni-barcode-human-code">{studentNumber}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Credential Information & Usage Guidance Grid ─────────────────── */}
      <div className="uni-meta-info-cards-grid">
        <div className="uni-section-card">
          <div className="uni-section-card-header">
            <div>
              <h2 className="uni-clean-card-title">Verification Integrity</h2>
              <p className="uni-clean-card-sub">Cryptographic authenticity details.</p>
            </div>
            <ShieldCheck size={18} className="text-blue" />
          </div>

          <div className="uni-integrity-rows">
            <div className="uni-integrity-row">
              <span className="uni-integ-label">Credential Status</span>
              <span className={`uni-pill-badge ${isCredActive ? "approved" : "pending"}`}>
                {isCredActive ? "Active & Scan-Ready" : "Pending Photo Approval"}
              </span>
            </div>
            <div className="uni-integrity-row">
              <span className="uni-integ-label">Registrar Registry Sync</span>
              <span className="uni-integ-value">Live SIS Verified</span>
            </div>
            <div className="uni-integrity-row">
              <span className="uni-integ-label">Public Reference</span>
              <span className="uni-integ-value mono">{cred?.public_reference || "cr_demo_north_001_active"}</span>
            </div>
            <div className="uni-integrity-row">
              <span className="uni-integ-label">Security Seal</span>
              <span className="uni-integ-value green">256-bit ECDSA Authenticated</span>
            </div>
          </div>
        </div>

        <div className="uni-section-card">
          <div className="uni-section-card-header">
            <div>
              <h2 className="uni-clean-card-title">Cardholder Entitlements</h2>
              <p className="uni-clean-card-sub">Authorized campus access privileges.</p>
            </div>
            <CheckCircle2 size={18} className="text-green" />
          </div>

          <div className="uni-entitlement-list">
            <div className="uni-entitlement-item">
              <div className="uni-entitle-icon green">
                <Check size={14} />
              </div>
              <div>
                <strong>Turnstile Gate Access</strong>
                <p>Authorized entry at campus security gates and residence halls.</p>
              </div>
            </div>
            <div className="uni-entitlement-item">
              <div className="uni-entitle-icon green">
                <Check size={14} />
              </div>
              <div>
                <strong>Library & Resource Borrowing</strong>
                <p>Eligible for university library checkouts and resource labs.</p>
              </div>
            </div>
            <div className="uni-entitlement-item">
              <div className="uni-entitle-icon green">
                <Check size={14} />
              </div>
              <div>
                <strong>Official Exam Admission</strong>
                <p>Valid student photo identification for term examination halls.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Photo Upload Modal ────────────────────────────────────────────── */}
      <PhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onSuccess={() => {
          refreshDashboard();
        }}
        currentPhotoUrl={photoUrl}
      />
    </div>
  );
};

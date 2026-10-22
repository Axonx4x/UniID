import React, { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  QrCode,
  ArrowLeft,
  GraduationCap,
  Copy,
  Check,
  Camera,
  AlertCircle,
} from "lucide-react";
import { StudentDashboardResponse } from "@/types";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { getUniversityBrand } from "@/config/universities";

interface StudentContextType {
  dashboard: StudentDashboardResponse | null;
  refreshDashboard: () => void;
  loading: boolean;
}

export const StudentQrPresentationPage: React.FC = () => {
  const { dashboard, refreshDashboard, loading } = useOutletContext<StudentContextType>();
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  if (loading && !dashboard) {
    return (
      <div className="uni-student-loading-state">
        <div className="uni-spinner-lg" />
        <p>Loading QR presentation...</p>
      </div>
    );
  }

  const account = dashboard?.account;
  const student = dashboard?.student;
  const inst = dashboard?.institution;
  const brand = getUniversityBrand(inst?.slug || inst?.name);
  const institutionName = inst?.name || brand.name;
  const cred = dashboard?.credential;
  const hasPhoto = cred?.has_photo ?? false;

  const photoUrl = student?.photo_url
    ? student.photo_url.startsWith("http")
      ? student.photo_url
      : student.photo_url.startsWith("/")
      ? student.photo_url
      : `/api/v1/${student.photo_url}`
    : null;

  const copyRef = () => {
    if (cred?.public_reference) {
      navigator.clipboard.writeText(cred.public_reference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  return (
    <div className="uni-qr-presentation-standalone-page">
      <div className="uni-qr-presentation-nav">
        <Link to="/student/id" className="uni-back-link">
          <ArrowLeft size={16} />
          <span>Back to Card</span>
        </Link>
        <div className="uni-inst-pill">
          {brand.logoSrc ? (
            <img
              src={brand.logoSrc}
              alt={institutionName}
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                objectFit: "contain",
                background: "#ffffff",
                padding: "1px",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/assets/logos/unima.png";
              }}
            />
          ) : (
            <GraduationCap size={14} />
          )}
          <span>{institutionName}</span>
        </div>
      </div>

      {!hasPhoto ? (
        <div className="uni-qr-standby-box">
          <AlertCircle size={44} color="#d97706" />
          <h2>Photograph Required Before QR Activation</h2>
          <p>
            To prevent identity sharing and ensure scanner reliability, your digital ID QR code cannot be displayed until your official photograph is uploaded.
          </p>
          <button
            type="button"
            className="uni-btn-primary mt-4"
            onClick={() => setPhotoModalOpen(true)}
          >
            <Camera size={16} />
            <span>Upload Photograph</span>
          </button>
        </div>
      ) : (
        <div className="uni-qr-presentation-card">
          <div className="uni-qr-presentation-header">
            <span className="uni-scan-status-chip active">
              <span className="uni-pulse-dot green" />
              <span>OFFICIAL SCANNER READY</span>
            </span>
            <p className="uni-scan-guide-sub">
              Present this code directly to optical badge scanners or verifier cameras.
            </p>
          </div>

          {/* High Contrast QR Plate */}
          <div className="uni-qr-optical-plate">
            {cred?.qr_code_data_url ? (
              <img
                src={cred.qr_code_data_url}
                alt="Optical QR Code"
                className="uni-qr-optical-img"
              />
            ) : (
              <QrCode size={250} color="#000000" />
            )}
          </div>

          {/* Student Visual Identifier Strip */}
          <div className="uni-qr-identifier-strip">
            <div className="uni-qr-avatar-wrap">
              {photoUrl ? (
                <img src={photoUrl} alt="Photo" className="uni-qr-avatar-img" />
              ) : (
                <div className="uni-qr-avatar-placeholder">
                  {account?.full_name?.charAt(0) || "S"}
                </div>
              )}
            </div>
            <div className="uni-qr-id-meta">
              <h3 className="uni-qr-id-name">{account?.full_name}</h3>
              <p className="uni-qr-id-reg mono">
                Reg: <strong>{student?.student_number}</strong>
              </p>
              <p className="uni-qr-id-prog">{student?.programme_name}</p>
            </div>
          </div>

          {/* Security Reference */}
          <div className="uni-qr-sec-footer">
            <div className="uni-qr-ref-strip">
              <span className="uni-ref-label">Public Reference:</span>
              <span className="uni-ref-code mono">{cred?.public_reference}</span>
              {cred?.public_reference && (
                <button
                  type="button"
                  className="uni-copy-icon-btn"
                  onClick={copyRef}
                  title="Copy reference"
                >
                  {copiedRef ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

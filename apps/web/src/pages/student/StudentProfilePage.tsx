import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  User,
  Building2,
  Lock,
  Camera,
  FileEdit,
  Save,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { StudentDashboardResponse } from "@/types";
import { apiClient, ApiError } from "@/services/apiClient";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { CorrectionRequestModal } from "./CorrectionRequestModal";
import { getUniversityBrand } from "@/config/universities";

interface StudentContextType {
  dashboard: StudentDashboardResponse | null;
  refreshDashboard: () => void;
  loading: boolean;
}

export const StudentProfilePage: React.FC = () => {
  const { dashboard, refreshDashboard, loading } = useOutletContext<StudentContextType>();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionTargetField, setCorrectionTargetField] = useState("");
  const [correctionCurrentVal, setCorrectionCurrentVal] = useState("");

  useEffect(() => {
    if (dashboard) {
      setFullName(dashboard.account.full_name || "");
      setPhoneNumber(dashboard.student.phone_number || "");
    }
  }, [dashboard]);

  if (loading && !dashboard) {
    return (
      <div className="uni-student-loading-state">
        <div className="uni-spinner-lg" />
        <p>Loading profile information...</p>
      </div>
    );
  }

  const account = dashboard?.account;
  const student = dashboard?.student;
  const inst = dashboard?.institution;
  const brand = getUniversityBrand(inst?.slug || inst?.name);
  const institutionName = inst?.name || brand.name;
  const cred = dashboard?.credential;

  const photoUrl = student?.photo_url
    ? student.photo_url.startsWith("http")
      ? student.photo_url
      : student.photo_url.startsWith("/")
      ? student.photo_url
      : `/api/v1/${student.photo_url}`
    : null;

  const handlePersonalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await apiClient.updateStudentProfile({
        full_name: fullName.trim() || undefined,
        phone_number: phoneNumber.trim() || undefined,
      });
      setSaveSuccess(true);
      refreshDashboard();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update profile.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const openCorrectionForField = (field: string, currentVal?: string | null) => {
    setCorrectionTargetField(field);
    setCorrectionCurrentVal(currentVal || "");
    setCorrectionModalOpen(true);
  };

  return (
    <div className="uni-student-profile-page">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Student Profile & Records</h1>
          <p className="uni-page-sub">
            Manage your personal preferences and inspect your official institutional registry records.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="uni-alert success mb-4" role="alert">
          <CheckCircle2 size={16} />
          <span>Personal information updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="uni-alert error mb-4" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="uni-profile-grid">
        {/* ── SECTION 1: Personal Editable Details ───────────────────────── */}
        <div className="uni-profile-card">
          <div className="uni-profile-card-header">
            <div className="uni-card-header-icon">
              <User size={18} />
            </div>
            <div>
              <h2 className="uni-card-title">Personal Information</h2>
              <p className="uni-card-sub">Self-managed contact details and identity photo.</p>
            </div>
          </div>

          <div className="uni-profile-card-body">
            {/* Photo Avatar Row */}
            <div className="uni-profile-avatar-row">
              <div className="uni-profile-avatar-box">
                {photoUrl ? (
                  <img src={photoUrl} alt="Student avatar" className="uni-profile-avatar-img" />
                ) : (
                  <div className="uni-profile-avatar-empty">
                    <User size={36} />
                  </div>
                )}
              </div>
              <div className="uni-avatar-meta">
                <div className="uni-avatar-title">Student Identification Photo</div>
                <div className="uni-avatar-desc">
                  {cred?.has_photo
                    ? "Verified photo linked to your Digital Student ID."
                    : "Photograph missing. Upload is required to activate your digital card."}
                </div>
                <button
                  type="button"
                  className="uni-btn-sm-secondary mt-2"
                  onClick={() => setPhotoModalOpen(true)}
                >
                  <Camera size={14} />
                  <span>{cred?.has_photo ? "Change Photo" : "Upload Photo"}</span>
                </button>
              </div>
            </div>

            {/* Editable Form */}
            <form onSubmit={handlePersonalSave} className="mt-4">
              <div className="uni-form-group mb-3">
                <label htmlFor="student-full-name" className="uni-label">
                  Full Name / Preferred Display Name
                </label>
                <input
                  id="student-full-name"
                  type="text"
                  className="uni-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="uni-form-group mb-3">
                <label htmlFor="student-email" className="uni-label">
                  Institutional Email Address
                </label>
                <div className="uni-input-with-icon">
                  <Mail size={16} className="uni-input-icon" />
                  <input
                    id="student-email"
                    type="email"
                    className="uni-input readonly"
                    value={account?.email || ""}
                    disabled
                    title="Institutional email cannot be edited directly."
                  />
                </div>
                <span className="uni-field-hint">
                  Email verification active • Used for single sign-on and notifications.
                </span>
              </div>

              <div className="uni-form-group mb-4">
                <label htmlFor="student-phone" className="uni-label">
                  Mobile Phone Number
                </label>
                <div className="uni-input-with-icon">
                  <Phone size={16} className="uni-input-icon" />
                  <input
                    id="student-phone"
                    type="tel"
                    className="uni-input"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +265 888 123 456"
                  />
                </div>
                <span className="uni-field-hint">
                  Used for urgent campus alerts and identity verification OTPs.
                </span>
              </div>

              <div className="uni-form-actions">
                <button
                  type="submit"
                  className="uni-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Personal Info</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── SECTION 2: Official Institutional Records (Locked) ─────────── */}
        <div className="uni-profile-card">
          <div className="uni-profile-card-header">
            <div className="uni-card-header-icon warning">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="uni-card-title">Official Institutional Records</h2>
              <p className="uni-card-sub">Authoritative data synchronized from university registrar.</p>
            </div>
          </div>

          <div className="uni-profile-card-body">
            {/* Notice banner */}
            <div className="uni-locked-records-banner">
              <Lock size={18} color="#d97706" />
              <div>
                <strong>Authoritative & Locked Record</strong>
                <p>
                  To prevent unauthorized modification of academic credentials, these fields cannot be edited directly. If any record is incorrect, click <em>Request Correction</em> to submit a formal ticket to institutional reviewers.
                </p>
              </div>
            </div>

            <div className="uni-locked-fields-list">
              {/* Registration Number */}
              <div className="uni-locked-field-row">
                <div className="uni-locked-field-info">
                  <span className="uni-locked-label">Registration Number</span>
                  <span className="uni-locked-value mono">
                    {student?.student_number || "REG-PENDING"}
                  </span>
                </div>
                <button
                  type="button"
                  className="uni-btn-sm-correction"
                  onClick={() => openCorrectionForField("student_number", student?.student_number)}
                  title="Request change to Registration Number"
                >
                  <FileEdit size={13} />
                  <span>Request Correction</span>
                </button>
              </div>

              {/* Institution */}
              <div className="uni-locked-field-row">
                <div className="uni-locked-field-info">
                  <span className="uni-locked-label">Institution</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        overflow: "hidden",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        display: "flex",
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
                    <span className="uni-locked-value" style={{ margin: 0 }}>
                      {institutionName} ({inst?.institution_code || brand.code})
                    </span>
                  </div>
                </div>
                <span className="uni-locked-badge">
                  <Lock size={12} />
                  <span>Registrar Locked</span>
                </span>
              </div>

              {/* Campus */}
              <div className="uni-locked-field-row">
                <div className="uni-locked-field-info">
                  <span className="uni-locked-label">Campus</span>
                  <span className="uni-locked-value">
                    {student?.campus_name || "Main Campus"} {student?.campus_code ? `(${student.campus_code})` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="uni-btn-sm-correction"
                  onClick={() => openCorrectionForField("campus_name", student?.campus_name)}
                  title="Request change to Campus"
                >
                  <FileEdit size={13} />
                  <span>Request Correction</span>
                </button>
              </div>

              {/* Academic Programme */}
              <div className="uni-locked-field-row">
                <div className="uni-locked-field-info">
                  <span className="uni-locked-label">Academic Programme / Degree</span>
                  <span className="uni-locked-value">
                    {student?.programme_name || "Academic Programme"} {student?.programme_code ? `(${student.programme_code})` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="uni-btn-sm-correction"
                  onClick={() => openCorrectionForField("programme_name", student?.programme_name)}
                  title="Request change to Academic Programme"
                >
                  <FileEdit size={13} />
                  <span>Request Correction</span>
                </button>
              </div>

              {/* Study Year & Academic Year */}
              <div className="uni-locked-field-row">
                <div className="uni-locked-field-info">
                  <span className="uni-locked-label">Year of Study & Session</span>
                  <span className="uni-locked-value">
                    {student?.study_year ? `Year ${student.study_year}` : "Standard"} • {student?.academic_year || "Current Year"}
                  </span>
                </div>
                <button
                  type="button"
                  className="uni-btn-sm-correction"
                  onClick={() => openCorrectionForField("study_year", student?.study_year ? String(student.study_year) : "")}
                  title="Request change to Study Year"
                >
                  <FileEdit size={13} />
                  <span>Request Correction</span>
                </button>
              </div>

              {/* Enrollment Status */}
              <div className="uni-locked-field-row">
                <div className="uni-locked-field-info">
                  <span className="uni-locked-label">Enrollment Status</span>
                  <span className="uni-badge-pill green">
                    {student?.enrollment_status ? student.enrollment_status.toUpperCase() : "ACTIVE"}
                  </span>
                </div>
                <button
                  type="button"
                  className="uni-btn-sm-correction"
                  onClick={() => openCorrectionForField("enrollment_status", student?.enrollment_status)}
                  title="Request status update"
                >
                  <FileEdit size={13} />
                  <span>Request Correction</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onSuccess={() => refreshDashboard()}
        currentPhotoUrl={photoUrl}
      />

      <CorrectionRequestModal
        isOpen={correctionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
        onSuccess={() => {
          refreshDashboard();
          navigate("/student/requests");
        }}
        initialField={correctionTargetField}
        initialCurrentValue={correctionCurrentVal}
      />
    </div>
  );
};

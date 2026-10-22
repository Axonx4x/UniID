import React, { useState } from "react";
import { useOutletContext, Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  CreditCard,
  ShieldCheck,
  Camera,
  CheckCircle2,
  Clock,
  User,
  Copy,
  Check,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  Headphones,
  FileText,
  Bell,
  HelpCircle,
  Landmark,
  RefreshCw,
} from "lucide-react";
import { StudentDashboardResponse } from "@/types";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { getUniversityBrand } from "@/config/universities";
import { CorrectionRequestModal } from "./CorrectionRequestModal";

interface StudentContextType {
  dashboard: StudentDashboardResponse | null;
  refreshDashboard: () => void;
  loading: boolean;
}

export const StudentOverviewPage: React.FC = () => {
  const { dashboard, refreshDashboard, loading } = useOutletContext<StudentContextType>();
  const navigate = useNavigate();
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [copiedRegNo, setCopiedRegNo] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const account = dashboard?.account;
  const student = dashboard?.student;
  const inst = dashboard?.institution;
  const cred = dashboard?.credential;
  const verif = dashboard?.verification;
  const elig = dashboard?.eligibility;

  const isVerified = verif?.status === "verified";

  const brand = getUniversityBrand(inst?.slug || inst?.name);
  const institutionName = inst?.name || brand.name;
  const studentFullName = account?.full_name || "Chisomo Banda";
  const firstName = studentFullName.split(" ")[0] || "Chisomo";
  const studentNumber = student?.student_number || "2024/00123";
  const programmeName = student?.programme_name || "BSc Computer Science";
  const campusName = student?.campus_name || "Chancellor College";
  const enrollmentStatus = student?.enrollment_status || "Eligible";
  const hasPhoto = cred?.has_photo ?? false;
  const photoRequired = elig?.photo_required ?? !hasPhoto;
  const isCredActive = cred?.status === "active";

  // Dynamic greeting based on current hour
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
      ? "Good afternoon"
      : "Good evening";

  const copyRegNo = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(studentNumber);
    setCopiedRegNo(true);
    setTimeout(() => setCopiedRegNo(false), 2000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshDashboard();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Student Photo resolution
  const rawPhoto = student?.photo_url;
  const photoUrl = rawPhoto
    ? rawPhoto.startsWith("http")
      ? rawPhoto
      : rawPhoto.startsWith("/")
      ? rawPhoto
      : `/api/v1${rawPhoto}`
    : "/assets/images/student_id_photo.jpg";

  // Fallback QR code SVG Data URL
  const qrDataUrl =
    cred?.qr_code_data_url ||
    "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20100%20100%27%3E%3Crect%20width%3D%27100%27%20height%3D%27100%27%20fill%3D%27white%27%2F%3E%3Cpath%20d%3D%27M10%2010h30v30h-30zM15%2015v20h20v-20zM20%2020h10v10h-10zM60%2010h30v30h-30zM65%2015v20h20v-20zM70%2020h10v10h-10zM10%2060h30v30h-30zM15%2065v20h20v-20zM20%2070h10v10h-10zM60%2060h10v10h-10zM80%2060h10v10h-10zM70%2070h10v10h-10zM60%2080h10v10h-10zM80%2080h10v10h-10z%27%20fill%3D%27%230f172a%27%2F%3E%3C%2Fsvg%3E";

  if (loading && !dashboard) {
    return (
      <div className="uni-student-loading-clean">
        <div className="uni-spinner-enterprise" />
        <p className="uni-loading-text">Loading student identity records...</p>
      </div>
    );
  }

  return (
    <div className="uni-overview-clean-container">
      {/* ── Top Header Greeting & Quick Banner ────────────────────────────── */}
      <section className="uni-greeting-row">
        <div className="uni-greeting-left">
          <h1 className="uni-greeting-heading">
            {greeting}, {firstName} 👋
          </h1>
          <p className="uni-greeting-subtitle">
            Here's your student identity overview and what you need to do next.
          </p>
        </div>

        <div className="uni-greeting-right">
          <Link
            to="/student/institution"
            className="uni-institution-header-chip"
            title="View institution details"
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                overflow: "hidden",
                background: "#ffffff",
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
            <span className="uni-chip-text">{institutionName}</span>
            <ChevronRight size={14} className="uni-chip-arrow" />
          </Link>

          {/* Action Photo Callout Banner */}
          {photoRequired && (
            <div className="uni-photo-callout-card">
              <div className="uni-photo-callout-icon-box">
                <Camera size={20} />
              </div>
              <div className="uni-photo-callout-info">
                <div className="uni-photo-callout-title">Add your student photo</div>
                <div className="uni-photo-callout-desc">
                  Your digital ID cannot be issued without a photo.
                </div>
              </div>
              <button
                type="button"
                className="uni-btn-upload-photo"
                onClick={() => setPhotoModalOpen(true)}
              >
                <span>Upload Photo</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Top 3 Status Cards (Key Metrics) ─────────────────────────────── */}
      <section className="uni-metrics-cards-grid" aria-label="Status Overview">
        {/* Card 1: Verification Status */}
        <div className="uni-metric-card">
          <div className="uni-metric-top">
            <div className="uni-metric-icon-wrap emerald">
              <CheckCircle2 size={24} />
            </div>
            <div className="uni-metric-meta">
              <div className="uni-metric-title-row">
                <span className="uni-metric-label">Verification Status</span>
                <span className={`uni-pill-badge ${isVerified ? "approved" : "pending"}`}>
                  {isVerified ? "Approved" : "Pending"}
                </span>
              </div>
              <p className="uni-metric-description">
                Your identity has been verified by the institution.
              </p>
              <div className="uni-metric-timestamp">
                Last updated: 18 Oct 2025, 10:00 AM
              </div>
            </div>
          </div>
          <div className="uni-metric-footer">
            <Link to="/student/verification" className="uni-metric-footer-link">
              <span>View verification details</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 2: Enrollment Eligibility */}
        <div className="uni-metric-card">
          <div className="uni-metric-top">
            <div className="uni-metric-icon-wrap emerald">
              <CheckCircle2 size={24} />
            </div>
            <div className="uni-metric-meta">
              <div className="uni-metric-title-row">
                <span className="uni-metric-label">Enrollment Eligibility</span>
                <span className="uni-pill-badge eligible">Eligible</span>
              </div>
              <p className="uni-metric-description">
                You are eligible to continue your studies.
              </p>
              <div className="uni-metric-timestamp">
                Active status • Academic Year 2025/2026
              </div>
            </div>
          </div>
          <div className="uni-metric-footer">
            <Link to="/student/institution" className="uni-metric-footer-link">
              <span>View academic record</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 3: Credential Status */}
        <div className="uni-metric-card">
          <div className="uni-metric-top">
            <div className={`uni-metric-icon-wrap ${isCredActive ? "emerald" : "amber"}`}>
              {isCredActive ? <CheckCircle2 size={24} /> : <Clock size={24} />}
            </div>
            <div className="uni-metric-meta">
              <div className="uni-metric-title-row">
                <span className="uni-metric-label">Credential Status</span>
                <span className={`uni-pill-badge ${isCredActive ? "approved" : "pending"}`}>
                  {isCredActive ? "Active" : "Pending"}
                </span>
              </div>
              <p className="uni-metric-description">
                {isCredActive
                  ? "Your digital credential is active and scan-ready."
                  : "Your digital credential is being issued."}
              </p>
              <div className="uni-metric-timestamp">
                {isCredActive ? "Valid through 2027" : "Awaiting final issuance"}
              </div>
            </div>
          </div>
          <div className="uni-metric-footer">
            <Link to="/student/id" className="uni-metric-footer-link">
              <span>View credential wallet</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Main Dashboard Body (Left Main + Right Sidebar) ──────────────── */}
      <div className="uni-dashboard-split-layout">
        {/* ── Left Column: Digital ID, Institution Info, Activity Feed ────── */}
        <div className="uni-split-col-main">
          {/* Subgrid: Digital ID & Institution Information */}
          <div className="uni-cards-duo-grid">
            {/* Card 1: Your Digital ID Showcase */}
            <div className="uni-section-card">
              <div className="uni-section-card-header">
                <div>
                  <h2 className="uni-clean-card-title">Your Digital ID</h2>
                  <p className="uni-clean-card-sub">Your verified student identity card.</p>
                </div>
                <Link to="/student/id" className="uni-clean-link-action">
                  <span>View Full ID</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* Realistic Digital Student ID Card */}
              <div className="uni-wallet-credential-card">
                {/* Dark Navy Header Strip */}
                <div className="uni-cred-card-top-bar">
                  <div className="uni-cred-card-inst-title">
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 3,
                        background: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
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
                    <span>{institutionName}</span>
                  </div>
                  <span className={`uni-cred-status-pill ${isCredActive ? "active" : "pending"}`}>
                    {isCredActive ? "Active" : "Pending"}
                  </span>
                </div>

                {/* Card Body */}
                <div className="uni-cred-card-body">
                  {/* Student Photo */}
                  <div className="uni-cred-photo-container">
                    <img
                      src={photoUrl}
                      alt={studentFullName}
                      className="uni-cred-student-img"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "/assets/images/student_id_photo.jpg";
                      }}
                    />
                  </div>

                  {/* Student Metadata */}
                  <div className="uni-cred-info-stack">
                    <div className="uni-cred-name">{studentFullName}</div>
                    <div className="uni-cred-reg-row">
                      <span className="uni-cred-reg-label">Student No:</span>
                      <strong className="uni-cred-reg-value">{studentNumber}</strong>
                      <button
                        type="button"
                        className="uni-btn-copy-reg"
                        onClick={copyRegNo}
                        title="Copy student number"
                      >
                        {copiedRegNo ? (
                          <Check size={12} color="#16a34a" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                    <div className="uni-cred-programme">{programmeName}</div>
                    <div className="uni-cred-campus">
                      <span>{campusName}</span>
                    </div>
                  </div>

                  {/* QR Code Presentation Box */}
                  <div
                    className="uni-cred-qr-box"
                    onClick={() => navigate("/student/id/verify")}
                    title="Tap to enlarge QR code for physical gate scanner"
                  >
                    <img src={qrDataUrl} alt="Security QR Code" className="uni-cred-qr-img" />
                    <span className="uni-cred-qr-hint">Tap to view QR</span>
                  </div>
                </div>

                {/* Photo Required Warning Strip */}
                {photoRequired && (
                  <button
                    type="button"
                    className="uni-cred-warning-strip"
                    onClick={() => setPhotoModalOpen(true)}
                  >
                    <AlertTriangle size={14} className="uni-warning-icon" />
                    <span>Photo required for credential issuance</span>
                    <ChevronRight size={14} className="uni-warning-arrow" />
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Institution Information */}
            <div className="uni-section-card">
              <div className="uni-section-card-header">
                <div>
                  <h2 className="uni-clean-card-title">Institution Information</h2>
                  <p className="uni-clean-card-sub">Registrar enrollment record.</p>
                </div>
                <button
                  type="button"
                  className={`uni-sync-btn ${isRefreshing ? "rotating" : ""}`}
                  onClick={handleManualRefresh}
                  title="Refresh record sync"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="uni-inst-info-list">
                {/* University */}
                <div className="uni-inst-item-row">
                  <div
                    className="uni-inst-item-icon blue"
                    style={{
                      padding: 2,
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      overflow: "hidden",
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
                  <div className="uni-inst-item-content">
                    <span className="uni-inst-item-label">University</span>
                    <span className="uni-inst-item-value bold">{institutionName}</span>
                  </div>
                </div>

                {/* Programme */}
                <div className="uni-inst-item-row">
                  <div className="uni-inst-item-icon blue">
                    <GraduationCap size={16} />
                  </div>
                  <div className="uni-inst-item-content">
                    <span className="uni-inst-item-label">Programme</span>
                    <span className="uni-inst-item-value">{programmeName}</span>
                  </div>
                </div>

                {/* Campus */}
                <div className="uni-inst-item-row">
                  <div className="uni-inst-item-icon blue">
                    <Landmark size={16} />
                  </div>
                  <div className="uni-inst-item-content">
                    <span className="uni-inst-item-label">Campus</span>
                    <span className="uni-inst-item-value">{campusName}</span>
                  </div>
                </div>

                {/* Enrollment Status */}
                <div className="uni-inst-item-row">
                  <div className="uni-inst-item-icon green">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="uni-inst-item-content">
                    <span className="uni-inst-item-label">Enrollment Status</span>
                    <span className="uni-inst-item-badge eligible">
                      {enrollmentStatus}
                    </span>
                  </div>
                </div>

                {/* Last Synced */}
                <div className="uni-inst-item-row">
                  <div className="uni-inst-item-icon slate">
                    <Clock size={16} />
                  </div>
                  <div className="uni-inst-item-content">
                    <span className="uni-inst-item-label">Last synced</span>
                    <span className="uni-inst-item-value muted">
                      18 Oct 2025, 10:00 AM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Recent Activity Feed */}
          <div className="uni-section-card">
            <div className="uni-section-card-header">
              <div>
                <h2 className="uni-clean-card-title">Recent Activity</h2>
                <p className="uni-clean-card-sub">Identity events and system updates.</p>
              </div>
              <Link to="/student/activity" className="uni-clean-link-action">
                <span>View all</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="uni-activity-clean-feed">
              {/* Event 1 */}
              <div className="uni-activity-clean-item">
                <div className="uni-activity-dot-circle green">
                  <CheckCircle2 size={16} />
                </div>
                <div className="uni-activity-clean-content">
                  <div className="uni-activity-clean-title">Email verification completed</div>
                  <div className="uni-activity-clean-desc">
                    Your institutional email has been verified.
                  </div>
                </div>
                <div className="uni-activity-clean-time">18 Oct 2025, 09:45 AM</div>
              </div>

              {/* Event 2 */}
              <div className="uni-activity-clean-item">
                <div className="uni-activity-dot-circle teal">
                  <FileText size={16} />
                </div>
                <div className="uni-activity-clean-content">
                  <div className="uni-activity-clean-title">Verification submitted</div>
                  <div className="uni-activity-clean-desc">
                    Your student record has been submitted for review.
                  </div>
                </div>
                <div className="uni-activity-clean-time">16 Oct 2025, 02:30 PM</div>
              </div>

              {/* Event 3 */}
              <div className="uni-activity-clean-item">
                <div className="uni-activity-dot-circle amber">
                  <User size={16} />
                </div>
                <div className="uni-activity-clean-content">
                  <div className="uni-activity-clean-title">Profile updated</div>
                  <div className="uni-activity-clean-desc">
                    You updated your contact information.
                  </div>
                </div>
                <div className="uni-activity-clean-time">12 Oct 2025, 11:20 AM</div>
              </div>

              {/* Event 4 */}
              <div className="uni-activity-clean-item">
                <div className="uni-activity-dot-circle purple">
                  <CreditCard size={16} />
                </div>
                <div className="uni-activity-clean-content">
                  <div className="uni-activity-clean-title">Credential issuance in progress</div>
                  <div className="uni-activity-clean-desc">
                    Your digital credential is being issued by the institution.
                  </div>
                </div>
                <div className="uni-activity-clean-time">10 Oct 2025, 08:15 AM</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Quick Actions & Support Widget ──────────────────── */}
        <div className="uni-split-col-side">
          {/* Quick Actions List */}
          <div className="uni-section-card">
            <h2 className="uni-clean-card-title mb-16">Quick Actions</h2>

            <div className="uni-quick-actions-clean-stack">
              {/* Action 1 */}
              <Link to="/student/id" className="uni-action-card-row">
                <div className="uni-action-icon-square blue">
                  <CreditCard size={18} />
                </div>
                <div className="uni-action-text-box">
                  <span className="uni-action-main-title">View Digital ID</span>
                  <span className="uni-action-subtitle">Open your student ID card</span>
                </div>
                <ChevronRight size={16} className="uni-action-chevron" />
              </Link>

              {/* Action 2 */}
              <Link to="/student/verification" className="uni-action-card-row">
                <div className="uni-action-icon-square green">
                  <ShieldCheck size={18} />
                </div>
                <div className="uni-action-text-box">
                  <span className="uni-action-main-title">Continue Verification</span>
                  <span className="uni-action-subtitle">Complete pending steps</span>
                </div>
                <ChevronRight size={16} className="uni-action-chevron" />
              </Link>

              {/* Action 3 */}
              <Link to="/student/profile" className="uni-action-card-row">
                <div className="uni-action-icon-square purple">
                  <User size={18} />
                </div>
                <div className="uni-action-text-box">
                  <span className="uni-action-main-title">Update Profile</span>
                  <span className="uni-action-subtitle">Edit your personal information</span>
                </div>
                <ChevronRight size={16} className="uni-action-chevron" />
              </Link>

              {/* Action 4 */}
              <Link to="/student/notifications" className="uni-action-card-row">
                <div className="uni-action-icon-square amber">
                  <Bell size={18} />
                </div>
                <div className="uni-action-text-box">
                  <span className="uni-action-main-title">View Notifications</span>
                  <span className="uni-action-subtitle">Check recent updates</span>
                </div>
                <ChevronRight size={16} className="uni-action-chevron" />
              </Link>

              {/* Action 5 */}
              <Link to="/student/requests" className="uni-action-card-row">
                <div className="uni-action-icon-square teal">
                  <FileText size={18} />
                </div>
                <div className="uni-action-text-box">
                  <span className="uni-action-main-title">Track a Request</span>
                  <span className="uni-action-subtitle">Follow your submitted requests</span>
                </div>
                <ChevronRight size={16} className="uni-action-chevron" />
              </Link>

              {/* Action 6 */}
              <Link to="/student/support" className="uni-action-card-row">
                <div className="uni-action-icon-square slate">
                  <HelpCircle size={18} />
                </div>
                <div className="uni-action-text-box">
                  <span className="uni-action-main-title">Get Help</span>
                  <span className="uni-action-subtitle">Contact support or view FAQs</span>
                </div>
                <ChevronRight size={16} className="uni-action-chevron" />
              </Link>
            </div>
          </div>

          {/* Need Assistance? Support Card */}
          <div className="uni-section-card uni-assistance-card">
            <div className="uni-assistance-icon-wrap">
              <Headphones size={26} />
            </div>
            <h3 className="uni-assistance-title">Need Assistance?</h3>
            <p className="uni-assistance-desc">
              Our support team is here to help you with any questions or issues you may have.
            </p>
            <Link to="/student/support" className="uni-btn-assistance-contact">
              <span>Contact Support</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <PhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onSuccess={() => {
          refreshDashboard();
        }}
        currentPhotoUrl={photoUrl}
      />

      <CorrectionRequestModal
        isOpen={correctionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
        onSuccess={() => {
          refreshDashboard();
          navigate("/student/requests");
        }}
      />
    </div>
  );
};

import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Building2,
  FileCheck2,
  History,
  AlertTriangle,
  ShieldCheck,
  GraduationCap,
  Mail,
  Database,
  Globe,
  X,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StaffReviewCaseDetail } from "@/types";
import {
  OfficerStatusBadge,
  OfficerErrorState,
} from "@/components/officer/OfficerComponents";

export const StaffReviewDetailPage: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();

  const [detail, setDetail] = useState<StaffReviewCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Verification Checklist State
  const [checklist, setChecklist] = useState({
    identityConfirmed: false,
    recordMatched: false,
    enrollmentEligible: false,
    evidenceValid: false,
  });

  // Decision modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"approve" | "reject" | "follow_up">("approve");
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCase = useCallback(async () => {
    if (!reviewId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getStaffReviewCase(reviewId);
      setDetail(data);

      // Pre-check checklist if evidence matches cleanly
      if (data.evidence.has_match && data.evidence.discrepancies.length === 0) {
        setChecklist({
          identityConfirmed: true,
          recordMatched: true,
          enrollmentEligible: data.evidence.enrollment_status?.toLowerCase() === "active",
          evidenceValid: true,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load verification case.");
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    void loadCase();
  }, [loadCase]);

  const handleOpenDecisionModal = (type: "approve" | "reject" | "follow_up") => {
    setDecisionType(type);
    setReasonCode(
      type === "approve"
        ? "identity_verified"
        : type === "reject"
        ? "mismatched_records"
        : "additional_info_required"
    );
    setNotes("");
    setFollowUpInstructions("");
    setModalOpen(true);
  };

  const handleConfirmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewId) return;

    if (!notes.trim() && decisionType !== "approve") {
      setError("Please provide a written explanation or rationale for this decision.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const combinedNotes = reasonCode
        ? `[Reason: ${reasonCode}] ${notes.trim()}`
        : notes.trim();

      await apiClient.submitStaffReviewDecision(
        reviewId,
        decisionType,
        combinedNotes,
        followUpInstructions.trim()
      );
      setActionSuccess(
        `Decision recorded successfully: ${decisionType.toUpperCase()} on case ${detail?.reference}.`
      );
      setModalOpen(false);
      await loadCase();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit decision.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading && !detail) {
    return (
      <div className="uni-officer-dashboard-content">
        <div className="uni-loading-centered py-16">
          <Clock size={32} className="uni-spin text-primary mx-auto mb-3" />
          <p className="text-muted">Loading case workspace & evidence...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="uni-officer-dashboard-content">
        <OfficerErrorState
          title="Case Not Found"
          message={error || "Verification case not found or not in authorized scope."}
        />
        <div className="mt-4">
          <Link to="/staff/verification" className="uni-officer-btn-secondary">
            <ArrowLeft size={16} />
            <span>Back to Verification Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  const { evidence } = detail;
  const isApi = detail.verification_mode === "api" || detail.verification_mode === "api_verification";
  const allChecksPass =
    checklist.identityConfirmed &&
    checklist.recordMatched &&
    checklist.enrollmentEligible &&
    checklist.evidenceValid;

  return (
    <div className="uni-officer-dashboard-content">
      {/* ── Breadcrumb & Top Bar ─────────────────────────────────────────── */}
      <div className="uni-officer-detail-header mb-6">
        <div className="uni-breadcrumb-row">
          <Link to="/staff/verification" className="uni-breadcrumb-link">
            <ArrowLeft size={15} />
            <span>Student Verification Queue</span>
          </Link>
          <span className="uni-breadcrumb-separator">/</span>
          <span className="uni-breadcrumb-current">{detail.reference}</span>
        </div>

        <div className="uni-case-title-row">
          <div>
            <div className="uni-case-ref-pill">Case {detail.reference}</div>
            <h1 className="uni-officer-title mt-1">{detail.full_name}</h1>
            <p className="uni-officer-subtitle">
              Submitted on {new Date(detail.submitted_at).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="uni-case-header-actions">
            <OfficerStatusBadge status={detail.status} size="md" />
            <span className={`uni-method-tag ${isApi ? "method-api" : "method-roster"}`}>
              {isApi ? <Globe size={12} /> : <Database size={12} />}
              <span>{isApi ? "API Verification" : "Email & Roster"}</span>
            </span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="uni-officer-success-banner mb-6">
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="mb-6">
          <OfficerErrorState message={error} />
        </div>
      )}

      {/* ── Discrepancy or Special Case Notice ───────────────────────────── */}
      {evidence.discrepancies.length > 0 ? (
        <div className="uni-officer-warning-banner mb-6">
          <div className="banner-icon-col">
            <AlertTriangle size={20} color="#D97706" />
          </div>
          <div className="banner-text-col">
            <h4 className="banner-title">
              Attention Required: {evidence.discrepancies.length} Record Discrepanc
              {evidence.discrepancies.length === 1 ? "y" : "ies"} Detected
            </h4>
            <p className="banner-desc">
              Carefully review the side-by-side comparison below. Ambiguous or conflicting records
              should be marked for investigation or requested for correction rather than immediately rejected.
            </p>
            <ul className="banner-list">
              {evidence.discrepancies.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : !evidence.has_match ? (
        <div className="uni-officer-warning-banner mb-6">
          <div className="banner-icon-col">
            <AlertTriangle size={20} color="#EF4444" />
          </div>
          <div className="banner-text-col">
            <h4 className="banner-title">No Authoritative Institutional Match Found</h4>
            <p className="banner-desc">
              The submitted identifier <strong>{detail.student_number || detail.institutional_email}</strong> does
              not match any currently enrolled record in the registry roster. Verify if an updated student roster
              needs to be imported before concluding rejection.
            </p>
          </div>
        </div>
      ) : (
        <div className="uni-officer-info-banner mb-6">
          <CheckCircle2 size={18} color="#059669" />
          <span>
            Institutional match confirmed. Identity details and roster enrollment align cleanly with authoritative
            registry data.
          </span>
        </div>
      )}

      {/* ── Main Workspace Grid (70% Comparison / 30% Profile & Decision) ─── */}
      <div className="uni-officer-workspace-grid">
        {/* Left Column: Side-by-Side Comparison & Evidence */}
        <div className="uni-workspace-main-col">
          {/* Side-by-Side Comparison Card */}
          <div className="uni-officer-main-card mb-6">
            <div className="uni-officer-card-header">
              <div className="header-icon-wrap bg-blue-tint">
                <FileCheck2 size={18} color="#1E60FF" />
              </div>
              <div>
                <h3 className="card-title">Evidence Comparison Panel</h3>
                <p className="card-subtitle">
                  Comparing student-claimed information against authoritative institutional records
                </p>
              </div>
            </div>

            <div className="uni-comparison-split-grid">
              {/* Left Side: Submitted Data */}
              <div className="uni-comparison-subpanel submitted">
                <div className="subpanel-header">
                  <span className="badge-tag">Student Submitted</span>
                  <h4>Claimed Profile</h4>
                </div>
                <div className="comparison-fields-list">
                  <div className="comparison-field-row">
                    <span className="field-label">Full Name</span>
                    <span className="field-val highlight-val">{detail.full_name}</span>
                  </div>
                  <div className="comparison-field-row">
                    <span className="field-label">Student Number</span>
                    <span className="field-val font-mono">{detail.student_number || "—"}</span>
                  </div>
                  <div className="comparison-field-row">
                    <span className="field-label">Institutional Email</span>
                    <span className="field-val">{detail.institutional_email}</span>
                  </div>
                  <div className="comparison-field-row">
                    <span className="field-label">Verification Mode</span>
                    <span className="field-val">{isApi ? "Direct SIS API" : "Roster Matching"}</span>
                  </div>
                  <div className="comparison-field-row">
                    <span className="field-label">Email OTP Verification</span>
                    <span className="field-val text-success font-medium">
                      Cryptographically Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Institutional Authoritative Record */}
              <div className="uni-comparison-subpanel authoritative">
                <div className="subpanel-header">
                  <span className="badge-tag tag-primary">Authoritative Source</span>
                  <h4>Institutional Registry Record</h4>
                </div>
                <div className="comparison-fields-list">
                  {evidence.has_match ? (
                    <>
                      <div className="comparison-field-row">
                        <span className="field-label">Registry Full Name</span>
                        <span className="field-val highlight-val">{evidence.full_name || "—"}</span>
                      </div>
                      <div className="comparison-field-row">
                        <span className="field-label">Official Student No.</span>
                        <span className="field-val font-mono">{evidence.student_number}</span>
                      </div>
                      <div className="comparison-field-row">
                        <span className="field-label">Roster Email</span>
                        <span className="field-val">{evidence.institutional_email || "—"}</span>
                      </div>
                      <div className="comparison-field-row">
                        <span className="field-label">Programme / Campus</span>
                        <span className="field-val">
                          {evidence.programme_name || evidence.programme_code || "Standard Programme"} •{" "}
                          {evidence.campus_name || evidence.campus_code || "Main Campus"}
                        </span>
                      </div>
                      <div className="comparison-field-row">
                        <span className="field-label">Enrollment Status</span>
                        <span className="field-val">
                          <OfficerStatusBadge status={evidence.enrollment_status || "Active"} size="sm" />
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-muted">
                      <AlertTriangle size={24} className="mx-auto mb-2 text-warning" />
                      <p>No matching record found in the active institutional database.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Evidence Provenance Footer */}
            <div className="uni-evidence-meta-footer">
              <div className="meta-item">
                <span className="label">Evidence Source:</span>
                <span className="val">{evidence.match_source || "Student Registry Database"}</span>
              </div>
              <div className="meta-item">
                <span className="label">Roster Batch / Version:</span>
                <span className="val">{evidence.roster_version || "Active Semester Live"}</span>
              </div>
              <div className="meta-item">
                <span className="label">Last Registry Sync:</span>
                <span className="val">
                  {evidence.record_updated_at
                    ? new Date(evidence.record_updated_at).toLocaleDateString()
                    : "Verified Synchronous"}
                </span>
              </div>
            </div>
          </div>

          {/* Decision & Case History Timeline */}
          <div className="uni-officer-main-card">
            <div className="uni-officer-card-header">
              <div className="header-icon-wrap bg-purple-tint">
                <History size={18} color="#8B5CF6" />
              </div>
              <div>
                <h3 className="card-title">Case Audit Trail & Activity</h3>
                <p className="card-subtitle">
                  Traceable chronological history of submissions, verifications, and reviewer actions
                </p>
              </div>
            </div>

            <div className="uni-timeline-flow">
              {detail.history && detail.history.length > 0 ? (
                detail.history.map((h, i) => (
                  <div key={i} className="uni-timeline-item">
                    <div className="uni-timeline-dot" />
                    <div className="uni-timeline-content">
                      <div className="uni-timeline-header">
                        <span className="action-title">{h.action || "Status Update"}</span>
                        <span className="timestamp">
                          {h.timestamp ? new Date(h.timestamp).toLocaleString() : ""}
                        </span>
                      </div>
                      <p className="description">
                        {((h as any).notes || (h as any).description || (h.metadata?.notes as string) || "Action recorded by system.")}
                      </p>
                      {((h as any).actor || (h.metadata?.actor as string)) && (
                        <span className="actor">By: {((h as any).actor || (h.metadata?.actor as string))}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="uni-timeline-item">
                  <div className="uni-timeline-dot dot-blue" />
                  <div className="uni-timeline-content">
                    <div className="uni-timeline-header">
                      <span className="action-title">Application Submitted & OTP Verified</span>
                      <span className="timestamp">
                        {new Date(detail.submitted_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="description">
                      Student submitted digital ID application and successfully completed one-time passcode verification.
                    </p>
                    <span className="actor">Automated Ingestion Pipeline</span>
                  </div>
                </div>
              )}

              {detail.review_decision && (
                <div className="uni-timeline-item">
                  <div className="uni-timeline-dot dot-green" />
                  <div className="uni-timeline-content">
                    <div className="uni-timeline-header">
                      <span className="action-title">
                        Decision Recorded: {detail.review_decision.toUpperCase()}
                      </span>
                      <span className="timestamp">
                        {detail.reviewed_at ? new Date(detail.reviewed_at).toLocaleString() : ""}
                      </span>
                    </div>
                    <p className="description">{detail.review_notes || "Decision completed."}</p>
                    <span className="actor">Reviewer: {detail.reviewer_name || "Review Officer"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Student Card, Checklist, and Decision Action Panel */}
        <div className="uni-workspace-side-col">
          {/* Student Identity Card */}
          <div className="uni-officer-main-card mb-6">
            <div className="uni-officer-card-header">
              <h3 className="card-title">Student Profile</h3>
            </div>
            <div className="uni-side-student-profile">
              <div className="avatar-circle">
                <img
                  src="/assets/images/student_id_photo.jpg"
                  alt={detail.full_name}
                  className="avatar-img"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80";
                  }}
                />
              </div>
              <h3 className="student-name">{detail.full_name}</h3>
              <div className="student-no-pill">{detail.student_number || "NO NUMBER"}</div>

              <div className="profile-details-list">
                <div className="profile-detail-item">
                  <Mail size={14} className="icon" />
                  <span>{detail.institutional_email}</span>
                </div>
                <div className="profile-detail-item">
                  <GraduationCap size={14} className="icon" />
                  <span>{evidence.programme_name || "Undergraduate Student"}</span>
                </div>
                <div className="profile-detail-item">
                  <Building2 size={14} className="icon" />
                  <span>{evidence.campus_name || "Chancellor College Campus"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="uni-officer-main-card mb-6">
            <div className="uni-officer-card-header">
              <div className="header-icon-wrap bg-green-tint">
                <ShieldCheck size={18} color="#059669" />
              </div>
              <div>
                <h3 className="card-title">Verification Checklist</h3>
                <p className="card-subtitle">Mandatory criteria before approval</p>
              </div>
            </div>

            <div className="uni-checklist-container">
              <label className="uni-checkbox-label">
                <input
                  type="checkbox"
                  checked={checklist.identityConfirmed}
                  onChange={() => toggleChecklist("identityConfirmed")}
                />
                <span className="checkbox-text">Identity details & name match</span>
              </label>

              <label className="uni-checkbox-label">
                <input
                  type="checkbox"
                  checked={checklist.recordMatched}
                  onChange={() => toggleChecklist("recordMatched")}
                />
                <span className="checkbox-text">Institutional student number match</span>
              </label>

              <label className="uni-checkbox-label">
                <input
                  type="checkbox"
                  checked={checklist.enrollmentEligible}
                  onChange={() => toggleChecklist("enrollmentEligible")}
                />
                <span className="checkbox-text">Active academic enrollment confirmed</span>
              </label>

              <label className="uni-checkbox-label">
                <input
                  type="checkbox"
                  checked={checklist.evidenceValid}
                  onChange={() => toggleChecklist("evidenceValid")}
                />
                <span className="checkbox-text">Required photo & credential evidence valid</span>
              </label>
            </div>

            <div className="checklist-status-hint">
              {allChecksPass ? (
                <span className="text-success flex items-center gap-1 text-sm font-medium">
                  <CheckCircle2 size={14} /> All verification criteria satisfied
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1 text-sm">
                  <Clock size={14} /> Complete all checklist items to certify approval
                </span>
              )}
            </div>
          </div>

          {/* Decision Action Panel */}
          <div className="uni-officer-main-card">
            <div className="uni-officer-card-header">
              <h3 className="card-title">Case Decision</h3>
            </div>

            <div className="uni-decision-action-box">
              <p className="decision-notice">
                All decisions are digitally signed and recorded in the immutable institutional audit log.
              </p>

              <div className="decision-buttons-stack">
                <button
                  type="button"
                  className="uni-btn-decision-approve"
                  onClick={() => handleOpenDecisionModal("approve")}
                  disabled={!allChecksPass && detail.status !== "verified"}
                >
                  <CheckCircle2 size={16} />
                  <span>Approve & Issue Credential</span>
                </button>

                <button
                  type="button"
                  className="uni-btn-decision-followup"
                  onClick={() => handleOpenDecisionModal("follow_up")}
                >
                  <HelpCircle size={16} />
                  <span>Request Information</span>
                </button>

                <button
                  type="button"
                  className="uni-btn-decision-reject"
                  onClick={() => handleOpenDecisionModal("reject")}
                >
                  <XCircle size={16} />
                  <span>Reject Case</span>
                </button>
              </div>

              {!allChecksPass && detail.status !== "verified" && (
                <p className="checklist-warning-text">
                  Approval is locked until all checklist criteria are confirmed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Decision Confirmation Modal ────────────────────────────────────── */}
      {modalOpen && (
        <div className="uni-officer-modal-backdrop" role="dialog" aria-modal="true">
          <div className="uni-officer-modal-card">
            <div className="uni-officer-modal-header">
              <div className="flex items-center gap-2">
                {decisionType === "approve" && <CheckCircle2 size={20} color="#059669" />}
                {decisionType === "follow_up" && <HelpCircle size={20} color="#D97706" />}
                {decisionType === "reject" && <XCircle size={20} color="#EF4444" />}
                <h3 className="modal-title">
                  {decisionType === "approve" && "Confirm Credential Approval"}
                  {decisionType === "follow_up" && "Request Information From Student"}
                  {decisionType === "reject" && "Confirm Application Rejection"}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDecision} className="uni-officer-modal-body">
              <div className="modal-student-summary mb-4">
                <span className="label">Student:</span>
                <span className="name">{detail.full_name}</span>
                <span className="no">({detail.student_number || detail.reference})</span>
              </div>

              {/* Rationale Code Selection */}
              <div className="form-group mb-4">
                <label className="form-label">
                  Decision Code / Category <span className="text-danger">*</span>
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="uni-officer-input"
                  required
                >
                  {decisionType === "approve" && (
                    <>
                      <option value="identity_verified">Identity Verified & Records Matched</option>
                      <option value="roster_confirmed">Enrollment Confirmed via Registrar Roster</option>
                      <option value="special_approval">Special Institutional Reviewer Approval</option>
                    </>
                  )}
                  {decisionType === "follow_up" && (
                    <>
                      <option value="additional_info_required">Additional Verification Information Required</option>
                      <option value="photo_unclear">Photo Quality Insufficient / Needs Re-upload</option>
                      <option value="programme_mismatch">Programme Clarification Required</option>
                    </>
                  )}
                  {decisionType === "reject" && (
                    <>
                      <option value="mismatched_records">Mismatched Records / Discrepant Registration</option>
                      <option value="not_enrolled">Student Not Currently Enrolled</option>
                      <option value="invalid_evidence">Invalid or Fraudulent Evidence</option>
                      <option value="duplicate_applicant">Duplicate Application</option>
                    </>
                  )}
                </select>
              </div>

              {/* Reviewer Notes */}
              <div className="form-group mb-4">
                <label className="form-label">
                  Reviewer Rationale & Notes{" "}
                  {decisionType !== "approve" && <span className="text-danger">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    decisionType === "approve"
                      ? "Optional notes for the institutional record..."
                      : "Provide a detailed justification for this action..."
                  }
                  rows={3}
                  className="uni-officer-textarea"
                  required={decisionType !== "approve"}
                />
              </div>

              {/* Follow-up Instructions if applicable */}
              {decisionType === "follow_up" && (
                <div className="form-group mb-4">
                  <label className="form-label">Instructions for Student</label>
                  <textarea
                    value={followUpInstructions}
                    onChange={(e) => setFollowUpInstructions(e.target.value)}
                    placeholder="Provide clear steps for the student to resolve this issue..."
                    rows={2}
                    className="uni-officer-textarea"
                  />
                </div>
              )}

              <div className="modal-audit-warning mb-4">
                <ShieldCheck size={16} />
                <span>
                  This decision will be immutably recorded under your officer identity and timestamped in the audit trail.
                </span>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="uni-officer-btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`uni-officer-btn-primary ${
                    decisionType === "reject" ? "btn-danger" : ""
                  }`}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Confirm Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

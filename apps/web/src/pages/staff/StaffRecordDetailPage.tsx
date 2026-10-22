import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  Archive,
  RotateCcw,
  History,
  Save,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StaffStudentRecordDetail } from "@/types";
import { Alert } from "@/components/common/Alert";

export const StaffRecordDetailPage: React.FC = () => {
  const { recordId } = useParams<{ recordId: string }>();

  const [detail, setDetail] = useState<StaffStudentRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form edit fields
  const [fullName, setFullName] = useState("");
  const [campusId, setCampusId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [studyYear, setStudyYear] = useState<number>(1);
  const [enrollmentStatus, setEnrollmentStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  const loadRecord = useCallback(async () => {
    if (!recordId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getStaffRecord(recordId);
      setDetail(data);
      setFullName(data.student.full_name);
      setCampusId(data.student.campus_id || "");
      setProgrammeId(data.student.programme_id || "");
      setAcademicYear(data.student.academic_year || "");
      setStudyYear(data.student.study_year || 1);
      setEnrollmentStatus(data.student.enrollment_status);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load student record.");
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordId) return;

    setSaving(true);
    setError(null);
    setActionSuccess(null);
    try {
      await apiClient.updateStaffRecord(recordId, {
        full_name: fullName.trim(),
        campus_id: campusId || undefined,
        programme_id: programmeId || undefined,
        academic_year: academicYear.trim() || undefined,
        study_year: studyYear,
        enrollment_status: enrollmentStatus,
      });
      setActionSuccess("Student record updated successfully. Audit event recorded.");
      await loadRecord();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update record.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!recordId || !detail) return;
    if (!window.confirm("Archive this student record? Historical data will be preserved.")) return;

    try {
      await apiClient.archiveStaffRecord(recordId);
      setActionSuccess(`Record ${detail.student.student_number} has been archived.`);
      await loadRecord();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to archive record.");
    }
  };

  const handleRestore = async () => {
    if (!recordId || !detail) return;
    try {
      await apiClient.restoreStaffRecord(recordId);
      setActionSuccess(`Record ${detail.student.student_number} has been restored to active status.`);
      await loadRecord();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to restore record.");
    }
  };

  if (loading && !detail) {
    return (
      <div className="uni-staff-page-container">
        <div className="uni-loading-centered">
          <p>Loading student record...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="uni-staff-page-container">
        <Alert type="error" message={error || "Record not found."} />
        <Link to="/staff/records" className="uni-btn-secondary mt-4">
          <ArrowLeft size={16} />
          <span>Back to Registry</span>
        </Link>
      </div>
    );
  }

  const { student, audit_history, available_campuses, available_programmes } = detail;
  const isImportedRosterRecord = student.source === "imported_roster";

  return (
    <div className="uni-staff-page-container">
      {/* Header bar */}
      <div className="uni-case-top-nav">
        <Link to="/staff/records" className="uni-btn-back">
          <ArrowLeft size={16} />
          <span>Back to Student Registry</span>
        </Link>
        <span className="uni-case-ref-large">{student.student_number}</span>
        <div className="uni-case-status-tag">
          Record Status: <strong className="text-capitalize">{student.status}</strong>
        </div>
      </div>

      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && <Alert type="error" message={error} />}

      {/* Main Form & Identity Grid */}
      <div className="uni-record-detail-grid">
        {/* Left Form: Edit Permitted Fields */}
        <div className="uni-record-form-card">
          <div className="uni-card-header-with-actions">
            <div>
              <h3>Institutional Student Details</h3>
              <p>Update permitted academic enrollment details.</p>
            </div>
            {!isImportedRosterRecord && student.status === "active" ? (
              <button
                type="button"
                className="uni-btn-secondary danger-text"
                onClick={handleArchive}
              >
                <Archive size={15} />
                <span>Archive Record</span>
              </button>
            ) : !isImportedRosterRecord ? (
              <button
                type="button"
                className="uni-btn-secondary success-text"
                onClick={handleRestore}
              >
                <RotateCcw size={15} />
                <span>Restore Record</span>
              </button>
            ) : null}
          </div>

          {isImportedRosterRecord && (
            <Alert type="info" message="This imported roster record is institutional evidence, not a student account. Correct it through a new roster import; onboarding will link it only after verification." />
          )}
          <form onSubmit={handleUpdate} className="uni-modal-form mt-4">
            <div className="uni-form-grid">
              {/* Immutable Registration Number */}
              <div className="uni-form-group">
                <label>
                  <span>Registration Number</span>
                  <span className="uni-immutable-tag">
                    <Lock size={12} /> Immutable
                  </span>
                </label>
                <input
                  type="text"
                  disabled
                  value={student.student_number}
                  className="uni-form-input disabled font-mono"
                />
                <span className="uni-input-hint">Unique institutional identifier protected from alteration.</span>
              </div>

              {/* Immutable Email */}
              <div className="uni-form-group">
                <label>
                  <span>Institutional Email</span>
                  <span className="uni-immutable-tag">
                    <Lock size={12} /> System Managed
                  </span>
                </label>
                <input
                  type="text"
                  disabled
                  value={student.institutional_email}
                  className="uni-form-input disabled"
                />
              </div>

              {/* Editable Full Name */}
              <div className="uni-form-group full-width">
                <label htmlFor="fullName">Full Legal Name *</label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isImportedRosterRecord}
                  className="uni-form-input"
                />
              </div>

              {/* Campus Selector */}
              <div className="uni-form-group">
                <label htmlFor="campus">Assigned Campus</label>
                <select
                  id="campus"
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  disabled={isImportedRosterRecord}
                  className="uni-form-select"
                >
                  {available_campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Programme Selector */}
              <div className="uni-form-group">
                <label htmlFor="programme">Academic Programme</label>
                <select
                  id="programme"
                  value={programmeId}
                  onChange={(e) => setProgrammeId(e.target.value)}
                  disabled={isImportedRosterRecord}
                  className="uni-form-select"
                >
                  <option value="">Select Programme...</option>
                  {available_programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year */}
              <div className="uni-form-group">
                <label htmlFor="academicYear">Academic Cohort / Year</label>
                <input
                  id="academicYear"
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  disabled={isImportedRosterRecord}
                  className="uni-form-input"
                />
              </div>

              {/* Study Year */}
              <div className="uni-form-group">
                <label htmlFor="studyYear">Year of Study</label>
                <input
                  id="studyYear"
                  type="number"
                  min={1}
                  max={10}
                  value={studyYear}
                  onChange={(e) => setStudyYear(parseInt(e.target.value, 10) || 1)}
                  disabled={isImportedRosterRecord}
                  className="uni-form-input"
                />
              </div>

              {/* Enrollment Status */}
              <div className="uni-form-group full-width">
                <label htmlFor="enrollmentStatus">Official Enrollment Status</label>
                <select
                  id="enrollmentStatus"
                  value={enrollmentStatus}
                  onChange={(e) => setEnrollmentStatus(e.target.value)}
                  disabled={isImportedRosterRecord}
                  className="uni-form-select"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="on_leave">On Leave</option>
                  <option value="suspended">Suspended</option>
                  <option value="completed">Completed / Graduated</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <span className="uni-input-hint">
                  Changes affecting enrollment status are recorded in the audit trail. A record edit does not automatically issue credentials.
                </span>
              </div>
            </div>

            <div className="uni-form-footer mt-4">
              <button
                type="submit"
                className="uni-btn-primary"
                disabled={saving || isImportedRosterRecord}
              >
                <Save size={16} />
                <span>{saving ? "Saving Changes..." : "Save Record Changes"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Info: Metadata & History */}
        <div className="uni-record-sidebar-column">
          {/* Credential Status Card */}
          <div className="uni-info-sidebar-card">
            <h4>Digital Credential Status</h4>
            <div className="uni-cred-status-row">
              <span className={`uni-status-pill ${student.credential_status === "active" ? "verified" : "secondary"}`}>
                {student.credential_status === "active" ? "Active Digital Credential" : "No Digital Credential Issued"}
              </span>
            </div>
            <p className="text-xs text-muted mt-2">
              Digital credentials must follow the official verification policy. Editing a record does not silently issue a credential.
            </p>
          </div>

          {/* Audit History Timeline */}
          <div className="uni-info-sidebar-card">
            <div className="uni-history-header">
              <History size={16} />
              <h4>Record Audit History</h4>
            </div>
            <div className="uni-history-timeline-mini">
              {audit_history.length === 0 ? (
                <p className="text-xs text-muted">No past mutations recorded.</p>
              ) : (
                audit_history.map((h, i) => (
                  <div key={i} className="uni-timeline-item-mini">
                    <span className="uni-timeline-action-mini">{h.action}</span>
                    <span className="uni-timeline-time-mini">{new Date(h.timestamp).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

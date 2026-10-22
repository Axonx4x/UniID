import React, { useCallback, useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { apiClient, ApiError } from "@/services/apiClient";
import { RosterCommitResponse, RosterFreshnessResponse, RosterPreviewResponse } from "@/types";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";

interface RosterConsoleTabProps {
  institutionId: string;
}

export const RosterConsoleTab: React.FC<RosterConsoleTabProps> = ({ institutionId }) => {
  const [freshness, setFreshness] = useState<RosterFreshnessResponse | null>(null);
  const [loadingFreshness, setLoadingFreshness] = useState(false);

  // File & import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [isAuthoritative, setIsAuthoritative] = useState<boolean>(false);

  // Preview & commit results
  const [previewData, setPreviewData] = useState<RosterPreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<RosterCommitResponse | null>(null);

  // UI state
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFreshness = useCallback(async () => {
    if (!institutionId) return;
    setLoadingFreshness(true);
    try {
      const data = await apiClient.getRosterFreshness(institutionId);
      setFreshness(data);
    } catch {
      // Non-critical
    } finally {
      setLoadingFreshness(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadFreshness();
  }, [loadFreshness]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a valid .csv file.");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setPreviewData(null);
    setCommitResult(null);

    try {
      const text = await file.text();
      setCsvText(text);
    } catch {
      setError("Could not read the selected CSV file.");
    }
  };

  const handlePreview = async () => {
    if (!csvText.trim()) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoadingPreview(true);
    setError(null);
    setCommitResult(null);

    try {
      const preview = await apiClient.previewRoster(institutionId, csvText, isAuthoritative);
      setPreviewData(preview);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to generate roster preview.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (!csvText.trim()) return;

    setLoadingCommit(true);
    setError(null);

    try {
      const result = await apiClient.commitRoster(
        institutionId,
        csvText,
        selectedFile?.name || "roster.csv",
        isAuthoritative
      );
      setCommitResult(result);
      setSuccess(`Roster successfully imported and committed under version tag ${result.version_tag}!`);
      setPreviewData(null);
      void loadFreshness();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Roster commit failed.");
    } finally {
      setLoadingCommit(false);
    }
  };

  return (
    <div className="roster-console-container">
      {/* Roster Freshness Status Card */}
      <div className="roster-freshness-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="roster-icon-wrap">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Institutional Roster Status</h3>
              <p className="text-xs text-muted">
                Official student record files used for Path B verification and admissions matching.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="refresh-btn text-xs text-muted flex items-center gap-1"
            onClick={() => void loadFreshness()}
            disabled={loadingFreshness}
          >
            <RefreshCw className={`h-3 w-3 ${loadingFreshness ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {freshness && (
          <div className="freshness-metrics-row mt-4">
            <div className="freshness-item">
              <span className="text-xs text-muted">Freshness Condition</span>
              <div>
                <span
                  className={`badge text-xs font-semibold ${
                    freshness.is_stale ? "badge-warning" : "badge-success"
                  }`}
                >
                  {freshness.status_label.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="freshness-item">
              <span className="text-xs text-muted">Active Student Records</span>
              <p className="text-base font-bold">{freshness.total_active_records.toLocaleString()}</p>
            </div>

            <div className="freshness-item">
              <span className="text-xs text-muted">Active Version Tag</span>
              <p className="text-xs font-mono font-bold text-primary">
                {freshness.active_version || "None"}
              </p>
            </div>

            <div className="freshness-item">
              <span className="text-xs text-muted">Last Imported</span>
              <p className="text-xs">
                {freshness.last_imported_at
                  ? `${new Date(freshness.last_imported_at).toLocaleDateString()} (${freshness.days_since_import ?? 0}d ago)`
                  : "Never"}
              </p>
            </div>

            <div className="freshness-item">
              <span className="text-xs text-muted">Freshness Policy</span>
              <p className="text-xs">{freshness.freshness_policy_days} days threshold</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="my-4">
          <Alert variant="error" title="Import Error">
            {error}
          </Alert>
        </div>
      )}

      {success && (
        <div className="my-4">
          <Alert variant="success" title="Import Committed">
            {success}
          </Alert>
        </div>
      )}

      {/* CSV Roster Uploader Section */}
      <div className="roster-upload-card my-6">
        <h3 className="text-base font-bold mb-2">Import Student Records (CSV)</h3>
        <p className="text-xs text-muted mb-4">
          Upload an authorized CSV export with headers:{" "}
          <code>student_number, institutional_email, enrollment_status, programme_code, campus_code, academic_year</code>
        </p>

        <div className="upload-dropzone">
          <input
            id="csv-file-picker"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden-file-input"
          />
          <label htmlFor="csv-file-picker" className="dropzone-label">
            <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
            <span className="font-semibold text-sm">
              {selectedFile ? selectedFile.name : "Choose CSV file to upload"}
            </span>
            <span className="text-xs text-muted block mt-1">Click to browse your files (.csv)</span>
          </label>
        </div>

        {/* Authoritative Snapshot Toggle */}
        <div className="authoritative-toggle-wrap mt-4 p-3 bg-muted/20 rounded">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={isAuthoritative}
              onChange={(e) => setIsAuthoritative(e.target.checked)}
            />
            <div>
              <span className="text-sm font-bold">Mark as Authoritative Full-Roster Snapshot</span>
              <p className="text-xs text-muted mt-0.5">
                When enabled, student records not present in this file will be marked inactive. When
                disabled (default), this import is treated as an incremental update and never deactivates
                existing students.
              </p>
            </div>
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={handlePreview}
            loading={loadingPreview}
            disabled={!csvText.trim()}
          >
            Preview Import Changes
          </Button>
          <Button
            variant="primary"
            onClick={handleCommit}
            loading={loadingCommit}
            disabled={!csvText.trim()}
          >
            Commit Import Transaction
          </Button>
        </div>
      </div>

      {/* PREVIEW RESULTS DISPLAY */}
      {previewData && (
        <div className="preview-results-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold">Import Preview Analysis</h3>
            <span className="badge badge-info text-xs">
              {previewData.is_authoritative_snapshot ? "Authoritative Snapshot" : "Incremental Update"}
            </span>
          </div>

          <div className="preview-metrics-grid">
            <div className="preview-metric">
              <span className="metric-label">Total Rows</span>
              <span className="metric-val">{previewData.total_rows}</span>
            </div>
            <div className="preview-metric">
              <span className="metric-label">Valid Rows</span>
              <span className="metric-val text-success">{previewData.valid_rows_count}</span>
            </div>
            <div className="preview-metric">
              <span className="metric-label">Rejected Rows</span>
              <span className="metric-val text-error">{previewData.rejected_rows_count}</span>
            </div>
            <div className="preview-metric">
              <span className="metric-label">New Records</span>
              <span className="metric-val text-primary">{previewData.new_records_count}</span>
            </div>
            <div className="preview-metric">
              <span className="metric-label">Updated Records</span>
              <span className="metric-val text-muted">{previewData.updated_records_count}</span>
            </div>
            {previewData.is_authoritative_snapshot && (
              <div className="preview-metric">
                <span className="metric-label">To Deactivate</span>
                <span className="metric-val text-amber-600">{previewData.records_to_deactivate_count}</span>
              </div>
            )}
          </div>

          {/* Rejected Rows Breakdown */}
          {previewData.rejected_samples.length > 0 && (
            <div className="rejected-breakdown mt-4">
              <h4 className="text-xs uppercase font-bold text-error mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Rejected Rows ({previewData.rejected_rows_count})
              </h4>
              <div className="overflow-x-auto">
                <table className="rejected-table text-xs">
                  <thead>
                    <tr>
                      <th>Row #</th>
                      <th>Student #</th>
                      <th>Email</th>
                      <th>Rejection Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rejected_samples.map((r, idx) => (
                      <tr key={idx}>
                        <td>{String(r.row_index || idx + 1)}</td>
                        <td>{String(r.student_number || "—")}</td>
                        <td>{String(r.institutional_email || "—")}</td>
                        <td className="text-error font-medium">{String(r.reason || "Validation failed")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valid Records Sample */}
          {previewData.preview_records.length > 0 && (
            <div className="preview-sample mt-4">
              <h4 className="text-xs uppercase font-bold text-muted mb-2">Valid Records Sample (First 5)</h4>
              <div className="overflow-x-auto">
                <table className="sample-table text-xs">
                  <thead>
                    <tr>
                      <th>Student #</th>
                      <th>Email</th>
                      <th>Programme</th>
                      <th>Campus</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview_records.slice(0, 5).map((rec, idx) => (
                      <tr key={idx}>
                        <td className="font-mono font-bold">{String(rec.student_number)}</td>
                        <td>{String(rec.institutional_email)}</td>
                        <td>{String(rec.programme_code)}</td>
                        <td>{String(rec.campus_code || "—")}</td>
                        <td>{String(rec.enrollment_status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              onClick={handleCommit}
              loading={loadingCommit}
              disabled={previewData.valid_rows_count === 0}
            >
              Confirm and Commit {previewData.valid_rows_count} Records
            </Button>
          </div>
        </div>
      )}

      {/* COMMIT CONFIRMATION */}
      {commitResult && (
        <div className="commit-result-card my-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <div>
              <h4 className="font-bold text-base">Roster Import Successfully Committed</h4>
              <p className="text-xs text-muted">
                Assigned Version Tag: <code>{commitResult.version_tag}</code> · File: {commitResult.filename}
              </p>
              <p className="text-xs mt-1">
                Committed {commitResult.valid_rows} valid records ({commitResult.new_records_count} new,{" "}
                {commitResult.updated_records_count} updated).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

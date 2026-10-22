import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Settings2,
  Wand2,
  X,
  Users2,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import {
  StaffImportUploadResponse,
  StaffImportPreviewResponse,
  StaffCommitResponse,
  StaffPreviewRow,
  CanonicalFieldMeta,
} from "@/types";
import { Alert } from "@/components/common/Alert";

type WizardStep = "upload" | "mapping" | "transformations" | "preview" | "commit";

/**
 * Use only backend-provided canonical suggestions. This prevents the browser
 * from inventing fields and keeps the mapping contract aligned with the import
 * service's predefined general registry schema.
 */
const buildAutomaticMappings = (upload: StaffImportUploadResponse): Record<string, string> => {
  const permittedKeys = new Set(upload.canonical_fields.map((field) => field.key));
  const usedTargets = new Set<string>();
  const safeMappings: Record<string, string> = {};

  for (const header of upload.source_headers) {
    const suggested = upload.suggested_mappings[header];
    if (!suggested || !permittedKeys.has(suggested) || usedTargets.has(suggested)) continue;
    safeMappings[header] = suggested;
    usedTargets.add(suggested);
  }
  return safeMappings;
};

export const StaffImportWizardPage: React.FC = () => {
  const { importId: routeImportId } = useParams<{ importId?: string }>();

  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [importId, setImportId] = useState<string | null>(routeImportId || null);

  // Stage 1: Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<StaffImportUploadResponse | null>(null);
  const [uploading, setUploading] = useState(false);

  // Stage 2: Mapping state
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [mappingErrors, setMappingErrors] = useState<string[]>([]);
  const [autoMappingNotice, setAutoMappingNotice] = useState<string | null>(null);

  // Stage 3: Transformation state
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [collapseWhitespace, setCollapseWhitespace] = useState(true);
  const [normalizeEmail, setNormalizeEmail] = useState(true);
  const [preserveIdentifiers, setPreserveIdentifiers] = useState(true);
  const [statusDictionary, setStatusDictionary] = useState<Record<string, string>>({
    continuing: "active",
    registered: "active",
    "on leave": "on_leave",
    graduated: "completed",
    withdrawn: "withdrawn",
    suspended: "suspended",
  });
  const [customStatusInput, setCustomStatusInput] = useState({ source: "", target: "active" });

  // Stage 4: Preview & Reconciliation state
  const [previewData, setPreviewData] = useState<StaffImportPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [filterClassification, setFilterClassification] = useState<string>("all");

  // Stage 5: Commit state
  const [isAuthoritative, setIsAuthoritative] = useState(false);
  const [allowPartialCommit, setAllowPartialCommit] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<StaffCommitResponse | null>(null);

  // General error / notification
  const [error, setError] = useState<string | null>(null);

  // If route has importId on initial load, fetch existing preview
  useEffect(() => {
    if (routeImportId && routeImportId !== "wizard") {
      setImportId(routeImportId);
      setLoadingPreview(true);
      apiClient.getStaffImportPreview(routeImportId)
        .then((resp) => {
          setPreviewData(resp);
          setCurrentStep("preview");
        })
        .catch(() => {
          // If not mapped yet, fall back to upload
          setCurrentStep("upload");
        })
        .finally(() => setLoadingPreview(false));
    }
  }, [routeImportId]);

  // ── Step 1: File Selection & Upload ──────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a valid CSV (.csv) file.");
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setError("Please choose a CSV file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const resp = await apiClient.uploadStaffImport(selectedFile);
      const automaticMappings = buildAutomaticMappings(resp);
      setUploadData(resp);
      setImportId(resp.import_id);
      setColumnMappings(automaticMappings);
      setAutoMappingNotice(
        `${Object.keys(automaticMappings).length} predefined field mapping${Object.keys(automaticMappings).length === 1 ? "" : "s"} applied automatically. Review before continuing.`
      );
      setCurrentStep("mapping");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload and parse CSV file.");
    } finally {
      setUploading(false);
    }
  };

  // ── Step 2: Mapping Controls ─────────────────────────────────────────────────
  const handleMappingChange = (sourceHeader: string, canonicalKey: string) => {
    setColumnMappings((prev) => {
      const next = { ...prev };
      if (!canonicalKey) {
        delete next[sourceHeader];
      } else {
        next[sourceHeader] = canonicalKey;
      }
      return next;
    });
    setAutoMappingNotice(null);
    setMappingErrors([]);
  };

  const applyAutomaticMappings = () => {
    if (!uploadData) return;
    const automaticMappings = buildAutomaticMappings(uploadData);
    setColumnMappings(automaticMappings);
    setMappingErrors([]);
    setAutoMappingNotice(
      `${Object.keys(automaticMappings).length} safe mapping${Object.keys(automaticMappings).length === 1 ? "" : "s"} applied from the predefined UniID field aliases. Unrecognised columns remain unmapped.`
    );
  };

  const applyCompatibleTemplate = (tmpl: { mappings: Record<string, string>; status_dictionary?: Record<string, string> }) => {
    setColumnMappings(tmpl.mappings);
    if (tmpl.status_dictionary) {
      setStatusDictionary(tmpl.status_dictionary);
    }
    setAutoMappingNotice(`Applied the saved template. Review its mappings before continuing.`);
  };

  const validateMappingsClient = (): boolean => {
    const errors: string[] = [];
    const mappedTargets = Object.values(columnMappings).filter(Boolean);

    // Duplicate targets check
    const seen = new Set<string>();
    for (const target of mappedTargets) {
      if (seen.has(target)) {
        errors.push(`Multiple columns target the canonical field '${target}'. Each field can only be mapped once.`);
      }
      seen.add(target);
    }

    // Required fields check
    const required = ["student_number", "full_name", "institutional_email", "enrollment_status"];
    for (const req of required) {
      if (!mappedTargets.includes(req)) {
        errors.push(`Required field '${req.replace("_", " ").toUpperCase()}' is not mapped to any column.`);
      }
    }

    setMappingErrors(errors);
    return errors.length === 0;
  };

  const handleProceedToTransformations = () => {
    if (!validateMappingsClient()) return;
    setError(null);
    setCurrentStep("transformations");
  };

  // ── Step 3: Transformation Configuration ─────────────────────────────────────
  const handleAddCustomStatus = () => {
    if (!customStatusInput.source.trim()) return;
    setStatusDictionary((prev) => ({
      ...prev,
      [customStatusInput.source.trim().toLowerCase()]: customStatusInput.target,
    }));
    setCustomStatusInput({ source: "", target: "active" });
  };

  const handleRemoveStatusMapping = (sourceKey: string) => {
    setStatusDictionary((prev) => {
      const next = { ...prev };
      delete next[sourceKey];
      return next;
    });
  };

  const handleProceedToPreview = async () => {
    if (!importId) return;

    setLoadingPreview(true);
    setError(null);
    try {
      // 1. Save mapping
      await apiClient.updateStaffImportMapping(importId, {
        mappings: columnMappings,
        save_as_template: saveAsTemplate,
        template_name: templateName.trim() || undefined,
      });

      // 2. Validate with transformations
      const preview = await apiClient.validateStaffImport(importId, {
        trim_whitespace: trimWhitespace,
        collapse_whitespace: collapseWhitespace,
        normalize_email: normalizeEmail,
        preserve_string_identifiers: preserveIdentifiers,
        status_dictionary: statusDictionary,
      });

      setPreviewData(preview);
      setCurrentStep("preview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Validation error occurred.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // ── Step 5: Commit Execution ─────────────────────────────────────────────────
  const handleCommitImport = async () => {
    if (!importId) return;

    setCommitting(true);
    setError(null);
    try {
      const resp = await apiClient.commitStaffImport(importId, {
        is_authoritative_snapshot: isAuthoritative,
        allow_partial_commit: allowPartialCommit,
      });
      setCommitResult(resp);
      setCurrentStep("commit");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transactional commit failed.");
    } finally {
      setCommitting(false);
    }
  };

  // Filter preview rows
  const filteredRows = (previewData?.rows || []).filter((r: StaffPreviewRow) => {
    if (filterClassification === "all") return true;
    return r.classification === filterClassification;
  });

  return (
    <div className="uni-staff-page-container">
      {/* Stepper Bar */}
      <div className="uni-wizard-stepper">
        <div className={`uni-step-item ${currentStep === "upload" ? "active" : uploadData || previewData ? "completed" : ""}`}>
          <div className="uni-step-circle">1</div>
          <span>Upload File</span>
        </div>
        <div className="uni-step-connector" />
        <div className={`uni-step-item ${currentStep === "mapping" ? "active" : currentStep !== "upload" ? "completed" : ""}`}>
          <div className="uni-step-circle">2</div>
          <span>Column Mapping</span>
        </div>
        <div className="uni-step-connector" />
        <div className={`uni-step-item ${currentStep === "transformations" ? "active" : currentStep === "preview" || currentStep === "commit" ? "completed" : ""}`}>
          <div className="uni-step-circle">3</div>
          <span>Transformations</span>
        </div>
        <div className="uni-step-connector" />
        <div className={`uni-step-item ${currentStep === "preview" ? "active" : currentStep === "commit" ? "completed" : ""}`}>
          <div className="uni-step-circle">4</div>
          <span>Preview & Reconciliation</span>
        </div>
        <div className="uni-step-connector" />
        <div className={`uni-step-item ${currentStep === "commit" ? "active completed" : ""}`}>
          <div className="uni-step-circle">5</div>
          <span>Commit Results</span>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 1: FILE SELECTION & UPLOAD
         ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === "upload" && (
        <div className="uni-wizard-card">
          <div className="uni-wizard-card-header">
            <h2>Select Institutional Student Roster File</h2>
            <p>Upload a CSV file containing your institution's latest student enrollment registry.</p>
          </div>

          <div className="uni-upload-dropzone">
            <input
              type="file"
              id="csvFile"
              accept=".csv"
              onChange={handleFileChange}
              className="uni-file-input-hidden"
            />
            <label htmlFor="csvFile" className="uni-dropzone-label">
              <UploadCloud size={48} className="text-accent mb-2" />
              <span className="uni-dropzone-title">
                {selectedFile ? selectedFile.name : "Click to browse or drop CSV roster file here"}
              </span>
              <span className="uni-dropzone-sub">
                Supports CSV with UTF-8 / Latin-1 encoding (up to 10 MB and 10,000 rows)
              </span>
            </label>
          </div>

          {selectedFile && (
            <div className="uni-selected-file-badge">
              <FileSpreadsheet size={18} className="text-accent" />
              <span>{selectedFile.name}</span>
              <span className="text-muted text-xs">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}

          <div className="uni-wizard-card-footer">
            <Link to="/staff/imports" className="uni-btn-secondary">
              Cancel
            </Link>
            <button
              type="button"
              className="uni-btn-primary"
              disabled={!selectedFile || uploading}
              onClick={handleUploadSubmit}
            >
              {uploading ? "Analyzing Structure..." : "Continue to Column Mapping"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 2: COLUMN MAPPING
         ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === "mapping" && uploadData && (
        <div className="uni-wizard-card">
          <div className="uni-wizard-card-header">
            <h2>Map Source Columns to UniID Registry Fields</h2>
            <p>
              Match each column from <strong>{uploadData.filename}</strong> ({uploadData.total_rows} rows) to an authoritative canonical UniID field.
            </p>
          </div>

          <div className="uni-templates-suggestion-box" role="status">
            <Wand2 size={16} className="text-accent" />
            <div>
              <strong>Auto-map predefined fields</strong>
              <span> Matches recognised general headers such as registration number, full name, institutional email, enrollment status, programme, campus, and academic year.</span>
            </div>
            <button type="button" className="uni-btn-secondary" onClick={applyAutomaticMappings}>
              <Wand2 size={14} /> Auto-map fields
            </button>
          </div>
          {autoMappingNotice && (
            <div className="uni-success-banner" role="status">
              <CheckCircle2 size={16} /> {autoMappingNotice}
            </div>
          )}

          {/* Compatible Template Suggestions if available */}
          {uploadData.compatible_templates.length > 0 && (
            <div className="uni-templates-suggestion-box">
              <Settings2 size={16} className="text-accent" />
              <span>Saved templates available for your institution:</span>
              <div className="uni-template-buttons">
                {uploadData.compatible_templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    className="uni-btn-template-pill"
                    onClick={() => applyCompatibleTemplate(tmpl)}
                  >
                    Apply "{tmpl.name}" ({tmpl.match_percentage}% match)
                  </button>
                ))}
              </div>
            </div>
          )}

          {mappingErrors.length > 0 && (
            <div className="uni-mapping-errors-box">
              <AlertTriangle size={16} className="text-danger" />
              <ul>
                {mappingErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mapping Table */}
          <div className="uni-mapping-table-wrapper">
            <table className="uni-mapping-table">
              <thead>
                <tr>
                  <th>Source File Header</th>
                  <th>Sample Value (Row 1)</th>
                  <th>Target Canonical UniID Field</th>
                  <th>Requirement</th>
                </tr>
              </thead>
              <tbody>
                {uploadData.source_headers.map((header) => {
                  const sampleVal = uploadData.sample_rows[0]?.[header] || "—";
                  const mappedKey = columnMappings[header] || "";
                  const canonicalMeta = uploadData.canonical_fields.find((c) => c.key === mappedKey);

                  return (
                    <tr key={header}>
                      <td>
                        <span className="font-semibold text-main">{header}</span>
                      </td>
                      <td>
                        <span className="uni-sample-val font-mono">{sampleVal}</span>
                      </td>
                      <td>
                        <select
                          className="uni-mapping-select"
                          value={mappedKey}
                          onChange={(e) => handleMappingChange(header, e.target.value)}
                        >
                          <option value="">[ Leave Unmapped / Ignore Column ]</option>
                          {uploadData.canonical_fields.map((c: CanonicalFieldMeta) => (
                            <option key={c.key} value={c.key}>
                              {c.label} {c.required ? "(* Required)" : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {canonicalMeta?.required ? (
                          <span className="uni-required-tag">Required Field</span>
                        ) : mappedKey ? (
                          <span className="uni-optional-tag">Optional Field</span>
                        ) : (
                          <span className="uni-ignored-tag">Will be Ignored</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Save Template Option */}
          <div className="uni-save-template-section">
            <label className="uni-checkbox-label">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
              />
              <span>Save this mapping as a reusable template for your institution</span>
            </label>
            {saveAsTemplate && (
              <input
                type="text"
                placeholder="Template Name (e.g., Standard Registrar Roster v1)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="uni-form-input mt-2 max-w-md"
              />
            )}
          </div>

          <div className="uni-wizard-card-footer">
            <button
              type="button"
              className="uni-btn-secondary"
              onClick={() => setCurrentStep("upload")}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button
              type="button"
              className="uni-btn-primary"
              onClick={handleProceedToTransformations}
            >
              <span>Continue to Transformations</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 3: TRANSFORMATION CONFIGURATION
         ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === "transformations" && (
        <div className="uni-wizard-card">
          <div className="uni-wizard-card-header">
            <h2>Deterministic Normalization & Status Resolution</h2>
            <p>Configure automated data transformations and map institution-specific enrollment labels to canonical statuses.</p>
          </div>

          {/* Normalization Toggles */}
          <div className="uni-transformations-grid">
            <div className="uni-transform-card">
              <label className="uni-checkbox-label">
                <input
                  type="checkbox"
                  checked={trimWhitespace}
                  onChange={(e) => setTrimWhitespace(e.target.checked)}
                />
                <strong>Trim Leading & Trailing Whitespace</strong>
              </label>
              <p className="uni-transform-desc">Removes accidental spaces and tabs from student numbers, names, and codes.</p>
            </div>

            <div className="uni-transform-card">
              <label className="uni-checkbox-label">
                <input
                  type="checkbox"
                  checked={collapseWhitespace}
                  onChange={(e) => setCollapseWhitespace(e.target.checked)}
                />
                <strong>Collapse Repeated Internal Whitespace</strong>
              </label>
              <p className="uni-transform-desc">Normalizes multiple consecutive spaces in names to single spaces.</p>
            </div>

            <div className="uni-transform-card">
              <label className="uni-checkbox-label">
                <input
                  type="checkbox"
                  checked={normalizeEmail}
                  onChange={(e) => setNormalizeEmail(e.target.checked)}
                />
                <strong>Normalize Institutional Emails</strong>
              </label>
              <p className="uni-transform-desc">Converts emails to lowercase and validates official syntax against institutional rules.</p>
            </div>

            <div className="uni-transform-card">
              <label className="uni-checkbox-label">
                <input
                  type="checkbox"
                  checked={preserveIdentifiers}
                  onChange={(e) => setPreserveIdentifiers(e.target.checked)}
                />
                <strong>Preserve String Identifiers (Leading Zeros)</strong>
              </label>
              <p className="uni-transform-desc">Guarantees registration numbers are never converted to numeric integers (preserves "00124").</p>
            </div>
          </div>

          {/* Enrollment Status Dictionary */}
          <div className="uni-status-dictionary-box mt-6">
            <div className="uni-dictionary-header">
              <h3>Institution-Specific Enrollment Status Dictionary</h3>
              <p>Map your registrar's status labels to canonical statuses. Unknown values are flagged and never silently assumed.</p>
            </div>

            <div className="uni-status-chips-list">
              {Object.entries(statusDictionary).map(([source, target]) => (
                <div key={source} className="uni-status-chip">
                  <span className="font-mono">{source}</span>
                  <span className="uni-chip-arrow">→</span>
                  <span className="uni-chip-target">{target}</span>
                  <button
                    type="button"
                    className="uni-chip-remove"
                    onClick={() => handleRemoveStatusMapping(source)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add custom mapping row */}
            <div className="uni-add-status-row mt-4">
              <input
                type="text"
                placeholder="Source status (e.g., 'On Academic Leave')"
                value={customStatusInput.source}
                onChange={(e) => setCustomStatusInput({ ...customStatusInput, source: e.target.value })}
                className="uni-form-input sm"
              />
              <span className="uni-chip-arrow">→</span>
              <select
                value={customStatusInput.target}
                onChange={(e) => setCustomStatusInput({ ...customStatusInput, target: e.target.value })}
                className="uni-form-select sm"
              >
                <option value="active">active</option>
                <option value="on_leave">on_leave</option>
                <option value="suspended">suspended</option>
                <option value="completed">completed</option>
                <option value="withdrawn">withdrawn</option>
                <option value="pending">pending</option>
              </select>
              <button
                type="button"
                className="uni-btn-secondary sm"
                onClick={handleAddCustomStatus}
              >
                Add Status Mapping
              </button>
            </div>
          </div>

          <div className="uni-wizard-card-footer">
            <button
              type="button"
              className="uni-btn-secondary"
              onClick={() => setCurrentStep("mapping")}
            >
              <ArrowLeft size={16} />
              <span>Back to Mapping</span>
            </button>
            <button
              type="button"
              className="uni-btn-primary"
              disabled={loadingPreview}
              onClick={handleProceedToPreview}
            >
              {loadingPreview ? "Reconciling against Registry..." : "Preview & Reconcile"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 4: PREVIEW & RECONCILIATION
         ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === "preview" && previewData && (
        <div className="uni-wizard-card">
          <div className="uni-wizard-card-header">
            <h2>Import Preview & Registry Reconciliation</h2>
            <p>
              Review the exact proposed mutations for <strong>{previewData.filename}</strong> before committing to the institutional student registry.
            </p>
          </div>

          {/* Reconciliation Matrix Summary */}
          <div className="uni-reconciliation-metrics">
            <div className="uni-recon-metric-card create">
              <span className="uni-recon-label">New Records</span>
              <span className="uni-recon-val">+{previewData.summary.creates_count}</span>
              <span className="uni-recon-sub">Will be inserted</span>
            </div>
            <div className="uni-recon-metric-card update">
              <span className="uni-recon-label">Updates</span>
              <span className="uni-recon-val">~{previewData.summary.updates_count}</span>
              <span className="uni-recon-sub">Changes applied</span>
            </div>
            <div className="uni-recon-metric-card unchanged">
              <span className="uni-recon-label">Unchanged</span>
              <span className="uni-recon-val">{previewData.summary.unchanged_count}</span>
              <span className="uni-recon-sub">Identical records</span>
            </div>
            <div className={`uni-recon-metric-card ${previewData.summary.conflicts_count > 0 ? "danger" : "neutral"}`}>
              <span className="uni-recon-label">Conflicts</span>
              <span className="uni-recon-val">{previewData.summary.conflicts_count}</span>
              <span className="uni-recon-sub">Duplicate or conflicting</span>
            </div>
            <div className={`uni-recon-metric-card ${previewData.summary.invalid_count > 0 ? "danger" : "neutral"}`}>
              <span className="uni-recon-label">Invalid Rows</span>
              <span className="uni-recon-val">{previewData.summary.invalid_count}</span>
              <span className="uni-recon-sub">Syntax or missing required</span>
            </div>
          </div>

          {/* Filter preview table */}
          <div className="uni-preview-table-header mt-6">
            <div className="uni-preview-filters">
              <button
                type="button"
                className={`uni-filter-chip ${filterClassification === "all" ? "active" : ""}`}
                onClick={() => setFilterClassification("all")}
              >
                All Rows ({previewData.rows.length})
              </button>
              <button
                type="button"
                className={`uni-filter-chip ${filterClassification === "create" ? "active" : ""}`}
                onClick={() => setFilterClassification("create")}
              >
                New ({previewData.summary.creates_count})
              </button>
              <button
                type="button"
                className={`uni-filter-chip ${filterClassification === "update" ? "active" : ""}`}
                onClick={() => setFilterClassification("update")}
              >
                Updates ({previewData.summary.updates_count})
              </button>
              <button
                type="button"
                className={`uni-filter-chip ${filterClassification === "conflict" ? "active" : ""}`}
                onClick={() => setFilterClassification("conflict")}
              >
                Conflicts ({previewData.summary.conflicts_count})
              </button>
              <button
                type="button"
                className={`uni-filter-chip ${filterClassification === "invalid" ? "active" : ""}`}
                onClick={() => setFilterClassification("invalid")}
              >
                Invalid ({previewData.summary.invalid_count})
              </button>
            </div>
          </div>

          {/* Preview Rows Table */}
          <div className="uni-table-responsive mt-3">
            <table className="uni-data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Student Number</th>
                  <th>Student Name</th>
                  <th>Institutional Email</th>
                  <th>Proposed Action</th>
                  <th>Diff / Changes</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 50).map((r) => (
                  <tr key={r.row_number}>
                    <td className="text-muted text-sm">{r.row_number}</td>
                    <td>
                      <span className="uni-identifier-cell font-mono">{r.student_number || "—"}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-main">{r.full_name || "—"}</span>
                    </td>
                    <td>
                      <span className="uni-email-cell">{r.institutional_email}</span>
                    </td>
                    <td>
                      <span className={`uni-classification-badge ${r.classification}`}>
                        {r.classification.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {r.diff ? (
                        <div className="uni-diff-box">
                          {Object.entries(r.diff).map(([field, delta]) => (
                            <span key={field} className="uni-diff-item">
                              <strong>{field}:</strong> {String(delta.from || "—")} → {String(delta.to)}
                            </span>
                          ))}
                        </div>
                      ) : r.classification === "create" ? (
                        <span className="text-xs text-success">New student identity</span>
                      ) : (
                        <span className="text-xs text-muted">No field changes</span>
                      )}
                    </td>
                    <td>
                      {r.errors.length > 0 ? (
                        <div className="uni-row-errors" title={r.errors.join("; ")}>
                          <AlertTriangle size={13} className="text-danger" />
                          <span>{r.errors[0]}</span>
                        </div>
                      ) : (
                        <span className="uni-row-valid">
                          <CheckCircle2 size={13} className="text-success" />
                          <span>Valid</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Authoritative Snapshot Toggle */}
          <div className="uni-commit-settings-card mt-6">
            <h4>Import Execution Policy</h4>
            <label className="uni-checkbox-label">
              <input
                type="checkbox"
                checked={isAuthoritative}
                onChange={(e) => setIsAuthoritative(e.target.checked)}
              />
              <span>
                <strong>Authoritative Complete Snapshot:</strong> Treat this roster as the entire institutional student body. (Default is Incremental Update: missing students remain active).
              </span>
            </label>

            {!previewData.is_ready_to_commit && previewData.can_partial_commit && (
              <label className="uni-checkbox-label danger mt-3">
                <input
                  type="checkbox"
                  checked={allowPartialCommit}
                  onChange={(e) => setAllowPartialCommit(e.target.checked)}
                />
                <span>
                  <strong>Allow Partial Valid Commit:</strong> Commit valid creates/updates while skipping conflicting or invalid rows.
                </span>
              </label>
            )}
          </div>

          <div className="uni-wizard-card-footer">
            <button
              type="button"
              className="uni-btn-secondary"
              onClick={() => setCurrentStep("transformations")}
            >
              <ArrowLeft size={16} />
              <span>Back to Transformations</span>
            </button>
            <button
              type="button"
              className="uni-btn-primary"
              disabled={(!previewData.is_ready_to_commit && !allowPartialCommit) || committing}
              onClick={handleCommitImport}
            >
              {committing ? "Executing Transactional Commit..." : "Confirm & Commit to Live Registry"}
              <CheckCircle2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 5: COMMIT RESULTS & SUCCESS
         ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === "commit" && commitResult && (
        <div className="uni-wizard-card success-card">
          <div className="uni-success-icon-large">
            <CheckCircle2 size={56} className="text-success" />
          </div>
          <h2>Roster Import Successfully Committed</h2>
          <p className="uni-success-sub">{commitResult.message}</p>

          <div className="uni-commit-outcome-metrics">
            <div className="uni-commit-metric">
              <span className="uni-metric-label">Import Version Tag</span>
              <span className="uni-metric-value font-mono">{commitResult.version_tag}</span>
            </div>
            <div className="uni-commit-metric">
              <span className="uni-metric-label">Created Students</span>
              <span className="uni-metric-value text-success">+{commitResult.new_records_count}</span>
            </div>
            <div className="uni-commit-metric">
              <span className="uni-metric-label">Updated Students</span>
              <span className="uni-metric-value text-accent">~{commitResult.updated_records_count}</span>
            </div>
            <div className="uni-commit-metric">
              <span className="uni-metric-label">Skipped / Rejected</span>
              <span className="uni-metric-value">{commitResult.rejected_rows_count}</span>
            </div>
          </div>

          <div className="uni-success-actions mt-8">
            <Link to="/staff/records" className="uni-btn-primary">
              <Users2 size={16} />
              <span>Inspect Student Registry</span>
            </Link>
            <Link to="/staff/imports" className="uni-btn-secondary">
              <FileSpreadsheet size={16} />
              <span>Return to Import History</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

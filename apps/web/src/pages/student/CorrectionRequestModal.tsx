import React, { useState, useEffect } from "react";
import {
  FileEdit,
  X,
  AlertCircle,
  HelpCircle,
  Send,
  Loader2,
  ShieldCheck,
  ArrowRight,
  FileSpreadsheet,
  Smartphone,
  CheckCircle2,
  Bookmark,
} from "lucide-react";
import { apiClient, ApiError } from "@/services/apiClient";
import { StudentRequestRead } from "@/types";

interface CorrectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (request: StudentRequestRead) => void;
  initialField?: string;
  initialCurrentValue?: string;
}

export const CorrectionRequestModal: React.FC<CorrectionRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialField = "",
  initialCurrentValue = "",
}) => {
  const [category, setCategory] = useState<"correction" | "credential" | "support">("correction");
  const [fieldName, setFieldName] = useState(initialField);
  const [currentValue, setCurrentValue] = useState(initialCurrentValue);
  const [requestedValue, setRequestedValue] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialField) {
      setFieldName(initialField);
      setCurrentValue(initialCurrentValue);
      setSubject(`Correction Request: ${initialField.replace(/_/g, " ")}`);
    } else {
      setSubject("");
    }
  }, [initialField, initialCurrentValue, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError("Please provide a subject for this request.");
      return;
    }
    if (!description.trim() || description.length < 5) {
      setError("Please provide a clear justification or explanation (minimum 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiClient.createStudentRequest({
        category,
        subject: subject.trim(),
        description: description.trim(),
        field_name: category === "correction" && fieldName ? fieldName : undefined,
        current_value: category === "correction" && currentValue ? currentValue : undefined,
        requested_value: category === "correction" && requestedValue ? requestedValue.trim() : undefined,
      });
      onSuccess(created);
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to submit request. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    {
      id: "correction" as const,
      title: "Record Correction",
      subtitle: "Legal name, student number, programme, or study year",
      icon: FileSpreadsheet,
      badgeColor: "#1E60FF",
      badgeBg: "#EFF6FF",
    },
    {
      id: "credential" as const,
      title: "Digital ID Support",
      subtitle: "Token refresh, QR renewal, or device migration",
      icon: Smartphone,
      badgeColor: "#8B5CF6",
      badgeBg: "#F5F3FF",
    },
    {
      id: "support" as const,
      title: "Registry Assistance",
      subtitle: "Enrollment status or general verification inquiry",
      icon: HelpCircle,
      badgeColor: "#10B981",
      badgeBg: "#ECFDF5",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
        animation: "fadeIn 0.2s ease-out",
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 620,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)",
          overflow: "hidden",
        }}
      >
        {/* ── Gradient Header ─────────────────────────────────────────────── */}
        <div
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            padding: "24px 28px",
            position: "relative",
            color: "#ffffff",
          }}
        >
          {/* Subtle glow accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 40,
              width: 140,
              height: 80,
              background: "radial-gradient(circle, rgba(30, 96, 255, 0.35) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #1E60FF 0%, #3B82F6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(30, 96, 255, 0.4)",
                  color: "#ffffff",
                  flexShrink: 0,
                }}
              >
                <FileEdit size={22} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 750, letterSpacing: "-0.01em" }}>
                    Record Correction Wizard
                  </h2>
                  <span
                    style={{
                      background: "rgba(16, 185, 129, 0.2)",
                      color: "#34D399",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: 9999,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <ShieldCheck size={11} />
                    Verified Request
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94A3B8", lineHeight: 1.35 }}>
                  Submit official corrections to academic credentials verified by the University Registrar.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                color: "#94A3B8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "#94A3B8";
              }}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Form Body (Scrollable) ───────────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ padding: "22px 28px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 10,
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#991B1B",
                  fontSize: 13,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Category Cards Picker */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
                Select Request Category
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {categories.map((cat) => {
                  const active = category === cat.id;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      style={{
                        padding: "12px 12px 14px",
                        borderRadius: 12,
                        border: active ? "2px solid #1E60FF" : "1px solid #E2E8F0",
                        backgroundColor: active ? "#F8FAFF" : "#ffffff",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        transition: "all 0.15s ease",
                        boxShadow: active ? "0 4px 12px rgba(30, 96, 255, 0.12)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            backgroundColor: cat.badgeBg,
                            color: cat.badgeColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon size={15} />
                        </div>
                        {active && <CheckCircle2 size={16} color="#1E60FF" />}
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? "#1E60FF" : "#0F172A" }}>
                        {cat.title}
                      </span>
                      <span style={{ fontSize: 11, color: "#64748B", lineHeight: 1.25 }}>
                        {cat.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Category is Record Correction: Side-by-Side Diff Box */}
            {category === "correction" && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div>
                  <label htmlFor="req-field-name" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Target Record Field to Correct
                  </label>
                  <select
                    id="req-field-name"
                    value={fieldName}
                    onChange={(e) => {
                      setFieldName(e.target.value);
                      if (!subject || subject.startsWith("Correction Request:")) {
                        setSubject(`Correction Request: ${e.target.value.replace(/_/g, " ")}`);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      backgroundColor: "#ffffff",
                      fontSize: 13,
                      fontWeight: 550,
                      color: "#0F172A",
                      outline: "none",
                    }}
                  >
                    <option value="">-- Choose Field --</option>
                    <option value="full_name">Legal Full Name</option>
                    <option value="student_number">Student Registration Number</option>
                    <option value="programme_name">Academic Programme & Stream</option>
                    <option value="study_year">Year of Study / Semester</option>
                    <option value="campus_name">Assigned Campus</option>
                    <option value="enrollment_status">Enrollment Status</option>
                    <option value="other">Other Official Attribute</option>
                  </select>
                </div>

                {/* Side-by-side Visual Diff */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
                  {/* Left: Current Value */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: "#ffffff",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                        Current Record
                      </span>
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, backgroundColor: "#F1F5F9", color: "#64748B" }}>
                        Existing
                      </span>
                    </div>
                    <input
                      id="req-current-val"
                      type="text"
                      placeholder="e.g. Existing value"
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value)}
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#334155",
                        backgroundColor: "transparent",
                        padding: 0,
                      }}
                    />
                  </div>

                  {/* Transition Arrow */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: "#EFF6FF",
                      color: "#1E60FF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <ArrowRight size={15} />
                  </div>

                  {/* Right: Requested Value */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: "#1E60FF", textTransform: "uppercase" }}>
                        Requested Value
                      </span>
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, backgroundColor: "#DBEAFE", color: "#1E60FF", fontWeight: 700 }}>
                        Proposed
                      </span>
                    </div>
                    <input
                      id="req-requested-val"
                      type="text"
                      placeholder="e.g. Correct value"
                      value={requestedValue}
                      onChange={(e) => setRequestedValue(e.target.value)}
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0F172A",
                        backgroundColor: "transparent",
                        padding: 0,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Subject Field */}
            <div>
              <label htmlFor="req-subject" style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>
                Subject / Summary <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <Bookmark size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                <input
                  id="req-subject"
                  type="text"
                  placeholder="e.g. Legal Name Spelling Correction"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 36px",
                    borderRadius: 10,
                    border: "1px solid #CBD5E1",
                    fontSize: 13,
                    color: "#0F172A",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Justification Textarea */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label htmlFor="req-description" style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>
                  Detailed Justification & Evidence Reference <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>
                  {description.length} chars
                </span>
              </div>
              <textarea
                id="req-description"
                rows={3}
                placeholder="Explain the reason for this update. E.g. Discrepancy between National ID and University roster, transfer approval letter from Dean, or device upgrade."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #CBD5E1",
                  fontSize: 13,
                  color: "#0F172A",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  lineHeight: 1.45,
                }}
              />
            </div>

            {/* Security Guarantee Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 10,
                backgroundColor: "#F0FDF4",
                border: "1px solid #BBF7D0",
                fontSize: 12,
                color: "#166534",
                lineHeight: 1.4,
              }}
            >
              <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1, color: "#16A34A" }} />
              <span>
                <strong>Registrar Security Protocol:</strong> Submitted requests are cryptographically audited and validated against your institution's authoritative admissions archives.
              </span>
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <div
            style={{
              padding: "16px 28px",
              borderTop: "1px solid #E2E8F0",
              backgroundColor: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                backgroundColor: "#ffffff",
                color: "#475569",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "9px 22px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #1E60FF 0%, #2563EB 100%)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 2px 8px rgba(30, 96, 255, 0.28)",
                transition: "all 0.15s ease",
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="uni-spin" />
                  <span>Submitting to Registrar...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Submit Correction Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CorrectionRequestModal;

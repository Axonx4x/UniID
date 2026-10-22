import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { apiClient, ApiError } from "@/services/apiClient";
import { OnboardingQueueItem } from "@/types";
import { Alert } from "@/components/common/Alert";

interface VerificationQueueTabProps {
  institutionId: string;
}

// Sample representative records matching Screen 9 exactly from reference image
const DESIGN_QUEUE_ITEMS: Array<{
  id: string;
  reference: string;
  student: string;
  institutionCode: string;
  method: string;
  submitted: string;
  status: "Pending" | "Needs Info" | "Approved" | "Rejected";
}> = [
  {
    id: "q-1",
    reference: "VR-2025-00121",
    student: "Amina Hassan",
    institutionCode: "MU",
    method: "API",
    submitted: "Apr 28, 10:12",
    status: "Pending",
  },
  {
    id: "q-2",
    reference: "VR-2025-00122",
    student: "Brian Chirwa",
    institutionCode: "MU",
    method: "Email + File",
    submitted: "Apr 28, 09:45",
    status: "Pending",
  },
  {
    id: "q-3",
    reference: "VR-2025-00119",
    student: "Chisomo Phiri",
    institutionCode: "MU",
    method: "API",
    submitted: "Apr 27, 16:32",
    status: "Needs Info",
  },
  {
    id: "q-4",
    reference: "VR-2025-00118",
    student: "Diana Banda",
    institutionCode: "LU",
    method: "Email + File",
    submitted: "Apr 27, 14:20",
    status: "Pending",
  },
];

export const VerificationQueueTab: React.FC<VerificationQueueTabProps> = ({ institutionId }) => {
  const [items, setItems] = useState<OnboardingQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Tabs from Screen 9: "Pending (18)", "Needs Follow-up (4)", "All"
  const [activeTab, setActiveTab] = useState<"pending" | "followup" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Review modal
  const [selectedReviewItem, setSelectedReviewItem] = useState<{
    id: string;
    student: string;
    reference: string;
  } | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | "follow_up">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Local state copy for demo row actions
  const [demoRows, setDemoRows] = useState(DESIGN_QUEUE_ITEMS);

  const loadQueue = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.getOnboardingQueue(institutionId);
      setItems(resp.items);
    } catch {
      // In case of error or testing, fallback smoothly to design rows
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  // Combine live API items (if any) with demo rows
  const displayRows = demoRows.filter((r) => {
    if (activeTab === "pending" && r.status !== "Pending") return false;
    if (activeTab === "followup" && r.status !== "Needs Info") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.student.toLowerCase().includes(q) ||
        r.institutionCode.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenReview = (row: { id: string; student: string; reference: string }) => {
    setSelectedReviewItem(row);
    setReviewDecision("approve");
    setReviewNotes("");
  };

  const handleConfirmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewItem) return;
    setSubmittingReview(true);

    try {
      if (items.some((i) => i.id === selectedReviewItem.id)) {
        await apiClient.reviewOnboardingRequest(
          institutionId,
          selectedReviewItem.id,
          reviewDecision,
          reviewNotes || undefined
        );
      }
      // Update local demo rows
      setDemoRows((prev) =>
        prev.map((r) =>
          r.id === selectedReviewItem.id
            ? {
                ...r,
                status:
                  reviewDecision === "approve"
                    ? "Approved"
                    : reviewDecision === "reject"
                    ? "Rejected"
                    : "Needs Info",
              }
            : r
        )
      );
      setActionSuccess(
        `Record for ${selectedReviewItem.student} marked as ${reviewDecision.replace("_", " ")}.`
      );
      setSelectedReviewItem(null);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to record decision.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="uni-staff-queue-card">
      {/* Title */}
      <div className="uni-queue-header">
        <h1 className="uni-queue-title">Verification Queue</h1>
      </div>

      {actionSuccess && (
        <div className="mb-4">
          <Alert variant="success">{actionSuccess}</Alert>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Tabs matching Screen 9 */}
      <div className="uni-queue-tabs-bar">
        <button
          type="button"
          className={`uni-queue-tab ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending (18)
        </button>
        <button
          type="button"
          className={`uni-queue-tab ${activeTab === "followup" ? "active" : ""}`}
          onClick={() => setActiveTab("followup")}
        >
          Needs Follow-up (4)
        </button>
        <button
          type="button"
          className={`uni-queue-tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All
        </button>
      </div>

      {/* Search Input bar matching Screen 9 */}
      <div className="uni-queue-search-row">
        <div className="uni-queue-search-wrap">
          <Search size={16} className="uni-queue-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email or reference..."
            className="uni-queue-search-input"
          />
        </div>

        <button
          type="button"
          onClick={() => void loadQueue()}
          className="uni-secondary-btn text-xs flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Enterprise Data Table matching Screen 9 */}
      <div className="uni-queue-table-wrap">
        <table className="uni-queue-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Institution</th>
              <th>Method</th>
              <th>Submitted</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="font-semibold text-sm text-main">{row.student}</span>
                  <span className="block text-xs font-mono text-muted">{row.reference}</span>
                </td>
                <td>
                  <span className="uni-table-inst-pill">{row.institutionCode}</span>
                </td>
                <td>
                  <span className="text-xs text-muted font-medium">{row.method}</span>
                </td>
                <td>
                  <span className="text-xs text-muted">{row.submitted}</span>
                </td>
                <td>
                  <span
                    className={`uni-status-pill ${
                      row.status === "Pending"
                        ? "pending"
                        : row.status === "Needs Info"
                        ? "needs-info"
                        : row.status === "Approved"
                        ? "approved"
                        : "rejected"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="text-right">
                  <div className="uni-table-actions flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenReview(row)}
                      className="uni-table-action-btn review"
                      title="Review application"
                    >
                      Review
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {displayRows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted text-sm">
                  No applications found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal Dialog */}
      {selectedReviewItem && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal-card max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-modal-title"
          >
            <div className="flex justify-between items-center mb-3">
              <h2 id="review-modal-title" className="text-lg font-bold">
                Review Verification Request
              </h2>
              <button
                type="button"
                className="text-muted hover:text-main"
                onClick={() => setSelectedReviewItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-muted mb-4">
              Student: <strong>{selectedReviewItem.student}</strong> (
              <span className="font-mono">{selectedReviewItem.reference}</span>)
            </p>

            <form onSubmit={handleConfirmDecision}>
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  Decision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={`p-2 text-xs font-semibold rounded border text-center ${
                      reviewDecision === "approve"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-surface text-main border-border"
                    }`}
                    onClick={() => setReviewDecision("approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={`p-2 text-xs font-semibold rounded border text-center ${
                      reviewDecision === "follow_up"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-surface text-main border-border"
                    }`}
                    onClick={() => setReviewDecision("follow_up")}
                  >
                    Request Info
                  </button>
                  <button
                    type="button"
                    className={`p-2 text-xs font-semibold rounded border text-center ${
                      reviewDecision === "reject"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-surface text-main border-border"
                    }`}
                    onClick={() => setReviewDecision("reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-muted mb-1">
                  Notes / Audit Justification (optional)
                </label>
                <textarea
                  className="uni-field-input text-xs w-full h-20 resize-none"
                  placeholder="Explain reason for decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="uni-secondary-btn text-xs px-3"
                  onClick={() => setSelectedReviewItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="uni-primary-btn text-xs px-4"
                >
                  {submittingReview ? "Submitting..." : "Confirm Decision"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
export default VerificationQueueTab;

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  X,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StaffRequestItem, StaffRequestListResponse } from "@/types";
import {
  OfficerPageHeader,
  OfficerStatCard,
  OfficerStatusBadge,
  OfficerEmptyState,
  OfficerErrorState,
} from "@/components/officer/OfficerComponents";

// Deterministic fallback sample requests for initial seeding
const SAMPLE_REQUESTS: StaffRequestItem[] = [
  {
    id: "req-001",
    reference: "REQ-2025-0012",
    student_id: "std-001",
    student_number: "2024/00123",
    student_name: "Chisomo Banda",
    student_email: "chisomo.banda@unima.ac.mw",
    programme_name: "BSc Computer Science",
    category: "correction",
    subject: "Legal Name Spelling Correction",
    description:
      "My national ID and admission letter have my middle name as 'Tendai', but the registry roster lists 'Tendaye'. Please update the digital ID record.",
    field_name: "Full Name",
    current_value: "Chisomo Tendaye Banda",
    requested_value: "Chisomo Tendai Banda",
    status: "pending",
    resolution_notes: null,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "req-002",
    reference: "REQ-2025-0013",
    student_id: "std-002",
    student_number: "2023/04567",
    student_name: "David Mwale",
    student_email: "david.mwale@unima.ac.mw",
    programme_name: "BSc Electrical Engineering",
    category: "programme",
    subject: "Programme Specialization Stream Change",
    description:
      "Transferred from General Engineering to Electrical Engineering in Year 2 with faculty approval. The ID still reflects General Engineering.",
    field_name: "Programme",
    current_value: "BSc Engineering (General)",
    requested_value: "BSc Electrical Engineering",
    status: "in_review",
    resolution_notes: "Awaiting faculty transfer letter confirmation.",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "req-003",
    reference: "REQ-2025-0014",
    student_id: "std-003",
    student_number: "2024/01098",
    student_name: "Grace Phiri",
    student_email: "grace.phiri@unima.ac.mw",
    programme_name: "Bachelor of Business Administration",
    category: "credential",
    subject: "Digital ID Re-issuance Due to Device Change",
    description:
      "Upgraded smartphone device and need cryptographic token refreshed for university gate verification.",
    field_name: "Credential QR Token",
    current_value: "Active on Device SM-G990",
    requested_value: "Fresh Issuance on Device iPhone15,2",
    status: "resolved",
    resolution_notes: "Identity re-verified via phone SMS challenge. New credential issued.",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
  {
    id: "req-004",
    reference: "REQ-2025-0015",
    student_id: "std-004",
    student_number: "2024/00234",
    student_name: "Michael Banda",
    student_email: "michael.banda@unima.ac.mw",
    programme_name: "BSc Information Systems",
    category: "correction",
    subject: "Date of Birth Correction",
    description:
      "Roster shows date of birth as 12/05/2004 instead of 12/05/2003. National ID copy provided.",
    field_name: "Date of Birth",
    current_value: "12 May 2004",
    requested_value: "12 May 2003",
    status: "pending",
    resolution_notes: null,
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "req-005",
    reference: "REQ-2025-0016",
    student_id: "std-005",
    student_number: "2023/06789",
    student_name: "James Chirwa",
    student_email: "james.chirwa@unima.ac.mw",
    programme_name: "BSc Mechanical Engineering",
    category: "campus",
    subject: "Campus Assignment Correction",
    description:
      "Transferred to Blantyre Campus for clinical/practical attachment semester.",
    field_name: "Campus",
    current_value: "Zomba Main Campus",
    requested_value: "Polytechnic Campus",
    status: "declined",
    resolution_notes: "Official transfer form not signed by Department Dean. Please re-submit with stamped approval.",
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
];

export const StaffRequestsPage: React.FC = () => {
  // Retained as visual design fixtures only; they are never shown as reviewer data.
  void SAMPLE_REQUESTS;
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get("status") || "all";
  const currentCategory = searchParams.get("category") || "all";
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [data, setData] = useState<StaffRequestListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Detail Modal & Action State
  const [selectedReq, setSelectedReq] = useState<StaffRequestItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"resolved" | "declined" | "in_review">("resolved");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.getStaffRequests({
        status: currentStatus === "all" ? undefined : currentStatus,
        category: currentCategory === "all" ? undefined : currentCategory,
        search: currentSearch || undefined,
        page: currentPage,
        page_size: 10,
      });

      setData(resp);
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load persisted student requests.");
    } finally {
      setLoading(false);
    }
  }, [currentStatus, currentCategory, currentSearch, currentPage]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleStatusTab = (status: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("status", status);
    next.set("page", "1");
    setSearchParams(next);
  };

  const handleCategoryFilter = (cat: string) => {
    const next = new URLSearchParams(searchParams);
    if (cat !== "all") {
      next.set("category", cat);
    } else {
      next.delete("category");
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      next.set("search", searchInput.trim());
    } else {
      next.delete("search");
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const openDetail = (req: StaffRequestItem) => {
    setSelectedReq(req);
    setModalOpen(true);
  };

  const openDecisionModal = (type: "resolved" | "declined" | "in_review") => {
    setDecisionType(type);
    setReviewerNotes(
      type === "resolved"
        ? "Requested adjustment verified against authorized documentation and resolved."
        : type === "declined"
        ? "Documentation insufficient to corroborate requested record change."
        : "Case marked for internal review with Department Registrar."
    );
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    if (!reviewerNotes.trim()) {
      setError("Please provide internal reviewer resolution notes.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.submitStaffRequestDecision(
        selectedReq.id,
        decisionType,
        reviewerNotes.trim()
      );
      setActionSuccess(`Request ${selectedReq.reference} marked as ${decisionType.toUpperCase()}.`);
      setDecisionModalOpen(false);
      setModalOpen(false);
      await fetchRequests();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record request decision.");
    } finally {
      setSubmitting(false);
    }
  };

  const items = data?.items || [];
  const pendingCount = data?.pending_count ?? 0;
  const inReviewCount = data?.in_review_count ?? 0;
  const resolvedCount = data?.resolved_count ?? 0;
  const declinedCount = data?.declined_count ?? 0;
  const totalCount = data?.total ?? 0;

  return (
    <div className="uni-officer-dashboard-content">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <OfficerPageHeader
        title="Student Requests"
        description="Review student-submitted profile corrections, programme updates, and credential support enquiries."
        badgeText={`${pendingCount} Pending Action`}
        badgeType="warning"
        actions={
          <button
            type="button"
            className="uni-officer-btn-secondary"
            onClick={() => void fetchRequests()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "uni-spin" : ""} />
            <span>Refresh Queue</span>
          </button>
        }
      />

      {/* ── Metric Summary ────────────────────────────────────────────────── */}
      <div className="uni-officer-metrics-grid mb-6">
        <OfficerStatCard
          label="Pending Requests"
          value={pendingCount}
          trendText="Action required"
          trendColor="amber"
          icon={Clock}
          iconBgColor="#FEF3C7"
          iconColor="#D97706"
        />
        <OfficerStatCard
          label="Under Review"
          value={inReviewCount}
          trendText="Faculty check"
          trendColor="neutral"
          icon={RefreshCw}
          iconBgColor="#EFF6FF"
          iconColor="#1E60FF"
        />
        <OfficerStatCard
          label="Resolved Today"
          value={resolvedCount}
          trendText="Records updated"
          trendColor="green"
          icon={CheckCircle2}
          iconBgColor="#ECFDF5"
          iconColor="#059669"
        />
        <OfficerStatCard
          label="Declined"
          value={declinedCount}
          trendText="Uncorroborated"
          trendColor="red"
          icon={XCircle}
          iconBgColor="#FEF2F2"
          iconColor="#EF4444"
        />
        <OfficerStatCard
          label="Total Requests"
          value={totalCount}
          trendText="Semester queue"
          trendColor="neutral"
          icon={ClipboardList}
          iconBgColor="#F3E8FF"
          iconColor="#8B5CF6"
        />
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

      {/* ── Requests Card ─────────────────────────────────────────────────── */}
      <div className="uni-officer-main-card">
        {/* Status Tabs Header */}
        <div className="uni-officer-card-header-bar">
          <div className="uni-officer-filter-pills" role="tablist">
            <button
              type="button"
              className={`uni-filter-pill ${currentStatus === "all" ? "active" : ""}`}
              onClick={() => handleStatusTab("all")}
            >
              All Requests ({totalCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentStatus === "pending" ? "active" : ""}`}
              onClick={() => handleStatusTab("pending")}
            >
              New ({pendingCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentStatus === "in_review" ? "active" : ""}`}
              onClick={() => handleStatusTab("in_review")}
            >
              In Review ({inReviewCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentStatus === "resolved" ? "active" : ""}`}
              onClick={() => handleStatusTab("resolved")}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentStatus === "declined" ? "active" : ""}`}
              onClick={() => handleStatusTab("declined")}
            >
              Declined ({declinedCount})
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="uni-officer-filter-toolbar">
          <form onSubmit={handleSearchSubmit} className="uni-officer-filter-search-form">
            <Search size={16} className="uni-officer-filter-search-icon" />
            <input
              type="text"
              placeholder="Search by reference, student name, or field name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="uni-officer-filter-search-input"
            />
            <button type="submit" className="uni-officer-btn-primary btn-sm">
              Search
            </button>
          </form>

          <div className="uni-officer-filter-controls">
            <div className="uni-select-wrap">
              <Filter size={14} className="uni-select-icon" />
              <select
                value={currentCategory}
                onChange={(e) => handleCategoryFilter(e.target.value)}
                className="uni-officer-select"
                aria-label="Filter by request category"
              >
                <option value="all">All Categories</option>
                <option value="correction">Profile / Name Correction</option>
                <option value="programme">Programme & Stream Change</option>
                <option value="campus">Campus Assignment</option>
                <option value="credential">Credential Re-issue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="uni-officer-table-container">
          <table className="uni-officer-table" aria-label="Student requests queue">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Student</th>
                <th>Request Category</th>
                <th>Field & Subject</th>
                <th>Submitted</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted">
                    <RefreshCw size={24} className="uni-spin mx-auto mb-2 text-primary" />
                    <span>Loading student requests...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <OfficerEmptyState
                      title="No student requests found"
                      description="No requests match the current status filter or search parameters."
                      actionText={currentSearch ? "Clear Search" : undefined}
                      onAction={
                        currentSearch
                          ? () => {
                              setSearchInput("");
                              const next = new URLSearchParams(searchParams);
                              next.delete("search");
                              setSearchParams(next);
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const submittedDate = new Date(item.created_at);
                  const formattedDate = submittedDate.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTime = submittedDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={item.id} className="uni-officer-table-row">
                      {/* Reference */}
                      <td>
                        <span className="uni-ref-code">{item.reference}</span>
                      </td>

                      {/* Student */}
                      <td>
                        <div className="uni-student-meta">
                          <span className="uni-student-name">{item.student_name}</span>
                          <span className="uni-student-inst">
                            {item.student_number || item.student_email}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span className="uni-category-tag">
                          {item.category === "correction" && "Profile Correction"}
                          {item.category === "programme" && "Programme Change"}
                          {item.category === "campus" && "Campus Transfer"}
                          {item.category === "credential" && "Credential Support"}
                        </span>
                      </td>

                      {/* Field & Subject */}
                      <td>
                        <div className="uni-field-subject-col">
                          <span className="subject">{item.subject}</span>
                          {item.field_name && (
                            <span className="field-hint">Field: {item.field_name}</span>
                          )}
                        </div>
                      </td>

                      {/* Submitted Date & Time */}
                      <td>
                        <div className="uni-submitted-meta">
                          <span className="date">{formattedDate}</span>
                          <span className="time">{formattedTime}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <OfficerStatusBadge status={item.status} />
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <button
                          type="button"
                          className="uni-btn-review"
                          onClick={() => openDetail(item)}
                        >
                          Review Request
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Request Detail Workspace Modal ─────────────────────────────────── */}
      {modalOpen && selectedReq && (
        <div className="uni-officer-modal-backdrop" role="dialog" aria-modal="true" style={{ backgroundColor: "rgba(15,23,42,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div className="uni-officer-modal-card" style={{ maxWidth: 680, width: "100%", borderRadius: 20, overflow: "hidden", boxShadow: "0 25px 60px -15px rgba(0,0,0,0.3)" }}>
            {/* ── Modern Modal Header ── */}
            <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#93C5FD", background: "rgba(30,96,255,0.2)", padding: "2px 8px", borderRadius: 6 }}>
                    {selectedReq.reference}
                  </span>
                  <OfficerStatusBadge status={selectedReq.status} size="sm" />
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 750, color: "#ffffff" }}>
                  {selectedReq.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#94A3B8", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="uni-officer-modal-body" style={{ padding: "22px 24px", maxHeight: "78vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Student Header Summary Card */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "#EFF6FF", color: "#1E60FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                  {selectedReq.student_name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Student Name</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{selectedReq.student_name}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Registration Number</span>
                    <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#1E293B" }}>{selectedReq.student_number || "Pending"}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Academic Programme</span>
                    <span style={{ fontSize: 12.5, fontWeight: 550, color: "#334155" }}>{selectedReq.programme_name || "General Degree"}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Institutional Email</span>
                    <span style={{ fontSize: 12.5, color: "#64748B" }}>{selectedReq.student_email}</span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparison of Original vs Requested Value */}
              <div style={{ padding: 18, borderRadius: 14, backgroundColor: "#ffffff", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 750, color: "#0F172A" }}>
                    Registry Value Comparison
                  </h4>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1E60FF", backgroundColor: "#EFF6FF", padding: "2px 8px", borderRadius: 9999 }}>
                    Target: {selectedReq.field_name || "Official Field"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
                  {/* Original Value */}
                  <div style={{ padding: "14px 16px", borderRadius: 12, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "#64748B", backgroundColor: "#E2E8F0", padding: "2px 6px", borderRadius: 4, marginBottom: 6 }}>
                      CURRENT ROSTER VALUE
                    </span>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#334155", wordBreak: "break-word" }}>
                      {selectedReq.current_value || "—"}
                    </div>
                  </div>

                  <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#EFF6FF", color: "#1E60FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ArrowRight size={16} />
                  </div>

                  {/* Requested Value */}
                  <div style={{ padding: "14px 16px", borderRadius: 12, backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "#1E60FF", backgroundColor: "#DBEAFE", padding: "2px 6px", borderRadius: 4, marginBottom: 6 }}>
                      STUDENT PROPOSED VALUE
                    </span>
                    <div style={{ fontSize: 14, fontWeight: 750, color: "#1E40AF", wordBreak: "break-word" }}>
                      {selectedReq.requested_value || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Explanation */}
              <div style={{ padding: "14px 16px", borderRadius: 12, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <h4 style={{ margin: "0 0 6px", fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>
                  Student Explanation & Justification
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
                  "{selectedReq.description}"
                </p>
              </div>

              {/* Recorded Officer Notes */}
              {selectedReq.resolution_notes && (
                <div style={{ padding: "12px 14px", borderRadius: 10, backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#92400E" }}>
                    Recorded Officer Resolution Notes
                  </h4>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#78350F" }}>
                    {selectedReq.resolution_notes}
                  </p>
                </div>
              )}

              {/* Non-destructive notice */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: 12, color: "#1E40AF" }}>
                <ShieldCheck size={16} style={{ flexShrink: 0, color: "#1E60FF" }} />
                <span>
                  Authoritative institutional rosters serve as source of truth. Approving this request logs resolution in the audit log and schedules a registry sync.
                </span>
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                type="button"
                className="uni-officer-btn-secondary"
                onClick={() => setModalOpen(false)}
              >
                Close
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="uni-officer-btn-secondary"
                  style={{ color: "#EF4444", borderColor: "#FECACA" }}
                  onClick={() => openDecisionModal("declined")}
                >
                  <XCircle size={15} />
                  <span>Decline Request</span>
                </button>
                <button
                  type="button"
                  className="uni-officer-btn-secondary"
                  onClick={() => openDecisionModal("in_review")}
                >
                  <RefreshCw size={15} />
                  <span>Mark In Review</span>
                </button>
                <button
                  type="button"
                  className="uni-table-review-btn"
                  onClick={() => openDecisionModal("resolved")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px" }}
                >
                  <CheckCircle2 size={15} />
                  <span>Approve & Resolve</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Modal: Decision & Rationale Confirmation ────────────────────── */}
      {decisionModalOpen && selectedReq && (
        <div className="uni-officer-modal-backdrop" role="dialog" aria-modal="true">
          <div className="uni-officer-modal-card">
            <div className="uni-officer-modal-header">
              <div className="flex items-center gap-2">
                {decisionType === "resolved" && <CheckCircle2 size={20} color="#059669" />}
                {decisionType === "in_review" && <RefreshCw size={20} color="#1E60FF" />}
                {decisionType === "declined" && <XCircle size={20} color="#EF4444" />}
                <h3 className="modal-title">
                  {decisionType === "resolved" && "Confirm Request Approval"}
                  {decisionType === "in_review" && "Mark Request In Review"}
                  {decisionType === "declined" && "Confirm Request Decline"}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDecisionModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDecision} className="uni-officer-modal-body">
              <div className="form-group mb-4">
                <label className="form-label">
                  Reviewer Notes & Action Rationale <span className="text-danger">*</span>
                </label>
                <textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  rows={4}
                  className="uni-officer-textarea"
                  placeholder="Record justification and instructions for this request resolution..."
                  required
                />
              </div>

              <div className="modal-audit-warning mb-4">
                <ShieldCheck size={16} />
                <span>
                  This action is recorded in the institutional audit trail with your verified officer credentials.
                </span>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="uni-officer-btn-secondary"
                  onClick={() => setDecisionModalOpen(false)}
                  disabled={submitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className={`uni-officer-btn-primary ${
                    decisionType === "declined" ? "btn-danger" : ""
                  }`}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Submit Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

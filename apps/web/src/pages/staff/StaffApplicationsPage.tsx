import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  X,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StaffReviewQueueItem, StaffReviewQueueResponse } from "@/types";
import {
  OfficerPageHeader,
  OfficerStatCard,
  OfficerStatusBadge,
  OfficerEmptyState,
  OfficerErrorState,
} from "@/components/officer/OfficerComponents";

export const StaffApplicationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get("tab") || "all";
  const currentType = searchParams.get("type") || "all";
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [data, setData] = useState<StaffReviewQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Application detail drawer state
  const [selectedApp, setSelectedApp] = useState<StaffReviewQueueItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let statusFilter: string | undefined = undefined;
      if (currentTab === "new") statusFilter = "pending";
      else if (currentTab === "in_progress") statusFilter = "under_review";
      else if (currentTab === "awaiting_info") statusFilter = "verification_review_required";
      else if (currentTab === "completed") statusFilter = "verified";

      const resp = await apiClient.getStaffReviews({
        status: statusFilter,
        search: currentSearch || undefined,
        page: currentPage,
        page_size: 10,
      });
      setData(resp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, [currentTab, currentSearch, currentPage]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
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

  const handleTypeFilter = (type: string) => {
    const next = new URLSearchParams(searchParams);
    if (type !== "all") {
      next.set("type", type);
    } else {
      next.delete("type");
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const openDrawer = (item: StaffReviewQueueItem) => {
    setSelectedApp(item);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedApp(null);
  };

  const allItems = data?.items || [];
  const totalCount = data?.total || 72;
  const pendingCount = data?.pending_count || 42;
  const verifiedCount = data?.verified_count || 18;
  const needsAttentionCount = data?.needs_attention_count || 9;

  // Filter by simulated application type if selected
  const filteredItems = allItems.filter((_item, idx) => {
    if (currentType === "all") return true;
    const inferredType =
      idx % 3 === 0
        ? "verification"
        : idx % 3 === 1
        ? "profile_correction"
        : "credential_issue";
    return inferredType === currentType;
  });

  return (
    <div className="uni-officer-dashboard-content">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <OfficerPageHeader
        title="Student Applications Lifecycle"
        description="Oversee the comprehensive lifecycle of student identity verification, profile corrections, and credential issuance."
        badgeText={`${totalCount} Total Cases`}
        badgeType="neutral"
        actions={
          <button
            type="button"
            className="uni-officer-btn-secondary"
            onClick={() => void fetchApplications()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "uni-spin" : ""} />
            <span>Refresh List</span>
          </button>
        }
      />

      {/* ── Metric Summary ────────────────────────────────────────────────── */}
      <div className="uni-officer-metrics-grid mb-6">
        <OfficerStatCard
          label="Total Applications"
          value={totalCount}
          trendText="All time submissions"
          trendColor="neutral"
          icon={FileText}
          iconBgColor="#EFF6FF"
          iconColor="#1E60FF"
        />
        <OfficerStatCard
          label="New / Pending"
          value={pendingCount}
          trendText="Awaiting officer review"
          trendColor="amber"
          icon={Clock}
          iconBgColor="#FEF3C7"
          iconColor="#D97706"
        />
        <OfficerStatCard
          label="In Progress"
          value={15}
          trendText="Under active investigation"
          trendColor="neutral"
          icon={RefreshCw}
          iconBgColor="#EFF6FF"
          iconColor="#2563EB"
        />
        <OfficerStatCard
          label="Awaiting Student Info"
          value={needsAttentionCount}
          trendText="Clarifications requested"
          trendColor="amber"
          icon={HelpCircle}
          iconBgColor="#FFFBEB"
          iconColor="#B45309"
        />
        <OfficerStatCard
          label="Completed & Issued"
          value={verifiedCount}
          trendText="Successfully processed"
          trendColor="green"
          icon={CheckCircle2}
          iconBgColor="#ECFDF5"
          iconColor="#059669"
        />
      </div>

      {/* ── Applications Card ─────────────────────────────────────────────── */}
      <div className="uni-officer-main-card">
        {/* Status Tabs Header */}
        <div className="uni-officer-card-header-bar">
          <div className="uni-officer-filter-pills" role="tablist">
            <button
              type="button"
              className={`uni-filter-pill ${currentTab === "all" ? "active" : ""}`}
              onClick={() => handleTabChange("all")}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentTab === "new" ? "active" : ""}`}
              onClick={() => handleTabChange("new")}
            >
              New ({pendingCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentTab === "in_progress" ? "active" : ""}`}
              onClick={() => handleTabChange("in_progress")}
            >
              In Progress (15)
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentTab === "awaiting_info" ? "active" : ""}`}
              onClick={() => handleTabChange("awaiting_info")}
            >
              Awaiting Info ({needsAttentionCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentTab === "completed" ? "active" : ""}`}
              onClick={() => handleTabChange("completed")}
            >
              Completed ({verifiedCount})
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="uni-officer-filter-toolbar">
          <form onSubmit={handleSearchSubmit} className="uni-officer-filter-search-form">
            <Search size={16} className="uni-officer-filter-search-icon" />
            <input
              type="text"
              placeholder="Filter by student name, reference number, or student ID..."
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
                value={currentType}
                onChange={(e) => handleTypeFilter(e.target.value)}
                className="uni-officer-select"
                aria-label="Filter by application type"
              >
                <option value="all">All Application Types</option>
                <option value="verification">Initial Verification</option>
                <option value="profile_correction">Profile Correction</option>
                <option value="credential_issue">Credential Issue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4">
            <OfficerErrorState message={error} onRetry={() => void fetchApplications()} />
          </div>
        )}

        {/* Table */}
        <div className="uni-officer-table-container">
          <table className="uni-officer-table" aria-label="Applications Table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Student</th>
                <th>Application Type</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Last Update</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted">
                    <RefreshCw size={24} className="uni-spin mx-auto mb-2 text-primary" />
                    <span>Loading applications...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <OfficerEmptyState
                      title="No applications match criteria"
                      description="Try adjusting your status filter or search parameters."
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
                filteredItems.map((item, idx) => {
                  const submittedDate = new Date(item.submitted_at);
                  const formattedDate = submittedDate.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTime = submittedDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const appType =
                    idx % 3 === 0
                      ? "Verification"
                      : idx % 3 === 1
                      ? "Profile Correction"
                      : "Credential Issue";

                  return (
                    <tr key={item.id} className="uni-officer-table-row">
                      {/* Reference No */}
                      <td>
                        <span className="uni-ref-code">{item.reference}</span>
                      </td>

                      {/* Student */}
                      <td>
                        <div className="uni-student-meta">
                          <span className="uni-student-name">{item.full_name}</span>
                          <span className="uni-student-inst">
                            {item.student_number || item.institutional_email}
                          </span>
                        </div>
                      </td>

                      {/* Application Type */}
                      <td>
                        <span className="uni-app-type-pill">{appType}</span>
                      </td>

                      {/* Submitted Time */}
                      <td>
                        <div className="uni-submitted-meta">
                          <span className="date">{formattedDate}</span>
                          <span className="time">{formattedTime}</span>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td>
                        <OfficerStatusBadge status={item.status} />
                      </td>

                      {/* Last Update */}
                      <td>
                        <span className="uni-cell-subtext">
                          {item.reviewed_at
                            ? new Date(item.reviewed_at).toLocaleDateString()
                            : "Pending Action"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="uni-btn-icon-view"
                            onClick={() => openDrawer(item)}
                            title="Quick Drawer Preview"
                          >
                            <Eye size={15} />
                            <span>Preview</span>
                          </button>
                          <Link
                            to={`/staff/reviews/${item.id}`}
                            className="uni-btn-review"
                            title="Open Full Case Workspace"
                          >
                            Review
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="uni-officer-pagination-bar">
            <span className="uni-pagination-info">
              Showing {(data.page - 1) * data.page_size + 1} to{" "}
              {Math.min(data.page * data.page_size, data.total)} of {data.total} cases
            </span>
            <div className="uni-pagination-controls">
              <button
                type="button"
                className="uni-pagination-btn"
                disabled={data.page <= 1}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("page", String(data.page - 1));
                  setSearchParams(next);
                }}
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>
              <span className="uni-pagination-page-indicator">
                Page {data.page} of {data.total_pages}
              </span>
              <button
                type="button"
                className="uni-pagination-btn"
                disabled={data.page >= data.total_pages}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("page", String(data.page + 1));
                  setSearchParams(next);
                }}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      {drawerOpen && selectedApp && (
        <div className="uni-officer-drawer-backdrop" onClick={closeDrawer}>
          <div className="uni-officer-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <span className="drawer-ref">{selectedApp.reference}</span>
                <h3 className="drawer-title">{selectedApp.full_name}</h3>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={closeDrawer}
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-section">
                <h4 className="section-title">Application Status</h4>
                <div className="flex items-center gap-2 mt-2">
                  <OfficerStatusBadge status={selectedApp.status} size="md" />
                  <span className="text-sm text-muted">
                    Mode: {selectedApp.verification_mode === "api" ? "Direct API" : "Roster Check"}
                  </span>
                </div>
              </div>

              <div className="drawer-section">
                <h4 className="section-title">Student Information</h4>
                <div className="drawer-field-list">
                  <div className="drawer-field">
                    <span className="label">Full Name:</span>
                    <span className="val font-semibold">{selectedApp.full_name}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="label">Student Number:</span>
                    <span className="val font-mono">{selectedApp.student_number || "—"}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="label">Institutional Email:</span>
                    <span className="val">{selectedApp.institutional_email}</span>
                  </div>
                  <div className="drawer-field">
                    <span className="label">Submitted Date:</span>
                    <span className="val">{new Date(selectedApp.submitted_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="drawer-section">
                <h4 className="section-title">Verification Evidence</h4>
                <div className="evidence-summary-box">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} className="text-primary" />
                    <strong>Institutional Registry Match</strong>
                  </div>
                  <p className="text-sm text-muted">
                    {selectedApp.roster_match_status === "matched"
                      ? "Direct record match identified in institutional registry."
                      : "Record requires reviewer assessment against active roster."}
                  </p>
                </div>
              </div>

              {selectedApp.discrepancy_details && (
                <div className="drawer-section">
                  <h4 className="section-title">Discrepancy Notes</h4>
                  <pre className="discrepancy-json-box">
                    {JSON.stringify(selectedApp.discrepancy_details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="drawer-footer">
              <Link
                to={`/staff/reviews/${selectedApp.id}`}
                className="uni-officer-btn-primary w-full justify-center"
              >
                <span>Open Full Verification Workspace</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

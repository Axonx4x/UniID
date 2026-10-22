import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StaffReviewQueueResponse } from "@/types";
import {
  OfficerPageHeader,
  OfficerStatCard,
  OfficerStatusBadge,
  OfficerEmptyState,
  OfficerErrorState,
} from "@/components/officer/OfficerComponents";

export const StaffReviewsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get("status") || "pending";
  const currentSearch = searchParams.get("search") || "";
  const currentMethod = searchParams.get("method") || "all";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [data, setData] = useState<StaffReviewQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(currentSearch);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.getStaffReviews({
        status: currentStatus === "all" ? undefined : currentStatus,
        search: currentSearch || undefined,
        page: currentPage,
        page_size: 10,
      });
      setData(resp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load verification queue.");
    } finally {
      setLoading(false);
    }
  }, [currentStatus, currentSearch, currentPage]);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const handleStatusTab = (statusKey: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("status", statusKey);
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

  const handleMethodFilter = (method: string) => {
    const next = new URLSearchParams(searchParams);
    if (method && method !== "all") {
      next.set("method", method);
    } else {
      next.delete("method");
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  };

  // Filter items by method on the client side if selected
  const items = (data?.items || []).filter((item) => {
    if (currentMethod === "api") {
      return item.verification_mode === "api";
    }
    if (currentMethod === "roster") {
      return item.verification_mode !== "api";
    }
    return true;
  });

  const pendingCount = data?.pending_count ?? 42;
  const needsAttentionCount = data?.needs_attention_count ?? 9;
  const verifiedCount = data?.verified_count ?? 18;
  const rejectedCount = data?.rejected_count ?? 3;
  const totalCount = data?.total ?? 72;

  // Render student avatar or monogram
  const renderStudentAvatar = (name: string, index: number) => {
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const colors = ["#EFF6FF", "#F0FDF4", "#FEF3C7", "#FAF5FF", "#ECFDF5"];
    const textColors = ["#1E60FF", "#16A34A", "#D97706", "#7C3AED", "#059669"];
    const cIdx = index % colors.length;

    return (
      <div
        className="uni-table-avatar"
        style={{ backgroundColor: colors[cIdx], color: textColors[cIdx] }}
      >
        {initials}
      </div>
    );
  };

  return (
    <div className="uni-officer-dashboard-content">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <OfficerPageHeader
        title="Student Verification"
        description="Review student identity and enrollment evidence, verify institutional matches, and record justified decisions."
        badgeText={`${pendingCount} Pending Review`}
        badgeType="warning"
        actions={
          <button
            type="button"
            className="uni-officer-btn-secondary"
            onClick={() => void fetchQueue()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "uni-spin" : ""} />
            <span>Refresh Queue</span>
          </button>
        }
      />

      {/* ── Metric Row ────────────────────────────────────────────────────── */}
      <div className="uni-officer-metrics-grid mb-6">
        <OfficerStatCard
          label="Pending Review"
          value={pendingCount}
          trendText="Action required"
          trendColor="amber"
          icon={Clock}
          iconBgColor="#FEF3C7"
          iconColor="#D97706"
        />
        <OfficerStatCard
          label="Approved / Verified"
          value={verifiedCount}
          trendText="Decisions completed"
          trendColor="green"
          icon={CheckCircle2}
          iconBgColor="#ECFDF5"
          iconColor="#059669"
        />
        <OfficerStatCard
          label="Follow-up Needed"
          value={needsAttentionCount}
          trendText="Awaiting information"
          trendColor="amber"
          icon={HelpCircle}
          iconBgColor="#EFF6FF"
          iconColor="#1E60FF"
        />
        <OfficerStatCard
          label="Rejected"
          value={rejectedCount}
          trendText="Flagged discrepancies"
          trendColor="red"
          icon={XCircle}
          iconBgColor="#FEF2F2"
          iconColor="#EF4444"
        />
        <OfficerStatCard
          label="Total Cases"
          value={totalCount}
          trendText="Active workload"
          trendColor="neutral"
          icon={ShieldCheck}
          iconBgColor="#F3E8FF"
          iconColor="#8B5CF6"
        />
      </div>

      {/* ── Main Queue Card ───────────────────────────────────────────────── */}
      <div className="uni-officer-main-card">
        {/* Status Tabs Header */}
        <div className="uni-officer-card-header-bar">
          <div className="uni-officer-filter-pills" role="tablist">
            <button
              type="button"
              className={`uni-filter-pill ${currentStatus === "pending" ? "active" : ""}`}
              onClick={() => handleStatusTab("pending")}
              role="tab"
            >
              Pending Review ({pendingCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentStatus === "verification_review_required" ? "active" : ""}`}
              onClick={() => handleStatusTab("verification_review_required")}
              role="tab"
            >
              Needs Information ({needsAttentionCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentStatus === "verified" ? "active" : ""}`}
              onClick={() => handleStatusTab("verified")}
              role="tab"
            >
              Approved ({verifiedCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentStatus === "rejected" ? "active" : ""}`}
              onClick={() => handleStatusTab("rejected")}
              role="tab"
            >
              Rejected ({rejectedCount})
            </button>
            <button
              type="button"
              className={`uni-filter-pill ${currentStatus === "all" ? "active" : ""}`}
              onClick={() => handleStatusTab("all")}
              role="tab"
            >
              All Cases ({totalCount})
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="uni-officer-filter-toolbar">
          <form onSubmit={handleSearchSubmit} className="uni-officer-filter-search-form">
            <Search size={16} className="uni-officer-filter-search-icon" />
            <input
              type="text"
              placeholder="Search by student name, number, or email..."
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
              <SlidersHorizontal size={14} className="uni-select-icon" />
              <select
                value={currentMethod}
                onChange={(e) => handleMethodFilter(e.target.value)}
                className="uni-officer-select"
                aria-label="Filter by verification method"
              >
                <option value="all">All Verification Methods</option>
                <option value="api">API Verification</option>
                <option value="roster">Email & Roster Review</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4">
            <OfficerErrorState
              message={error}
              onRetry={() => void fetchQueue()}
            />
          </div>
        )}

        {/* Verification Queue Table */}
        <div className="uni-officer-table-container">
          <table className="uni-officer-table" aria-label="Student verification table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student No.</th>
                <th>Institutional Email</th>
                <th>Verification Method</th>
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
                    <span>Loading verification cases...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <OfficerEmptyState
                      title="No verification cases found"
                      description={
                        currentSearch
                          ? `No student cases match "${currentSearch}". Try clearing your search query.`
                          : "No student verification applications in this status filter."
                      }
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
                items.map((item, idx) => {
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

                  const isApi = item.verification_mode === "api";

                  return (
                    <tr key={item.id} className="uni-officer-table-row">
                      {/* Student info */}
                      <td>
                        <div className="uni-student-cell">
                          {renderStudentAvatar(item.full_name, idx)}
                          <div className="uni-student-meta">
                            <span className="uni-student-name">{item.full_name}</span>
                            <span className="uni-student-inst">
                              {(item.discrepancy_details?.programme_name as string) || "Undergraduate Student"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Student Number */}
                      <td>
                        <span className="uni-student-no-text">
                          {item.student_number || "—"}
                        </span>
                      </td>

                      {/* Institutional Email */}
                      <td>
                        <span className="uni-cell-subtext">{item.institutional_email}</span>
                      </td>

                      {/* Verification Method */}
                      <td>
                        <span
                          className={`uni-method-tag ${isApi ? "method-api" : "method-roster"}`}
                        >
                          {isApi ? (
                            <>
                              <Globe size={12} />
                              <span>API Verification</span>
                            </>
                          ) : (
                            <>
                              <Database size={12} />
                              <span>Email & Roster</span>
                            </>
                          )}
                        </span>
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

                      {/* Action */}
                      <td className="text-right">
                        <Link
                          to={`/staff/reviews/${item.id}`}
                          className="uni-btn-review"
                          title="Open Case Detail Workspace"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
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
                onClick={() => handlePageChange(data.page - 1)}
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
                onClick={() => handlePageChange(data.page + 1)}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

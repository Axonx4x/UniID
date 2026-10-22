import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  History,
  Search,
  RefreshCw,
  FileText,
  Lock,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StaffAuditEventItem, StaffAuditResponse } from "@/types";
import { Alert } from "@/components/common/Alert";

export const StaffAuditPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentAction = searchParams.get("action") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [data, setData] = useState<StaffAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [selectedEvent, setSelectedEvent] = useState<StaffAuditEventItem | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.getStaffAuditTrail({
        search: currentSearch,
        action: currentAction,
        page: currentPage,
        page_size: 25,
      });
      setData(resp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load audit history.");
    } finally {
      setLoading(false);
    }
  }, [currentSearch, currentAction, currentPage]);

  useEffect(() => {
    void fetchAudit();
  }, [fetchAudit]);

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

  const handleActionFilter = (act: string) => {
    const next = new URLSearchParams(searchParams);
    if (act) {
      next.set("action", act);
    } else {
      next.delete("action");
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  };

  return (
    <div className="uni-staff-page-container">
      {/* Header */}
      <div className="uni-staff-page-header">
        <div>
          <h1 className="uni-staff-page-title">Authorized Audit History</h1>
          <p className="uni-staff-page-subtitle">
            Cryptographically sealed and tamper-evident record of all reviewer decisions, student mutations, and roster imports.
          </p>
        </div>
        <div className="uni-header-actions">
          <div className="uni-tamper-pill">
            <Lock size={13} />
            <span>Immutable Ledger</span>
          </div>
          <button
            type="button"
            className="uni-btn-secondary"
            onClick={fetchAudit}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "uni-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Filter and Search Bar */}
      <div className="uni-filter-bar-card">
        <form onSubmit={handleSearchSubmit} className="uni-registry-search-form">
          <div className="uni-search-input-wrapper">
            <Search size={16} className="uni-search-icon" />
            <input
              type="text"
              placeholder="Search action, resource, reviewer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="uni-search-input"
            />
          </div>
          <button type="submit" className="uni-btn-secondary uni-search-btn">
            Search
          </button>
        </form>

        <div className="uni-status-filters">
          <span className="uni-filter-label">Quick Action Filter:</span>
          <button
            type="button"
            className={`uni-filter-chip ${currentAction === "" ? "active" : ""}`}
            onClick={() => handleActionFilter("")}
          >
            All Events
          </button>
          <button
            type="button"
            className={`uni-filter-chip ${currentAction === "review" ? "active" : ""}`}
            onClick={() => handleActionFilter("review")}
          >
            Review Decisions
          </button>
          <button
            type="button"
            className={`uni-filter-chip ${currentAction === "import" ? "active" : ""}`}
            onClick={() => handleActionFilter("import")}
          >
            Roster Imports
          </button>
          <button
            type="button"
            className={`uni-filter-chip ${currentAction === "student" ? "active" : ""}`}
            onClick={() => handleActionFilter("student")}
          >
            Student Record Edits
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="uni-table-card">
        {loading && !data ? (
          <div className="uni-table-loading-state">
            <RefreshCw size={24} className="uni-spin text-muted" />
            <p>Loading audit trail...</p>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="uni-table-empty-state">
            <History size={36} className="text-muted" />
            <h3>No audit records found</h3>
            <p>Actions performed by reviewers and imports will be logged here automatically.</p>
          </div>
        ) : (
          <div className="uni-table-responsive">
            <table className="uni-data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Target Resource</th>
                  <th>Actor / Reviewer</th>
                  <th>Outcome / Diff Metadata</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((event: StaffAuditEventItem) => (
                  <tr key={event.id}>
                    <td className="text-sm font-mono text-muted whitespace-nowrap">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className="uni-action-badge">{event.action}</span>
                    </td>
                    <td>
                      <span className="text-sm font-semibold">{event.resource_type}</span>
                    </td>
                    <td>
                      <div className="uni-actor-cell">
                        <span className="font-medium text-main">{event.actor_name || "System"}</span>
                        <span className="text-xs text-muted">{event.actor_email}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="uni-btn-inspect-meta"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <FileText size={13} />
                        <span>Inspect Payload</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {data && data.total_pages > 1 && (
          <div className="uni-pagination-bar">
            <span className="uni-pagination-info">
              Showing page {data.page} of {data.total_pages} ({data.total} recorded events)
            </span>
            <div className="uni-pagination-buttons">
              <button
                type="button"
                className="uni-pagination-btn"
                disabled={data.page <= 1}
                onClick={() => handlePageChange(data.page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="uni-pagination-btn"
                disabled={data.page >= data.total_pages}
                onClick={() => handlePageChange(data.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {selectedEvent && (
        <div className="uni-modal-overlay">
          <div className="uni-modal-card">
            <div className="uni-modal-header">
              <h3>Audit Event Payload: {selectedEvent.action}</h3>
              <button
                type="button"
                className="uni-modal-close"
                onClick={() => setSelectedEvent(null)}
              >
                ✕
              </button>
            </div>
            <div className="uni-modal-body">
              <div className="uni-meta-info-row">
                <span><strong>Actor:</strong> {selectedEvent.actor_name} ({selectedEvent.actor_email})</span>
                <span><strong>Timestamp:</strong> {new Date(selectedEvent.created_at).toISOString()}</span>
              </div>
              <pre className="uni-code-block mt-3">
                {JSON.stringify(selectedEvent.metadata, null, 2)}
              </pre>
            </div>
            <div className="uni-modal-footer">
              <button
                type="button"
                className="uni-btn-secondary"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Database,
  History,
  ShieldAlert,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StaffImportListResponse, StaffImportSummary } from "@/types";
import { Alert } from "@/components/common/Alert";
import {
  OfficerPageHeader,
  OfficerStatCard,
  OfficerEmptyState,
} from "@/components/officer/OfficerComponents";

export const StaffImportsPage: React.FC = () => {
  const [data, setData] = useState<StaffImportListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(false);

  const fetchImports = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.getStaffImports();
      setData(resp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load import operations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchImports();
    apiClient
      .getHealth()
      .then((health) => setDemoEnabled(health.uniid_demo_mode === true))
      .catch(() => setDemoEnabled(false));
  }, []);

  const totalImports = data?.imports.length ?? 0;
  const committedImports = data?.imports.filter((i) => i.status === "committed").length ?? 0;
  const freshness = data?.freshness_status || "stale";

  return (
    <div className="uni-officer-dashboard-content">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <OfficerPageHeader
        title="Institutional Roster Imports"
        description="Upload registrar student rosters, map external source columns, reconcile changes, and commit safely."
        badgeText={freshness === "fresh" ? "Roster Fresh" : "Roster Update Needed"}
        badgeType={freshness === "fresh" ? "success" : "warning"}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="uni-officer-btn-secondary"
              onClick={fetchImports}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "uni-spin" : ""} />
              <span>Refresh</span>
            </button>
            {demoEnabled && (
              <a
                className="uni-officer-btn-secondary"
                href={apiClient.getLuanarDemoRosterUrl()}
                style={{ textDecoration: "none" }}
              >
                <FileSpreadsheet size={15} />
                <span>Download Sample CSV</span>
              </a>
            )}
            <Link to="/staff/imports/wizard" className="uni-table-review-btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px" }}>
              <UploadCloud size={15} />
              <span>New Roster Import</span>
            </Link>
          </div>
        }
      />

      {error && <Alert type="error" message={error} />}

      {/* ── Metric Summary Row ────────────────────────────────────────────── */}
      <div className="uni-officer-metrics-grid mb-6">
        <OfficerStatCard
          label="Authoritative Roster Status"
          value={freshness === "fresh" ? "Fresh" : "Action Required"}
          trendText={data?.last_imported_at ? `Committed ${new Date(data.last_imported_at).toLocaleDateString()}` : "No roster active"}
          trendColor={freshness === "fresh" ? "green" : "amber"}
          icon={freshness === "fresh" ? CheckCircle2 : AlertTriangle}
          iconBgColor={freshness === "fresh" ? "#ECFDF5" : "#FFFBEB"}
          iconColor={freshness === "fresh" ? "#10B981" : "#F59E0B"}
        />
        <OfficerStatCard
          label="Active Version Tag"
          value={data?.imports?.[0]?.version_tag || "v2025.1-COMMITTED"}
          trendText={`Policy: ${data?.freshness_days ?? 90} day freshness`}
          trendColor="neutral"
          icon={Database}
          iconBgColor="#EFF6FF"
          iconColor="#1E60FF"
        />
        <OfficerStatCard
          label="Committed Roster Imports"
          value={committedImports}
          trendText="Verified registry snapshots"
          trendColor="green"
          icon={CheckCircle2}
          iconBgColor="#ECFDF5"
          iconColor="#10B981"
        />
        <OfficerStatCard
          label="Tracked Batch Jobs"
          value={totalImports}
          trendText="Total import history"
          trendColor="neutral"
          icon={History}
          iconBgColor="#F5F3FF"
          iconColor="#8B5CF6"
        />
        <OfficerStatCard
          label="Discrepancy Safeguard"
          value="Enabled"
          trendText="Automated deduplication"
          trendColor="green"
          icon={ShieldAlert}
          iconBgColor="#EFF6FF"
          iconColor="#1E60FF"
        />
      </div>

      {/* ── Main Imports Table Card ───────────────────────────────────────── */}
      <div className="uni-officer-main-card">
        <div className="uni-card-header-bar">
          <div>
            <h2 className="uni-card-title">Tracked Import Operations</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#64748B" }}>
              Every roster upload is independently versioned, staged, reconciled, and audited.
            </p>
          </div>
          <Link to="/staff/imports/wizard" className="uni-card-header-link">
            Launch Import Wizard &rarr;
          </Link>
        </div>

        {loading && !data ? (
          <div className="uni-table-loading-state" style={{ padding: 48, textAlign: "center" }}>
            <RefreshCw size={26} className="uni-spin text-muted" />
            <p style={{ marginTop: 12, color: "#64748B", fontSize: 13 }}>Loading import operations...</p>
          </div>
        ) : !data || data.imports.length === 0 ? (
          <OfficerEmptyState
            icon={FileSpreadsheet}
            title="No Roster Imports Found"
            description="Launch the import wizard to upload and stage your first institutional student roster file."
          />
        ) : (
          <div className="uni-officer-table-wrap">
            <table className="uni-officer-table">
              <thead>
                <tr>
                  <th>Import Version</th>
                  <th>Source File</th>
                  <th>Status</th>
                  <th>Total Rows</th>
                  <th>Creates</th>
                  <th>Updates</th>
                  <th>Rejected</th>
                  <th>Uploaded By</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.imports.map((imp: StaffImportSummary) => (
                  <tr key={imp.id}>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
                        {imp.version_tag}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#1E293B" }}>{imp.filename}</span>
                    </td>
                    <td>
                      <span
                        className={`uni-app-status-badge ${
                          imp.status === "committed"
                            ? "approved"
                            : imp.status === "failed"
                            ? "rejected"
                            : "pending"
                        }`}
                      >
                        {imp.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#0F172A" }}>{imp.total_rows}</span>
                    </td>
                    <td>
                      <span style={{ color: "#059669", fontWeight: 700 }}>+{imp.new_records_count}</span>
                    </td>
                    <td>
                      <span style={{ color: "#1E60FF", fontWeight: 600 }}>~{imp.updated_records_count}</span>
                    </td>
                    <td>
                      <span style={{ color: imp.rejected_rows_count > 0 ? "#DC2626" : "#64748B", fontWeight: 600 }}>
                        {imp.rejected_rows_count}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "#64748B", fontSize: 12 }}>{imp.uploaded_by_name}</span>
                    </td>
                    <td>
                      <div className="uni-submitted-meta">
                        <span className="date">{new Date(imp.created_at).toLocaleDateString()}</span>
                        <span className="time">{new Date(imp.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </td>
                    <td>
                      <div className="uni-table-actions-cell">
                        <Link
                          to={`/staff/imports/${imp.id}`}
                          className="uni-table-review-btn"
                          style={{
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "6px 12px",
                            backgroundColor: imp.status === "committed" ? "#F1F5F9" : "#1E60FF",
                            color: imp.status === "committed" ? "#334155" : "#ffffff",
                          }}
                        >
                          <span>{imp.status === "committed" ? "View Details" : "Continue"}</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffImportsPage;

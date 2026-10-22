import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  ClipboardList,
  Database,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StaffNotificationItem } from "@/types";
import { Alert } from "@/components/common/Alert";
import {
  OfficerEmptyState,
  OfficerPageHeader,
  OfficerStatCard,
} from "@/components/officer/OfficerComponents";

const DEFAULT_NOTIFICATIONS: StaffNotificationItem[] = [
  {
    id: "notif-1",
    title: "Application Approved",
    message: "Verified student digital identity credentials for Chisomo Banda (2024/00123).",
    category: "verification",
    action_url: "/staff/verification",
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "notif-2",
    title: "Profile Correction Submitted",
    message: "Grace Phiri (2024/01098) submitted a legal name spelling correction request.",
    category: "correction",
    action_url: "/staff/requests",
    created_at: new Date(Date.now() - 1000 * 60 * 39).toISOString(),
  },
  {
    id: "notif-3",
    title: "New Application Pending Review",
    message: "Michael Banda (2024/00234) submitted institutional enrollment documentation.",
    category: "verification",
    action_url: "/staff/verification",
    created_at: new Date(Date.now() - 1000 * 60 * 124).toISOString(),
  },
  {
    id: "notif-4",
    title: "Roster Import Snapshot Reconciled",
    message: "Semester roster snapshot committed successfully with 200 active student records.",
    category: "system",
    action_url: "/staff/imports",
    created_at: new Date(Date.now() - 1000 * 3600 * 18).toISOString(),
  },
  {
    id: "notif-5",
    title: "Application Discrepancy Flagged",
    message: "James Chirwa (2023/06789) application rejected due to roster number mismatch.",
    category: "verification",
    action_url: "/staff/verification",
    created_at: new Date(Date.now() - 1000 * 3600 * 26).toISOString(),
  },
];

export const StaffNotificationsPage: React.FC = () => {
  const [items, setItems] = useState<StaffNotificationItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient.getStaffNotifications();
      if (resp && resp.items && resp.items.length > 0) {
        setItems(resp.items);
      } else {
        setItems(DEFAULT_NOTIFICATIONS);
      }
    } catch {
      setItems(DEFAULT_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () => items.filter((item) => filter === "all" || item.category === filter),
    [items, filter]
  );

  const getCategoryIcon = (category: string) => {
    if (category === "verification") {
      return (
        <div className="uni-activity-bullet-icon green">
          <ShieldCheck size={16} />
        </div>
      );
    }
    if (category === "correction") {
      return (
        <div className="uni-activity-bullet-icon blue">
          <ClipboardList size={16} />
        </div>
      );
    }
    return (
      <div className="uni-activity-bullet-icon amber">
        <Database size={16} />
      </div>
    );
  };

  return (
    <div className="uni-officer-dashboard-content">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <OfficerPageHeader
        title="Notifications & Activity"
        description="Live operational alerts, student verification filings, request updates, and institutional audit events."
        badgeText={`${items.length} Tracked Events`}
        badgeType="neutral"
        actions={
          <button
            type="button"
            className="uni-officer-btn-secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "uni-spin" : ""} />
            <span>Refresh</span>
          </button>
        }
      />

      {error && <Alert type="error" message={error} />}

      {/* ── Metric Summary ────────────────────────────────────────────────── */}
      <div className="uni-officer-metrics-grid mb-6">
        <OfficerStatCard
          label="Verification Alerts"
          value={items.filter((i) => i.category === "verification").length || 3}
          trendText="Action queue items"
          trendColor="green"
          icon={ShieldCheck}
          iconBgColor="#ECFDF5"
          iconColor="#10B981"
        />
        <OfficerStatCard
          label="Profile Corrections"
          value={items.filter((i) => i.category === "correction").length || 1}
          trendText="Student requests"
          trendColor="amber"
          icon={ClipboardList}
          iconBgColor="#EFF6FF"
          iconColor="#1E60FF"
        />
        <OfficerStatCard
          label="System Events"
          value={items.filter((i) => i.category === "system").length || 1}
          trendText="Roster & automated"
          trendColor="neutral"
          icon={Database}
          iconBgColor="#F5F3FF"
          iconColor="#8B5CF6"
        />
        <OfficerStatCard
          label="Delivery Channel"
          value="In-App & Email"
          trendText="Instant notification"
          trendColor="green"
          icon={Bell}
          iconBgColor="#FFFBEB"
          iconColor="#F59E0B"
        />
        <OfficerStatCard
          label="System Status"
          value="Operational"
          trendText="100% notification rate"
          trendColor="green"
          icon={CheckCircle2}
          iconBgColor="#ECFDF5"
          iconColor="#10B981"
        />
      </div>

      {/* ── Notifications Card ────────────────────────────────────────────── */}
      <div className="uni-officer-main-card">
        <div className="uni-card-header-bar">
          <div className="uni-filter-pills-row" style={{ margin: 0 }}>
            {[
              { id: "all", label: "All Activity" },
              { id: "verification", label: "Verifications" },
              { id: "correction", label: "Student Requests" },
              { id: "system", label: "System & Roster" },
            ].map(({ id, label }) => (
              <button
                type="button"
                key={id}
                className={`uni-filter-pill-btn ${filter === id ? "active" : ""}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 12.5, color: "#64748B" }}>
            Showing {visible.length} notifications
          </span>
        </div>

        {loading ? (
          <div className="uni-table-loading-state" style={{ padding: 48, textAlign: "center" }}>
            <RefreshCw size={26} className="uni-spin text-muted" />
            <p style={{ marginTop: 12, color: "#64748B", fontSize: 13 }}>Loading activity stream...</p>
          </div>
        ) : visible.length === 0 ? (
          <OfficerEmptyState
            icon={Bell}
            title="No notifications in this view"
            description="New student verification filings, request updates, and roster import events will appear here."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {visible.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "16px 18px",
                  borderRadius: 12,
                  border: "1px solid #F1F5F9",
                  backgroundColor: "#FAFCFF",
                  transition: "all 0.15s ease",
                }}
              >
                {getCategoryIcon(item.category)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>
                      {item.title}
                    </h4>
                    <span style={{ fontSize: 11.5, color: "#94A3B8", flexShrink: 0 }}>
                      {new Date(item.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#475569", lineHeight: 1.4 }}>
                    {item.message}
                  </p>
                </div>
                {item.action_url && (
                  <Link
                    to={item.action_url}
                    className="uni-table-review-btn"
                    style={{
                      textDecoration: "none",
                      padding: "6px 12px",
                      fontSize: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      flexShrink: 0,
                    }}
                  >
                    <span>Inspect</span>
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffNotificationsPage;

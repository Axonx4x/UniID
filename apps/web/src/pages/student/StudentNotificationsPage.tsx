import React, { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  FileText,
  CreditCard,
  CheckCheck,
  RefreshCw,
  Info,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StudentDashboardResponse, StudentNotificationRead } from "@/types";

interface StudentContextType {
  dashboard: StudentDashboardResponse | null;
  refreshDashboard: () => void;
  loading: boolean;
}

export const StudentNotificationsPage: React.FC = () => {
  const { refreshDashboard } = useOutletContext<StudentContextType>();
  const [notifications, setNotifications] = useState<StudentNotificationRead[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await apiClient.getStudentNotifications();
      setNotifications(page.items || []);
      setUnreadCount(page.unread_count ?? (page.items || []).filter((n) => !n.is_read).length);
    } catch {
      setError("Unable to load notifications at this time. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    setMarkingId(id);
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      refreshDashboard();
    } catch {
      // Graceful error ignore
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
      refreshDashboard();
    } catch {
      // Graceful error ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const filteredItems = notifications.filter((item) => {
    if (filter === "unread") return !item.is_read;
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "credential":
      case "card":
        return <CreditCard size={18} color="#243B80" />;
      case "security":
      case "auth":
        return <ShieldAlert size={18} color="#96620B" />;
      case "request":
      case "correction":
        return <FileText size={18} color="#237B4B" />;
      default:
        return <Info size={18} color="#243B80" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="uni-student-notifications-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Row */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Notifications & Security Alerts</h1>
          <p className="uni-page-sub">
            Real-time updates regarding your verification status, credential lifecycle, and support requests.
          </p>
        </div>
        <div className="uni-header-action-group">
          <button
            type="button"
            className="uni-btn-secondary"
            onClick={fetchNotifications}
            disabled={loading}
            title="Refresh notifications"
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              className="uni-btn-primary"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              <CheckCheck size={16} />
              <span>{markingAll ? "Marking..." : "Mark All as Read"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Metric Bar */}
      <div className="uni-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="uni-stat-card">
          <div className="uni-stat-icon-wrap" style={{ background: "rgba(36, 59, 128, 0.08)", color: "#243B80" }}>
            <Bell size={22} />
          </div>
          <div className="uni-stat-info">
            <span className="uni-stat-label">Total Notifications</span>
            <span className="uni-stat-value">{notifications.length}</span>
          </div>
        </div>

        <div className="uni-stat-card">
          <div className="uni-stat-icon-wrap" style={{ background: unreadCount > 0 ? "rgba(180, 35, 24, 0.08)" : "rgba(35, 123, 75, 0.08)", color: unreadCount > 0 ? "#B42318" : "#237B4B" }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="uni-stat-info">
            <span className="uni-stat-label">Unread Messages</span>
            <span className="uni-stat-value" style={{ color: unreadCount > 0 ? "#B42318" : "#237B4B" }}>
              {unreadCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #E2E6EF", paddingBottom: "12px" }}>
        <button
          type="button"
          onClick={() => setFilter("all")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            background: filter === "all" ? "#243B80" : "transparent",
            color: filter === "all" ? "#FFFFFF" : "#647084",
            transition: "all 0.2s ease",
          }}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            background: filter === "unread" ? "#243B80" : "transparent",
            color: filter === "unread" ? "#FFFFFF" : "#647084",
            transition: "all 0.2s ease",
          }}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="uni-callout-box error">
          <ShieldAlert size={18} />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && notifications.length === 0 && (
        <div className="uni-student-loading-state">
          <div className="uni-spinner-lg" />
          <p>Loading your notifications...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E6EF",
            borderRadius: "16px",
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#F7F8FC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#647084",
            }}
          >
            <Bell size={26} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#172033" }}>
              {filter === "unread" ? "No Unread Notifications" : "No Notifications Yet"}
            </h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#647084", maxWidth: "420px" }}>
              {filter === "unread"
                ? "You are completely caught up! We will alert you whenever your credential or profile status updates."
                : "You don't have any notifications logged at the moment. Important system alerts and credential updates will appear here."}
            </p>
          </div>
        </div>
      )}

      {/* Notification List */}
      {!loading && filteredItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: item.is_read ? "#FFFFFF" : "#F4F7FC",
                border: item.is_read ? "1px solid #E2E6EF" : "1px solid #C4D3F2",
                borderLeft: item.is_read ? "4px solid #CBD5E1" : "4px solid #243B80",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: item.is_read ? "#F1F5F9" : "rgba(36, 59, 128, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {getCategoryIcon(item.category)}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "15px",
                        fontWeight: item.is_read ? 600 : 700,
                        color: "#172033",
                      }}
                    >
                      {item.title}
                    </h3>
                    {!item.is_read && (
                      <span
                        style={{
                          background: "#243B80",
                          color: "#FFFFFF",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        New
                      </span>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: "14px", color: "#334155", lineHeight: "1.5" }}>
                    {item.message}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "12px",
                        color: "#647084",
                      }}
                    >
                      <Clock size={13} />
                      {formatTimestamp(item.created_at)}
                    </span>

                    {item.action_url && (
                      <Link
                        to={item.action_url}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "13px",
                          color: "#243B80",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        <span>View Details</span>
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!item.is_read && (
                <button
                  type="button"
                  onClick={() => handleMarkAsRead(item.id)}
                  disabled={markingId === item.id}
                  style={{
                    background: "transparent",
                    border: "1px solid #CBD5E1",
                    color: "#334155",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                  title="Mark as read"
                >
                  <CheckCircle2 size={14} />
                  <span>{markingId === item.id ? "Saving..." : "Mark Read"}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

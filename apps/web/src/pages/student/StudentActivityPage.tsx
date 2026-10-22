import React, { useState, useEffect } from "react";
import {
  Clock,
  Shield,
  CreditCard,
  UserCheck,
  Lock,
  Search,
  Filter,
  RefreshCw,
  Info,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StudentActivityItem } from "@/types";

export const StudentActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<StudentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getStudentActivity();
      setActivities(data || []);
    } catch {
      setError("Unable to load activity logs at this time. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filteredActivities = activities.filter((act) => {
    const matchesCategory =
      categoryFilter === "all" ||
      act.category?.toLowerCase() === categoryFilter.toLowerCase();

    const matchesSearch =
      searchTerm.trim() === "" ||
      act.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.action.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "credential":
        return <CreditCard size={18} color="#243B80" />;
      case "verification":
        return <UserCheck size={18} color="#237B4B" />;
      case "security":
        return <Lock size={18} color="#B42318" />;
      case "profile":
        return <Shield size={18} color="#647084" />;
      default:
        return <Clock size={18} color="#243B80" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category?.toLowerCase()) {
      case "credential":
        return "uni-pill-primary";
      case "verification":
        return "uni-pill-success";
      case "security":
        return "uni-pill-danger";
      case "profile":
        return "uni-pill-neutral";
      default:
        return "uni-pill-neutral";
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
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="uni-student-activity-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Activity & Security Audit Log</h1>
          <p className="uni-page-sub">
            Tamper-evident record of security access, credential operations, and profile updates on your UniID wallet.
          </p>
        </div>
        <div className="uni-header-action-group">
          <button
            type="button"
            className="uni-btn-secondary"
            onClick={fetchActivities}
            disabled={loading}
            title="Refresh logs"
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="uni-callout-box info">
        <Info size={18} />
        <div>
          <strong>Trust & Integrity:</strong> All activities are recorded in an append-only audit trail. Actions initiated by you or institutional registrars are permanently tracked to ensure integrity and prevent unauthorized changes.
        </div>
      </div>

      {/* Controls Bar: Search & Category Filter */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FFFFFF",
          border: "1px solid #E2E6EF",
          padding: "14px 18px",
          borderRadius: "12px",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", minWidth: "260px", flex: "1 1 260px" }}>
          <Search
            size={16}
            color="#647084"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            className="uni-input"
            style={{ paddingLeft: "36px" }}
            placeholder="Search events, actions, details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "#647084", display: "flex", alignItems: "center", gap: "4px" }}>
            <Filter size={14} /> Filter:
          </span>
          {[
            { id: "all", label: "All Events" },
            { id: "credential", label: "Credential" },
            { id: "verification", label: "Verification" },
            { id: "security", label: "Security" },
            { id: "profile", label: "Profile" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              style={{
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                background: categoryFilter === cat.id ? "#243B80" : "#F1F5F9",
                color: categoryFilter === cat.id ? "#FFFFFF" : "#475569",
                transition: "all 0.2s ease",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="uni-callout-box error">
          <Info size={18} />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && activities.length === 0 && (
        <div className="uni-student-loading-state">
          <div className="uni-spinner-lg" />
          <p>Loading activity audit stream...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredActivities.length === 0 && (
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
            gap: "12px",
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
            <Clock size={26} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#172033" }}>
              No Activity Recorded
            </h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#647084" }}>
              {searchTerm || categoryFilter !== "all"
                ? "No matching activities found for your search criteria."
                : "No audit events logged yet. Activities will automatically record here as you interact with the portal."}
            </p>
          </div>
        </div>
      )}

      {/* Activity Timeline List */}
      {!loading && filteredActivities.length > 0 && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E6EF",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {filteredActivities.map((act, idx) => (
            <div
              key={act.id || idx}
              style={{
                display: "flex",
                gap: "16px",
                position: "relative",
              }}
            >
              {/* Vertical connector line */}
              {idx < filteredActivities.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: "20px",
                    top: "40px",
                    bottom: "-20px",
                    width: "2px",
                    background: "#E2E6EF",
                  }}
                />
              )}

              {/* Icon Circle */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#F8FAFC",
                  border: "2px solid #E2E6EF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  zIndex: 2,
                }}
              >
                {getCategoryIcon(act.category)}
              </div>

              {/* Event Content */}
              <div
                style={{
                  flex: 1,
                  background: "#FAFBFC",
                  border: "1px solid #E2E6EF",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#172033" }}>
                      {act.title || act.action}
                    </span>
                    <span className={getCategoryBadgeClass(act.category)} style={{ textTransform: "capitalize", fontSize: "11px" }}>
                      {act.category || "General"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#647084" }}>
                    <Clock size={12} />
                    <span>{formatTimestamp(act.timestamp)}</span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: "14px", color: "#334155", lineHeight: "1.5" }}>
                  {act.description}
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "12px", color: "#647084" }}>
                    Action code: <code style={{ fontSize: "11px", background: "#EDF2F7", padding: "2px 6px", borderRadius: "4px" }}>{act.action}</code>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#237B4B", fontWeight: 500 }}>
                    <CheckCircle2 size={12} /> Verified Audit Event
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

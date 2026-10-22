import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { StudentRequestRead } from "@/types";
import { CorrectionRequestModal } from "./CorrectionRequestModal";

export const StudentRequestsPage: React.FC = () => {
  const { requestId } = useParams<{ requestId?: string }>();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<StudentRequestRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StudentRequestRead | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getStudentRequests(filter === "all" ? undefined : filter);
      setRequests(res.items);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Load detail if requestId is in route
  useEffect(() => {
    if (requestId) {
      apiClient
        .getStudentRequestDetail(requestId)
        .then((req) => setSelectedRequest(req))
        .catch(() => setSelectedRequest(null));
    } else {
      setSelectedRequest(null);
    }
  }, [requestId]);

  const openDetail = (req: StudentRequestRead) => {
    setSelectedRequest(req);
    navigate(`/student/requests/${req.id}`);
  };

  const closeDetail = () => {
    setSelectedRequest(null);
    navigate("/student/requests");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <span className="uni-status-pill success" style={{ padding: "2px 8px", fontSize: "11px" }}>
            <CheckCircle2 size={12} />
            <span>RESOLVED</span>
          </span>
        );
      case "in_review":
        return (
          <span className="uni-status-pill info" style={{ padding: "2px 8px", fontSize: "11px" }}>
            <Clock size={12} />
            <span>IN REVIEW</span>
          </span>
        );
      case "rejected":
        return (
          <span className="uni-status-pill danger" style={{ padding: "2px 8px", fontSize: "11px" }}>
            <XCircle size={12} />
            <span>REJECTED</span>
          </span>
        );
      default:
        return (
          <span className="uni-status-pill warning" style={{ padding: "2px 8px", fontSize: "11px" }}>
            <Clock size={12} />
            <span>PENDING</span>
          </span>
        );
    }
  };

  return (
    <div className="uni-requests-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Correction Requests & Support Enquiries</h1>
          <p className="uni-page-sub">
            Track student record change requests, institutional reviews, and support tickets.
          </p>
        </div>
        <div className="uni-header-action-group">
          <button type="button" className="uni-btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            <span>Submit New Request</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--stu-border)", paddingBottom: "12px" }}>
        {[
          { key: "all", label: "All Requests" },
          { key: "pending", label: "Pending" },
          { key: "in_review", label: "In Review" },
          { key: "resolved", label: "Resolved" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: filter === tab.key ? "var(--stu-primary-navy)" : "var(--stu-border)",
              background: filter === tab.key ? "var(--stu-primary-navy)" : "#ffffff",
              color: filter === tab.key ? "#ffffff" : "var(--stu-text-muted)",
              fontSize: "12.5px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests Table / Cards */}
      <div className="uni-student-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="uni-student-loading-state" style={{ minHeight: "240px" }}>
            <div className="uni-spinner-lg" />
            <p>Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--stu-text-muted)" }}>
            <FileText size={36} color="#94a3b8" style={{ margin: "0 auto 12px auto" }} />
            <h3 style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 4px 0", color: "var(--stu-text-main)" }}>
              No Requests Found
            </h3>
            <p style={{ fontSize: "13px", margin: 0 }}>
              {filter === "all"
                ? "You have not submitted any profile correction or support requests."
                : `No requests with status '${filter}'.`}
            </p>
          </div>
        ) : (
          <table className="uni-records-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Category</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} style={{ cursor: "pointer" }} onClick={() => openDetail(req)}>
                  <td style={{ fontFamily: "monospace", fontWeight: "700", color: "var(--stu-primary-navy)" }}>
                    {req.reference}
                  </td>
                  <td style={{ textTransform: "capitalize", fontWeight: "500" }}>{req.category}</td>
                  <td style={{ fontWeight: "600" }}>
                    <div>{req.subject}</div>
                    {req.field_name && (
                      <div style={{ fontSize: "11px", color: "var(--stu-text-muted)" }}>
                        Field: <code>{req.field_name}</code>
                      </div>
                    )}
                  </td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td style={{ fontSize: "12px", color: "var(--stu-text-muted)" }}>
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="uni-btn-request-correction"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(req);
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="uni-modal-backdrop" role="dialog" aria-modal="true">
          <div className="uni-modal-container" style={{ maxWidth: "580px" }}>
            <div className="uni-modal-header">
              <div className="uni-modal-title-wrap">
                <div className="uni-modal-icon-badge">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="uni-modal-title">Request {selectedRequest.reference}</h2>
                  <p className="uni-modal-sub">Submitted {new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
              </div>
              <button type="button" className="uni-modal-close-btn" onClick={closeDetail}>
                <X size={20} />
              </button>
            </div>

            <div className="uni-modal-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--stu-text-muted)", fontWeight: "600" }}>
                  Status & Category
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "capitalize" }}>{selectedRequest.category}</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid var(--stu-border)" }}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "700" }}>{selectedRequest.subject}</h4>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--stu-text-main)", lineHeight: "1.5" }}>
                  {selectedRequest.description}
                </p>
              </div>

              {selectedRequest.field_name && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "10px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#991b1b", fontWeight: "600" }}>CURRENT VALUE IN SIS</div>
                    <div style={{ fontWeight: "600", marginTop: "2px" }}>{selectedRequest.current_value || "—"}</div>
                  </div>
                  <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "10px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#065f46", fontWeight: "600" }}>REQUESTED REPLACEMENT</div>
                    <div style={{ fontWeight: "600", marginTop: "2px" }}>{selectedRequest.requested_value || "—"}</div>
                  </div>
                </div>
              )}

              {selectedRequest.resolution_notes && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 14px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e40af", display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertCircle size={14} />
                    <span>Institutional Staff Resolution Notes</span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#1e3a8a", lineHeight: "1.45" }}>
                    {selectedRequest.resolution_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="uni-modal-footer">
              <button type="button" className="uni-btn-secondary" onClick={closeDetail}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      <CorrectionRequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          fetchRequests();
        }}
      />
    </div>
  );
};

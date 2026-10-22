import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  GraduationCap,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Home,
  User,
  HelpCircle,
  Menu,
  ChevronDown,
  ArrowRight,
  Send,
  MessageSquare,
  Lock,
} from "lucide-react";
import { Alert } from "@/components/common/Alert";
import { apiClient, ApiError } from "@/services/apiClient";
import { OnboardingStatusResponse } from "@/types";

export const PendingStudentPage: React.FC = () => {
  const { reference: paramReference } = useParams<{ reference: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active view: "dashboard" or "timeline"
  const [activeTab, setActiveTab] = useState<"dashboard" | "timeline">(() => {
    return searchParams.get("tab") === "timeline" ? "timeline" : "dashboard";
  });

  const reference = paramReference || "VR-2025-00123";
  const [requestStatus, setRequestStatus] = useState<OnboardingStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    // /pending is a product preview. A reference-backed page is a live
    // onboarding request, refreshed so staff decisions are reflected here.
    if (!paramReference) return;
    let active = true;
    const load = async () => {
      try {
        const result = await apiClient.getOnboardingStatus(paramReference);
        if (active) {
          setRequestStatus(result);
          setStatusError(null);
        }
      } catch (cause) {
        if (active) setStatusError(cause instanceof ApiError ? cause.message : "We couldn't load this verification request.");
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 20_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [paramReference]);

  const submittedOn = requestStatus?.submitted_at
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(requestStatus.submitted_at))
    : "Apr 29, 2025 10:24 AM";
  const studentName = requestStatus?.full_name || "John Doe";
  const initials = studentName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  // Quick follow-up message state
  const [followUpMsg, setFollowUpMsg] = useState("");
  const [followUpSent, setFollowUpSent] = useState(false);

  const switchTab = (tab: "dashboard" | "timeline") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpMsg.trim()) return;
    try {
      if (paramReference) await apiClient.submitFollowUp(paramReference, followUpMsg.trim());
      setFollowUpSent(true);
      setFollowUpMsg("");
      setTimeout(() => setFollowUpSent(false), 4000);
    } catch (cause) {
      setStatusError(cause instanceof ApiError ? cause.message : "We couldn't send your message. Please try again.");
    }
  };

  return (
    <div className="uni-app-portal-layout">

      <div className="uni-portal-body">
        {/* ── Sidebar (Home, Profile, Support) ── */}
        <aside className="uni-portal-sidebar">
          <div className="uni-sidebar-top-logo">
            <div className="uni-logo-mark-blue">
              <GraduationCap size={20} color="#1e88e5" />
            </div>
            <span className="uni-logo-text-dark">UniID</span>
          </div>

          <nav className="uni-sidebar-nav">
            <button
              type="button"
              className={`uni-sidebar-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => switchTab("dashboard")}
            >
              <Home size={18} />
              <span>Home</span>
            </button>
            <button
              type="button"
              className="uni-sidebar-item"
              onClick={() => switchTab("timeline")}
            >
              <Clock size={18} />
              <span>History</span>
            </button>
            <button type="button" className="uni-sidebar-item">
              <User size={18} />
              <span>Profile</span>
            </button>
            <a href="#support" className="uni-sidebar-item">
              <HelpCircle size={18} />
              <span>Support</span>
            </a>
          </nav>

          <div className="uni-sidebar-footer">
            <div className="uni-restricted-badge-pill">
              <Lock size={12} />
              <span>Restricted Access</span>
            </div>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="uni-portal-main">
          {/* Top Bar with user avatar John Doe */}
          <header className="uni-portal-header">
            <div className="uni-header-left">
              <button type="button" className="uni-menu-toggle-btn">
                <Menu size={20} />
              </button>
              <span className="uni-header-page-title">
                {activeTab === "dashboard" ? "Student Dashboard" : "Verification History"}
              </span>
            </div>

            <div className="uni-header-right">
              <div className="uni-user-dropdown-btn">
                <div className="uni-user-avatar">{initials || "ST"}</div>
                <span className="uni-user-name">{studentName}</span>
                <ChevronDown size={15} className="text-muted" />
              </div>
            </div>
          </header>

          <div className="uni-portal-content">
            {statusError && (
              <div className="mb-4"><Alert variant="error">{statusError}</Alert></div>
            )}
            {requestStatus?.status === "verified" && (
              <div className="mb-4">
                <Alert variant="success" title="Your student status is verified">
                  Your account has been approved. <Link to="/login">Sign in to open your dashboard.</Link>
                </Alert>
              </div>
            )}
            {/* ════════════════════════════════════════════════════════════════
                SCREEN 8: RESTRICTED DASHBOARD (PENDING)
               ════════════════════════════════════════════════════════════════ */}
            {activeTab === "dashboard" && (
              <div className="uni-restricted-dashboard-view">
                {/* Amber Warning Card */}
                <div className="uni-pending-banner-card">
                  <div className="uni-pending-banner-icon">
                    <AlertTriangle size={22} color="#b45309" />
                  </div>
                  <div className="uni-pending-banner-body">
                    <h2 className="uni-pending-banner-title">
                      Your student verification is pending
                    </h2>
                    <p className="uni-pending-banner-text">
                      You have limited access to your account while we wait for university staff to
                      verify your student record.
                    </p>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="uni-dashboard-meta-grid">
                  <div className="uni-meta-tile">
                    <span className="uni-meta-label">Request Reference</span>
                    <span className="uni-meta-value font-mono">{reference}</span>
                  </div>
                  <div className="uni-meta-tile">
                    <span className="uni-meta-label">Submitted On</span>
                    <span className="uni-meta-value">{submittedOn}</span>
                  </div>
                </div>

                {/* What Happens Next Card */}
                <div className="uni-next-steps-card">
                  <h3 className="uni-card-section-title">What happens next?</h3>

                  <div className="uni-next-steps-list">
                    <div className="uni-next-step-row">
                      <div className="uni-step-number-circle">1</div>
                      <div className="uni-next-step-content">
                        <p>Your request is being reviewed by your university.</p>
                      </div>
                    </div>

                    <div className="uni-next-step-row">
                      <div className="uni-step-number-circle">2</div>
                      <div className="uni-next-step-content">
                        <p>
                          You'll get a notification once it's approved or if more information is
                          needed.
                        </p>
                      </div>
                    </div>

                    <div className="uni-next-step-row">
                      <div className="uni-step-number-circle">3</div>
                      <div className="uni-next-step-content">
                        <p>In the meantime, you can explore the platform with limited access.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Link to Timeline */}
                <div className="uni-view-timeline-cta">
                  <button
                    type="button"
                    onClick={() => switchTab("timeline")}
                    className="uni-secondary-btn flex items-center gap-2"
                  >
                    <span>View Detailed Verification Timeline</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

                {/* Follow-up / Support Inquiry box */}
                <div className="uni-followup-box">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <MessageSquare size={16} color="#0284c7" />
                    <span>Have questions about your verification?</span>
                  </h4>
                  <p className="text-xs text-muted mb-3">
                    If registry staff require additional documents or details, you can submit an
                    inquiry directly to the academic admissions team.
                  </p>

                  {followUpSent ? (
                    <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      <span>Your inquiry has been submitted to the university registry.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSendFollowUp} className="flex gap-2">
                      <input
                        type="text"
                        value={followUpMsg}
                        onChange={(e) => setFollowUpMsg(e.target.value)}
                        placeholder="Type a message or provide student number..."
                        className="uni-field-input text-xs flex-1"
                      />
                      <button type="submit" className="uni-primary-btn text-xs px-4">
                        <Send size={14} className="inline mr-1" /> Send
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                SCREEN 12: VERIFICATION TIMELINE
               ════════════════════════════════════════════════════════════════ */}
            {activeTab === "timeline" && (
              <div className="uni-timeline-card">
                <div className="uni-timeline-header">
                  <h2 className="uni-card-title">Verification History</h2>
                  <p className="uni-card-subtitle">
                    Track the lifecycle and real-time status of your student onboarding.
                  </p>
                </div>

                <div className="uni-vertical-timeline">
                  {/* Event 1: Account created */}
                  <div className="uni-timeline-item completed">
                    <div className="uni-timeline-indicator">
                      <div className="uni-timeline-dot green">
                        <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.5} />
                      </div>
                      <div className="uni-timeline-line active" />
                    </div>
                    <div className="uni-timeline-details">
                      <span className="uni-timeline-event-name">Account created</span>
                      <span className="uni-timeline-timestamp">Apr 28, 2025 09:31 AM</span>
                    </div>
                  </div>

                  {/* Event 2: Email verified */}
                  <div className="uni-timeline-item completed">
                    <div className="uni-timeline-indicator">
                      <div className="uni-timeline-dot green">
                        <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.5} />
                      </div>
                      <div className="uni-timeline-line active" />
                    </div>
                    <div className="uni-timeline-details">
                      <span className="uni-timeline-event-name">Email verified</span>
                      <span className="uni-timeline-timestamp">Apr 28, 2025 09:37 AM</span>
                    </div>
                  </div>

                  {/* Event 3: Student verification submitted */}
                  <div className="uni-timeline-item current">
                    <div className="uni-timeline-indicator">
                      <div className="uni-timeline-dot blue">
                        <div className="uni-inner-dot" />
                      </div>
                      <div className="uni-timeline-line pending" />
                    </div>
                    <div className="uni-timeline-details">
                      <span className="uni-timeline-event-name">
                        Student verification submitted
                      </span>
                      <span className="uni-timeline-timestamp">Apr 28, 2025 10:12 AM</span>
                    </div>
                  </div>

                  {/* Event 4: Under review */}
                  <div className="uni-timeline-item pending">
                    <div className="uni-timeline-indicator">
                      <div className="uni-timeline-dot grey" />
                      <div className="uni-timeline-line pending" />
                    </div>
                    <div className="uni-timeline-details">
                      <span className="uni-timeline-event-name text-muted">Under review</span>
                      <span className="uni-timeline-timestamp text-muted">Pending</span>
                    </div>
                  </div>

                  {/* Event 5: Final decision */}
                  <div className="uni-timeline-item pending">
                    <div className="uni-timeline-indicator">
                      <div className="uni-timeline-dot grey" />
                    </div>
                    <div className="uni-timeline-details">
                      <span className="uni-timeline-event-name text-muted">Final decision</span>
                      <span className="uni-timeline-timestamp text-muted">Pending</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-border flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => switchTab("dashboard")}
                    className="uni-secondary-btn text-xs"
                  >
                    ← Back to Dashboard
                  </button>

                  <Link to="/app" className="uni-primary-btn text-xs">
                    Preview Verified Student Portal →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
export default PendingStudentPage;

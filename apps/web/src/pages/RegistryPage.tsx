import React, { useState } from "react";
import {
  GraduationCap,
  FileCheck,
  Users,
  UploadCloud,
  BarChart3,
  Settings,
  ChevronDown,
  Menu,
} from "lucide-react";
import { VerificationQueueTab } from "@/components/registry/VerificationQueueTab";
import { RosterConsoleTab } from "@/components/registry/RosterConsoleTab";

export const RegistryPage: React.FC = () => {
  const [activeNav, setActiveNav] = useState<"queue" | "records" | "imports" | "reports" | "settings">("queue");

  return (
    <div className="uni-app-portal-layout">

      <div className="uni-portal-body">
        {/* ── Sidebar matching Screen 9: Verification Queue, Student Records, Imports, Reports, Settings ── */}
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
              className={`uni-sidebar-item ${activeNav === "queue" ? "active" : ""}`}
              onClick={() => setActiveNav("queue")}
            >
              <FileCheck size={18} />
              <span>Verification Queue</span>
            </button>
            <button
              type="button"
              className={`uni-sidebar-item ${activeNav === "records" ? "active" : ""}`}
              onClick={() => setActiveNav("records")}
            >
              <Users size={18} />
              <span>Student Records</span>
            </button>
            <button
              type="button"
              className={`uni-sidebar-item ${activeNav === "imports" ? "active" : ""}`}
              onClick={() => setActiveNav("imports")}
            >
              <UploadCloud size={18} />
              <span>Imports</span>
            </button>
            <button
              type="button"
              className={`uni-sidebar-item ${activeNav === "reports" ? "active" : ""}`}
              onClick={() => setActiveNav("reports")}
            >
              <BarChart3 size={18} />
              <span>Reports</span>
            </button>
            <button
              type="button"
              className={`uni-sidebar-item ${activeNav === "settings" ? "active" : ""}`}
              onClick={() => setActiveNav("settings")}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </nav>
        </aside>

        {/* ── Main Portal Area ── */}
        <main className="uni-portal-main">
          {/* Header matching Screen 9 */}
          <header className="uni-portal-header">
            <div className="uni-header-left">
              <button type="button" className="uni-menu-toggle-btn">
                <Menu size={20} />
              </button>
              <span className="uni-header-page-title">Registry Staff Portal</span>
            </div>

            <div className="uni-header-right">
              <div className="uni-user-dropdown-btn">
                <div className="uni-user-avatar" style={{ backgroundColor: "#0284c7" }}>
                  RS
                </div>
                <span className="uni-user-name">Registry Staff</span>
                <ChevronDown size={15} className="text-muted" />
              </div>
            </div>
          </header>

          <div className="uni-portal-content">
            {/* ════════════════════════════════════════════════════════════════
                SCREEN 9: STAFF REVIEW QUEUE
               ════════════════════════════════════════════════════════════════ */}
            {activeNav === "queue" && (
              <VerificationQueueTab institutionId="must" />
            )}

            {activeNav === "imports" && (
              <RosterConsoleTab institutionId="must" />
            )}

            {activeNav === "records" && (
              <div className="uni-staff-queue-card">
                <h2 className="uni-queue-title mb-4">Student Records Repository</h2>
                <p className="text-muted text-sm mb-6">
                  Manage active student credentials, issue digital certificates, and inspect
                  audit history.
                </p>
                <RosterConsoleTab institutionId="must" />
              </div>
            )}

            {(activeNav === "reports" || activeNav === "settings") && (
              <div className="uni-staff-queue-card p-8 text-center text-muted">
                <p className="font-semibold text-main mb-1">Administrative Module</p>
                <p className="text-xs">
                  Institutional configuration, identity provider sync, and verification metrics.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
export default RegistryPage;

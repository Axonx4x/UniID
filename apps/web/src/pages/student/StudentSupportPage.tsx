import React, { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Camera,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { StudentDashboardResponse } from "@/types";
import { CorrectionRequestModal } from "./CorrectionRequestModal";
import { getUniversityBrand } from "@/config/universities";

interface StudentContextType {
  dashboard: StudentDashboardResponse | null;
  refreshDashboard: () => void;
  loading: boolean;
}

export const StudentSupportPage: React.FC = () => {
  const { dashboard, refreshDashboard } = useOutletContext<StudentContextType>();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const brand = getUniversityBrand(dashboard?.institution?.slug || dashboard?.institution?.name);
  const instName = dashboard?.institution?.name || brand.name;
  const instCode = dashboard?.institution?.institution_code || brand.code;

  const faqs = [
    {
      q: "Why is my Digital ID card not showing or displaying 'Photo Required'?",
      a: "In compliance with university security standards, a verified photo is mandatory before a digital identity card can be issued. Without a photo, you can access your profile and status, but card presentation is withheld. Upload a clear, front-facing photograph in 'Digital ID Card' to activate your card immediately.",
    },
    {
      q: "My programme, campus, or matriculation number has an error. How do I change it?",
      a: "Academic records are authoritative and governed strictly by your institution's registrar. Students cannot edit these fields directly. To correct an error, submit a formal correction request from the 'Requests & Fixes' tab. The registrar team will verify and sync your updated enrollment record.",
    },
    {
      q: "What is the difference between Institutional API and Email Verification?",
      a: "Institutions with live API integration verify your enrollment status directly against the university database in real time. Institutions utilizing email verification require you to confirm access to your institutional email address (@university.edu) followed by registrar roster matching.",
    },
    {
      q: "Can I download or save my Digital ID card as a PDF or image?",
      a: "No. UniID cards use dynamic cryptographic verification to prevent screenshot tampering and forgery. Static screenshots or exported PDFs cannot be verified by campus inspectors. To present your identity, always open the live QR Presentation screen.",
    },
    {
      q: "How does an inspector or campus security verify my card?",
      a: "Present the dynamic QR code on your 'QR Presentation' screen. The security officer scans the code using an authorized UniID verification terminal to instantly confirm validity, active enrollment, and photograph match.",
    },
  ];

  return (
    <div className="uni-student-support-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div className="uni-page-header-row">
        <div>
          <h1 className="uni-page-title">Helpdesk & Support Center</h1>
          <p className="uni-page-sub">
            Find answers to common student wallet questions or contact {instName} support staff.
          </p>
        </div>
        <div className="uni-header-action-group">
          <button
            type="button"
            className="uni-btn-primary"
            onClick={() => setSupportModalOpen(true)}
          >
            <MessageSquare size={16} />
            <span>Submit Support Enquiry</span>
          </button>
        </div>
      </div>

      {/* Support Overview Cards */}
      <div className="uni-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {/* Institutional Contact */}
        <div className="uni-stat-card">
          <div
            className="uni-stat-icon-wrap"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              padding: "4px",
              overflow: "hidden",
            }}
          >
            <img
              src={brand.logoSrc}
              alt={instName}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/assets/logos/unima.png";
              }}
            />
          </div>
          <div className="uni-stat-info">
            <span className="uni-stat-label">Authoritative Registrar</span>
            <span className="uni-stat-value" style={{ fontSize: "16px" }}>{instName}</span>
            <span style={{ fontSize: "12px", color: "#647084", marginTop: "4px" }}>
              Institution Code: <strong>{instCode}</strong>
            </span>
          </div>
        </div>

        {/* Requests Status */}
        <div className="uni-stat-card">
          <div className="uni-stat-icon-wrap" style={{ background: "rgba(35, 123, 75, 0.08)", color: "#237B4B" }}>
            <FileText size={22} />
          </div>
          <div className="uni-stat-info">
            <span className="uni-stat-label">Pending Student Requests</span>
            <span className="uni-stat-value">{dashboard?.pending_requests_count ?? 0}</span>
            <Link
              to="/student/requests"
              style={{ fontSize: "12px", color: "#243B80", fontWeight: 600, textDecoration: "none", marginTop: "4px", display: "inline-block" }}
            >
              View request tracking &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E6EF",
          borderRadius: "16px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #E2E6EF", paddingBottom: "16px" }}>
          <HelpCircle size={20} color="#243B80" />
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#172033" }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  border: "1px solid #E2E6EF",
                  borderRadius: "10px",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    background: isOpen ? "#F8FAFC" : "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#172033",
                  }}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} color="#647084" /> : <ChevronDown size={18} color="#647084" />}
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: "14px 18px",
                      background: "#FFFFFF",
                      borderTop: "1px solid #E2E6EF",
                      fontSize: "14px",
                      color: "#334155",
                      lineHeight: "1.6",
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Assistance Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E6EF",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#243B80" }}>
            <Camera size={20} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Upload ID Photo</h3>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#647084" }}>
            Card issuance requires a verified photo. Upload your photo to activate your credential immediately.
          </p>
          <Link to="/student/id" style={{ fontSize: "13px", color: "#243B80", fontWeight: 600, textDecoration: "none", marginTop: "auto" }}>
            Go to ID Card &rarr;
          </Link>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E6EF",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#237B4B" }}>
            <ShieldCheck size={20} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Verify Enrollment</h3>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#647084" }}>
            Review institutional roster linkage, verification mode, and discrepancy audit status.
          </p>
          <Link to="/student/verification" style={{ fontSize: "13px", color: "#237B4B", fontWeight: 600, textDecoration: "none", marginTop: "auto" }}>
            Check Verification &rarr;
          </Link>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E6EF",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#96620B" }}>
            <FileText size={20} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Correction Request</h3>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#647084" }}>
            Request updates to your study programme, matriculation number, campus, or personal details.
          </p>
          <Link to="/student/requests" style={{ fontSize: "13px", color: "#96620B", fontWeight: 600, textDecoration: "none", marginTop: "auto" }}>
            Submit Request &rarr;
          </Link>
        </div>
      </div>

      {/* Correction / Support Enquiry Modal */}
      {supportModalOpen && (
        <CorrectionRequestModal
          initialField="General Helpdesk Support"
          initialCurrentValue="Student Inquiry"
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
          onSuccess={() => {
            setSupportModalOpen(false);
            refreshDashboard();
          }}
        />
      )}
    </div>
  );
};

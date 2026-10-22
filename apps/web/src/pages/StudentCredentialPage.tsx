import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Printer,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Alert } from "@/components/common/Alert";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/auth/AuthContext";
import { apiClient, ApiError } from "@/services/apiClient";
import { StudentCredentialProfile } from "@/types";
import { universityBrandForName } from "@/config/universities";

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))
    : "Not available";

export const StudentCredentialPage: React.FC = () => {
  const { user } = useAuth();
  const memberships = useMemo(
    () => user?.memberships.filter((item) => item.role === "student") ?? [],
    [user]
  );
  const remembered = sessionStorage.getItem("astramind.institution");
  const [institutionId, setInstitutionId] = useState(
    () => memberships.find((item) => item.institution.id === remembered)?.institution.id ?? memberships[0]?.institution.id ?? ""
  );
  const [profile, setProfile] = useState<StudentCredentialProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!institutionId) return;
    setProfile(null);
    setError(null);
    apiClient
      .getOwnCredential(institutionId)
      .then(setProfile)
      .catch((cause) =>
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Your credential profile could not be loaded. Please try again later."
        )
      );
  }, [institutionId]);

  const handleCopyLink = () => {
    if (profile?.verification_url) {
      navigator.clipboard.writeText(profile.verification_url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!memberships.length) {
    return (
      <section className="page-shell">
        <Alert variant="warning" title="Student access required">
          This account has no active student membership.
        </Alert>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-shell">
        <Link className="back-link" to="/app">
          &larr; Back to Portal
        </Link>
        <Alert variant="error" title="Credential unavailable">
          {error}
        </Alert>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="page-shell">
        <LoadingSpinner message="Loading your digital student ID" />
      </section>
    );
  }

  const credential = profile.credential;
  const status = credential?.status ?? "pending";
  const isActive = status === "active";
  const isSuspended = status === "suspended";
  const isRevoked = status === "revoked";
  const isExpired = status === "expired";
  const institutionBrand = universityBrandForName(profile.institution_name);

  return (
    <section className="page-shell student-credential-section">
      <div className="no-print">
        <Link className="back-link" to="/app">
          &larr; Back to Portal
        </Link>
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Student Credential</p>
            <h1>My Digital Student ID</h1>
            <p className="text-muted">
              Your official digital student identity card issued by your university.
            </p>
          </div>
          <div className="context-picker">
            <label htmlFor="student-context">Institution</label>
            <select
              id="student-context"
              value={institutionId}
              onChange={(event) => setInstitutionId(event.target.value)}
            >
              {memberships.map((item) => (
                <option key={item.id} value={item.institution.id}>
                  {item.institution.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Actual Printable ID Card Component */}
      <div className="id-card-wrapper">
        <div
          className={`uni-id-card student-physical-card ${
            isActive
              ? "card-state-active"
              : isSuspended
              ? "card-state-suspended"
              : isRevoked
              ? "card-state-revoked"
              : "card-state-inactive"
          }`}
        >
          {/* Top Banner Bar */}
          <div
            className={`uni-id-card-header ${
              isActive
                ? "header-active"
                : isSuspended
                ? "header-suspended"
                : isRevoked
                ? "header-revoked"
                : "header-expired"
            }`}
          >
            <div className="uni-id-card-title">
              <GraduationCap size={18} className="uni-id-cap-icon" />
              <span>DIGITAL STUDENT IDENTITY</span>
            </div>
            <div className="card-status-pill">
              {isActive && <Badge variant="success">Active</Badge>}
              {isSuspended && <Badge variant="warning">Suspended</Badge>}
              {isRevoked && <Badge variant="error">Revoked — Void</Badge>}
              {isExpired && <Badge variant="default">Expired</Badge>}
              {!credential && <Badge variant="default">Not Issued</Badge>}
            </div>
          </div>

          {/* Card Body */}
          <div className="uni-id-card-body">
            <div className="uni-id-card-main-row">
              {/* Photo Area */}
              <div className="uni-id-photo-container">
                <img
                  src="/assets/images/student_id_photo.jpg"
                  alt={profile.display_name}
                  className="uni-id-student-photo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80";
                  }}
                />
              </div>

              {/* Student Identification Attributes */}
              <div className="uni-id-student-info">
                <h3 className="uni-id-student-name">{profile.display_name}</h3>
                <p className="uni-id-student-no">
                  <span className="uni-id-label">Student No:</span>{" "}
                  <strong>{profile.student_number}</strong>
                </p>
                <p className="uni-id-programme">
                  <strong>Prog:</strong> {profile.programme_name ?? "Not recorded"}
                </p>
                <p className="uni-id-college">
                  <strong>Campus:</strong> {profile.campus_name ?? "Main Campus"}
                </p>
                <div className="uni-id-dates-inline">
                  <span>Issued: {formatDate(credential?.issued_at ?? null)}</span>
                  <span>Expires: {formatDate(credential?.expires_at ?? null)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Row: University Crest & Dynamic Backend QR Code */}
              <div className="uni-id-card-footer-row">
                <div className="uni-id-institution-crest">
                  <div className="uni-id-crest-icon">
                    {institutionBrand ? (
                      <img className="university-logo" src={institutionBrand.logoSrc} alt={institutionBrand.name + " logo"} />
                    ) : (
                      <GraduationCap size={30} aria-label="Institution crest" />
                    )}
                  </div>
                <div className="institution-text-block">
                  <span className="uni-id-institution-name">{profile.institution_name}</span>
                  <span className="uni-id-trust-tag">Official Institutional ID</span>
                </div>
              </div>

              {/* Dynamic QR Code Rendered From Backend Opaque Reference */}
              <div className="uni-id-qr-box-dynamic">
                {profile.qr_code_data_url ? (
                  <div className="qr-image-container">
                    <img
                      src={profile.qr_code_data_url}
                      alt="Student ID QR Code for official verification"
                      className="qr-img-element"
                    />
                    {!isActive && (
                      <div className="qr-watermark-overlay">
                        <span>NOT VALID</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="qr-placeholder-box">
                    <span>No QR Issued</span>
                  </div>
                )}
                <span className="qr-caption">Scan to Verify</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Utility Actions & Warnings */}
      <div className="card-management-controls no-print">
        <div className="action-buttons-group">
          {credential && (
            <>
              <Button variant="outline" onClick={handlePrint} className="btn-print-card">
                <Printer size={16} />
                <span>Print / Download Card</span>
              </Button>
              {credential.public_reference && (
                <Link
                  to={`/verify/${credential.public_reference}`}
                  className="btn btn-secondary inline-flex-center"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} />
                  <span>Verify Current Status</span>
                </Link>
              )}
            </>
          )}
        </div>

        {profile.verification_url && (
          <div className="verification-url-box">
            <span className="url-label">Verification URL:</span>
            <code className="url-value">{profile.verification_url}</code>
            <button
              type="button"
              className="copy-url-btn"
              onClick={handleCopyLink}
              title="Copy verification link"
            >
              {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            </button>
          </div>
        )}

        {/* Informative Status Explanations */}
        {isActive ? (
          <Card className="status-explainer-card card-valid-explainer">
            <div className="explainer-inner">
              <ShieldCheck size={24} className="text-success" />
              <div>
                <h3>Card is Authoritative and Active</h3>
                <p>
                  Your digital student ID is active and cryptographically verified. When scanned by
                  authorized verifiers or university campus security, it will confirm your active
                  enrollment.
                </p>
              </div>
            </div>
          </Card>
        ) : isSuspended ? (
          <Alert variant="warning" title="Credential Suspended">
            <div className="explainer-content">
              <AlertTriangle size={18} />
              <span>
                This student ID has been temporarily suspended by the university administration. It
                will report as suspended to all verifiers until reinstated by the registry.
              </span>
            </div>
          </Alert>
        ) : isRevoked ? (
          <Alert variant="error" title="Credential Revoked — Inactive">
            <div className="explainer-content">
              <XCircle size={18} />
              <span>
                This digital student ID was revoked and is permanently invalid. It cannot be used
                for campus access, exams, or student discounts.
              </span>
            </div>
          </Alert>
        ) : isExpired ? (
          <Alert variant="warning" title="Credential Expired">
            <div className="explainer-content">
              <Clock size={18} />
              <span>
                This digital ID reached its expiration date on {formatDate(credential?.expires_at ?? null)}.
                Please request a renewal from your university registry.
              </span>
            </div>
          </Alert>
        ) : (
          <Alert variant="warning" title="No Credential Issued">
            No active student credential has been issued for this institution. Please contact your
            registrar.
          </Alert>
        )}
      </div>
    </section>
  );
};

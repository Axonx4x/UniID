import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
  Camera,
  RotateCcw,
  ShieldCheck,
  Building2,
  UserCheck,
  BookOpen,
  Calendar,
} from "lucide-react";
import { apiClient, ApiError } from "@/services/apiClient";
import { VerificationOutcome, VerificationPublicResponse } from "@/types";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { QrScannerModal } from "@/components/scanner/QrScannerModal";

const extractReference = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  // If user pasted a full URL like https://domain.example/verify/cr_xyz or /verify/cr_xyz
  const match = trimmed.match(/\/verify\/([A-Za-z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

const formatDate = (isoString: string | null) => {
  if (!isoString) return "Not recorded";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
};

const formatDateTime = (isoString: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
};

export const VerificationPage: React.FC = () => {
  const { reference: routeReference } = useParams<{ reference?: string }>();
  const navigate = useNavigate();

  const [inputVal, setInputVal] = useState(routeReference ?? "");
  const [activeReference, setActiveReference] = useState<string | null>(routeReference ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationPublicResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const performVerification = async (rawRef: string) => {
    const cleanRef = extractReference(rawRef);
    if (!cleanRef) {
      setError("Please enter a verification reference code or URL.");
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setActiveReference(cleanRef);

    try {
      const data = await apiClient.verifyCredential(cleanRef);
      setResult(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError("Rate limit reached. Too many verification requests from this IP. Please wait a moment.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Unable to connect to the verification service. Please check your network connection and retry.");
      }
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // If page is loaded with a URL parameter like /verify/cr_xyz, verify automatically on mount
  useEffect(() => {
    if (routeReference) {
      setInputVal(routeReference);
      performVerification(routeReference);
    }
  }, [routeReference]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const cleanRef = extractReference(inputVal);
    navigate(`/verify/${cleanRef}`);
    performVerification(cleanRef);
  };

  const handleScanSuccess = (decoded: string) => {
    const cleanRef = extractReference(decoded);
    setInputVal(cleanRef);
    navigate(`/verify/${cleanRef}`);
    performVerification(cleanRef);
  };

  const handleReset = () => {
    setInputVal("");
    setResult(null);
    setError(null);
    setActiveReference(null);
    navigate("/verify");
  };

  const renderOutcomeBadge = (outcome: VerificationOutcome) => {
    switch (outcome) {
      case "valid":
        return <Badge variant="success">Status: VALID &amp; ACTIVE</Badge>;
      case "suspended":
        return <Badge variant="warning">Status: SUSPENDED</Badge>;
      case "revoked":
        return <Badge variant="error">Status: REVOKED</Badge>;
      case "expired":
        return <Badge variant="default">Status: EXPIRED</Badge>;
      case "invalid":
      default:
        return <Badge variant="error">Status: INVALID</Badge>;
    }
  };

  return (
    <section className="page-shell verification-page">
      <div className="verification-hero">
        <div className="verification-hero-badge">
          <ShieldCheck size={16} />
          <span>Digital Student ID Trust Registry</span>
        </div>
        <h1>Official Credential Verification</h1>
        <p className="text-muted">
          Authoritative real-time verification for university student digital identification cards.
          Scanned references query persisted institutional state.
        </p>
      </div>

      {/* Verification Input & Scanning Bar */}
      <Card className="verification-search-card">
        <form onSubmit={handleSubmit} className="verification-form">
          <div className="verification-input-group">
            <Input
              id="verification-ref-input"
              label="Verification URL or Reference Code"
              placeholder="e.g. cr_... or paste the full verification link"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              helperText="Scan the QR code on a student card or paste the reference code here."
            />
          </div>
          <div className="verification-form-actions">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !inputVal.trim()}
              className="btn-verify"
            >
              <Search size={18} />
              <span>Verify ID</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsScannerOpen(true)}
              className="btn-scan"
            >
              <Camera size={18} />
              <span>Scan QR Camera</span>
            </Button>
            {(result || error) && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                className="btn-reset"
                title="Clear and verify another ID"
              >
                <RotateCcw size={18} />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="verification-loading-container" role="status">
          <LoadingSpinner message="Querying authoritative registry records..." />
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <Card className="verification-result-panel panel-error">
          <div className="result-header">
            <div className="result-icon-wrapper icon-error-bg">
              <ShieldAlert size={36} className="text-error" />
            </div>
            <div>
              <h2>Verification Check Failed</h2>
              <p className="result-subtitle">{error}</p>
            </div>
          </div>
          <div className="result-footer-actions">
            <Button
              variant="primary"
              onClick={() => activeReference && performVerification(activeReference)}
            >
              Retry Verification
            </Button>
          </div>
        </Card>
      )}

      {/* Result Panel */}
      {!isLoading && result && (
        <Card className={`verification-result-panel panel-${result.status}`}>
          <div className="result-header">
            <div className={`result-icon-wrapper icon-${result.status}-bg`}>
              {result.status === "valid" && <CheckCircle2 size={36} className="text-success" />}
              {result.status === "suspended" && <AlertTriangle size={36} className="text-warning" />}
              {result.status === "revoked" && <XCircle size={36} className="text-error" />}
              {result.status === "expired" && <Clock size={36} className="text-muted" />}
              {result.status === "invalid" && <ShieldAlert size={36} className="text-error" />}
            </div>
            <div className="result-header-text">
              <div className="result-badge-row">
                {renderOutcomeBadge(result.status)}
                <span className="verification-timestamp">
                  Checked: {formatDateTime(result.verified_at)}
                </span>
              </div>
              <h2>
                {result.status === "valid" && "Authentic Student ID — Valid"}
                {result.status === "suspended" && "Credential Temporarily Suspended"}
                {result.status === "revoked" && "Credential Revoked — Inactive"}
                {result.status === "expired" && "Credential Expired — Inactive"}
                {result.status === "invalid" && "Invalid or Unknown Reference"}
              </h2>
              <p className="result-message">{result.message}</p>
            </div>
          </div>

          <div className="result-details-body">
            {result.status !== "invalid" ? (
              <div className="result-fields-grid">
                <div className="result-field-item">
                  <span className="field-label">
                    <Building2 size={16} />
                    <span>Issuing University</span>
                  </span>
                  <span className="field-value font-semibold">
                    {result.institution_name ?? "Not recorded"}
                  </span>
                </div>

                <div className="result-field-item">
                  <span className="field-label">
                    <UserCheck size={16} />
                    <span>Student Full Name</span>
                  </span>
                  <span className="field-value font-semibold">
                    {result.student_display_name ?? "Not recorded"}
                  </span>
                </div>

                <div className="result-field-item">
                  <span className="field-label">
                    <BookOpen size={16} />
                    <span>Enrolled Programme</span>
                  </span>
                  <span className="field-value">
                    {result.programme_name ?? "Not recorded"}
                  </span>
                </div>

                <div className="result-field-item">
                  <span className="field-label">
                    <Calendar size={16} />
                    <span>Effective Dates</span>
                  </span>
                  <span className="field-value">
                    Issued: {formatDate(result.issued_at)} &bull; Valid Until: {formatDate(result.expires_at)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="invalid-explainer">
                <p>
                  The reference <code>{activeReference}</code> does not match any current or former
                  eligible digital student credential. It may have been typed incorrectly or issued by an
                  unrecognized provider.
                </p>
              </div>
            )}

            {/* Privacy & Trust Notice */}
            <div className="verification-privacy-callout">
              <p>
                <strong>Privacy Notice:</strong> For student data protection, this public registry
                service reveals only minimal visual verification attributes. Internal student ID
                numbers, dates of birth, contact details, payment history, and administrative event
                logs are strictly protected and never disclosed.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* QR Scanner Camera Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanSuccess}
      />
    </section>
  );
};

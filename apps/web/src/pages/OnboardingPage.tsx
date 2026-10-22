import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
  Plug,
  FileText,
  Clock,
  Check,
  X,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  User,
  Hash,
  ChevronDown,
} from "lucide-react";
import { apiClient, ApiError } from "@/services/apiClient";
import { Alert } from "@/components/common/Alert";
import { useAuth } from "@/auth/AuthContext";
import { UNIVERSITY_BRANDS } from "@/config/universities";

type FlowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [searchParams] = useSearchParams();

  // If already signed in, directly route to main dashboard
  if (user) {
    return <Navigate to="/app" replace />;
  }

  const screenParam = searchParams.get("screen");
  if (screenParam === "8") return <Navigate to="/pending" replace />;
  if (screenParam === "9") return <Navigate to="/app/registry" replace />;
  if (screenParam === "10") return <Navigate to="/app" replace />;
  if (screenParam === "12") return <Navigate to="/pending?tab=timeline" replace />;

  return <OnboardingFlowContent navigate={navigate} login={login} />;
};

interface FlowContentProps {
  navigate: (to: string, options?: { replace?: boolean }) => void;
  login: (email: string, pass: string) => Promise<void>;
}

const OnboardingFlowContent: React.FC<FlowContentProps> = ({ navigate, login }) => {
  const [searchParams] = useSearchParams();

  // Step 1: Combined institutional selection & account registration
  // Step 2: Email OTP verification
  // Step 3: Choose verification method
  // Step 4: Verification progress (API check)
  // Step 5: Verification success (API)
  // Step 6: Verification pending (Staff review)
  // Step 7: Verification rejected
  const [step, setStep] = useState<FlowStep>(() => {
    const s = searchParams.get("screen") || searchParams.get("step");
    if (s === "3") return 2;
    if (s === "4") return 3;
    if (s === "5") return 4;
    if (s === "6") return 5;
    if (s === "7") return 6;
    if (s === "11") return 7;
    return 1;
  });

  // Form inputs
  // UNILIA is the current, fully configured synthetic test tenant. Its
  // automated path reaches the dashboard without implying a live SIS link.
  const [selectedSlug, setSelectedSlug] = useState<string>("unilia");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // OTP inputs (6 individual boxes)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(154); // 02:34
  const [resending, setResending] = useState(false);

  // Verification method choice
  const [verificationMethod, setVerificationMethod] = useState<"api" | "file">("api");

  // API Check stages
  const [apiCheckStage, setApiCheckStage] = useState<number>(1);

  // Session state
  const [reference, setReference] = useState<string>("VR-2025-00123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDomainConfirmation, setShowDomainConfirmation] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  // Present only when the explicitly simulated development mailbox is enabled.
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  // Pathway outcome from OTP verification
  const [pathwayOutcome, setPathwayOutcome] = useState<string | null>(null);

  // Dropdown state
  const [institutionDropdownOpen, setInstitutionDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setInstitutionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedInstitution = useMemo(
    () => UNIVERSITY_BRANDS.find((i) => i.slug === selectedSlug) || UNIVERSITY_BRANDS[0],
    [selectedSlug]
  );

  // Email domain validation feedback
  const emailDomain = useMemo(() => {
    if (!email.includes("@")) return "";
    return email.split("@")[1].toLowerCase();
  }, [email]);

  const isDomainAllowed = useMemo(() => {
    if (!emailDomain) return null;
    return selectedInstitution.allowedDomains.some((d) => d.toLowerCase() === emailDomain);
  }, [emailDomain, selectedInstitution]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  useEffect(() => {
    if (!isDomainAllowed) {
      setShowDomainConfirmation(false);
      return;
    }
    setShowDomainConfirmation(true);
    const timeout = window.setTimeout(() => setShowDomainConfirmation(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [isDomainAllowed, selectedInstitution.slug]);

  useEffect(() => {
    if (!passwordsMatch) {
      setShowPasswordConfirmation(false);
      return;
    }
    setShowPasswordConfirmation(true);
    const timeout = window.setTimeout(() => setShowPasswordConfirmation(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [passwordsMatch]);

  // Set default placeholder email when institution changes
  const handleSelectInstitution = (slug: string) => {
    setSelectedSlug(slug);
    const inst = UNIVERSITY_BRANDS.find((i) => i.slug === slug);
    if (inst && !email) {
      setEmail(`john.doe@${inst.allowedDomains[0]}`);
    }
  };

  // OTP Countdown timer
  useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step !== 2 || !email) return;
    let cancelled = false;
    setDevOtpCode(null);
    const timer = window.setTimeout(async () => {
      try {
        const mailbox = await apiClient.getDevMailbox(email.trim().toLowerCase());
        if (!cancelled && mailbox.entry?.code) setDevOtpCode(mailbox.entry.code);
      } catch {
        // SMTP mode and production intentionally do not expose a code.
      }
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [step, email]);

  // Step 4: Live auto-advance animation
  useEffect(() => {
    if (step !== 4) return;
    setApiCheckStage(1);
    const t1 = setTimeout(() => setApiCheckStage(2), 700);
    const t2 = setTimeout(() => setApiCheckStage(3), 1500);
    const t3 = setTimeout(() => setApiCheckStage(4), 2200);
    // After animation, route to step 5 (success) or 6 (review) based on actual outcome
    const t4 = setTimeout(() => {
      if (pathwayOutcome === "api_auto_verified") {
        setStep(5);
      } else {
        // api_found_ineligible, api_not_found, or any other outcome -> staff review
        setStep(6);
      }
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [step, pathwayOutcome]);

  // Step 1: Combined Registration Submit
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim()) {
      setError("Registration number is required.");
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    if (!isDomainAllowed) {
      setError("Use a recognized " + selectedInstitution.code + " institutional email address.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const resp = await apiClient.registerStudent({
        institution_slug: selectedInstitution.slug,
        email: email.trim(),
        full_name: fullName.trim() || "John Doe",
        password,
        student_number: studentNumber.trim(),
      });
      if (resp.reference) setReference(resp.reference);
      setTimerSeconds(154);
      setOtpDigits(["", "", "", "", "", ""]);
      setStep(2);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.code === "NETWORK_ERROR"
          ? "We couldn't reach the onboarding service. Start the API, then try again."
          : cause instanceof ApiError
          ? cause.message
          : "We couldn't create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // OTP handlers
  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      const pasted = val.replace(/\D/g, "").slice(0, 6);
      if (pasted.length > 0) {
        const nextDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          nextDigits[i] = pasted[i] || "";
        }
        setOtpDigits(nextDigits);
        const focusIdx = Math.min(pasted.length, 5);
        otpInputRefs.current[focusIdx]?.focus();
      }
      return;
    }
    const digit = val.replace(/\D/g, "");
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyEmail = async (e: FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const result = await apiClient.verifyOnboardingCode({
        reference,
        code,
      });

      // The backend owns the verification decision. The client only renders the
      // returned state; it never advances an offline request as if it succeeded.
      const outcome = result?.pathway_outcome || null;
      setPathwayOutcome(outcome);

      if (outcome === "api_auto_verified") {
        setStep(5);
      } else if (
        outcome === "api_found_ineligible" ||
        outcome === "api_not_found" ||
        outcome === "roster_matched_pending_review" ||
        outcome === "file_review_no_match"
      ) {
        // Any review pathway: go straight to pending review screen
        setStep(6);
      } else {
        setError(result?.message || "We couldn't determine the next verification step.");
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.code === "NETWORK_ERROR"
          ? "We couldn't reach the verification service. Check that the API is running and try again."
          : cause instanceof ApiError
          ? cause.message
          : "We couldn't verify that code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timerSeconds > 0) return;
    setResending(true);
    try {
      await apiClient.resendOnboardingCode(reference);
      setTimerSeconds(154);
      setOtpDigits(["", "", "", "", "", ""]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "We couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleProceedVerificationMethod = () => {
    if (verificationMethod === "api") {
      setStep(4);
    } else {
      setStep(6);
    }
  };

  const handleCompleteAndSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/app", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Your account was verified, but sign-in failed. Please sign in.");
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="uni-onboarding-shell" style={{ position: "relative", overflow: "hidden" }}>
      {/* Contextual Background: Holographic Digital ID Cards & Security Geometry */}
      <div className="uni-bg-context-decorations" aria-hidden="true">
        <div className="uni-ambient-glow-1" />
        <div className="uni-ambient-glow-2" />
        <svg className="uni-bg-security-geometry" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="onbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0066FF" stopOpacity="0.14" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <pattern id="onbMesh" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#0066FF" strokeWidth="0.75" strokeOpacity="0.04" />
              <circle cx="24" cy="24" r="1.5" fill="#0066FF" fillOpacity="0.07" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#onbMesh)" />
          <path d="M-100,160 C250,60 450,300 850,200 C1250,100 1380,260 1600,180" stroke="url(#onbGrad)" strokeWidth="2" fill="none" />
          <path d="M-100,480 C320,380 520,640 920,520 C1320,400 1420,580 1620,500" stroke="url(#onbGrad)" strokeWidth="1.75" fill="none" />
        </svg>

        {/* Floating Contextual ID Card Outline in Onboarding */}
        <div className="uni-bg-floating-card-1" style={{ top: "80px", right: "-30px", opacity: 0.55 }}>
          <div className="uni-card-ghost-header">
            <div className="uni-card-ghost-logo">
              <GraduationCap size={16} />
              <span>DIGITAL STUDENT IDENTITY</span>
            </div>
            <div className="uni-card-ghost-chip" />
          </div>
          <div className="uni-card-ghost-body">
            <div className="uni-card-ghost-avatar" />
            <div className="uni-card-ghost-lines">
              <div className="uni-ghost-line w-80" />
              <div className="uni-ghost-line w-60" />
              <div className="uni-ghost-line w-40" />
            </div>
          </div>
          <div className="uni-card-ghost-footer">
            <span>OFFICIAL UNIVERSITY ENROLLMENT</span>
            <span>SECURE ID</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1: COMBINED INSTITUTIONAL SELECTION & ACCOUNT SETUP
          Split card: Left navy hero banner with campus clock tower, Right combined form
         ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="uni-screen-1-wrapper" style={{ maxWidth: "1040px", position: "relative", zIndex: 1 }}>
          <div className="uni-screen-1-card" style={{ gridTemplateColumns: "380px 1fr" }}>
            {/* Left Hero Column */}
            <div className="uni-hero-column">
              <div className="uni-hero-content">
                <div className="uni-hero-logo">
                  <div className="uni-logo-mark">
                    <GraduationCap size={20} color="#ffffff" />
                  </div>
                  <span className="uni-logo-text">UniID</span>
                </div>

                <div className="uni-hero-lead">
                  <h2>Welcome to UniID</h2>
                  <p>Your digital student identity for a smarter tomorrow.</p>
                </div>

                <ul className="uni-hero-features">
                  <li>
                    <span className="feature-icon-badge">
                      <Building2 size={16} />
                    </span>
                    <span>Access your university services</span>
                  </li>
                  <li>
                    <span className="feature-icon-badge">
                      <ShieldCheck size={16} />
                    </span>
                    <span>Manage your credentials</span>
                  </li>
                  <li>
                    <span className="feature-icon-badge">
                      <Sparkles size={16} />
                    </span>
                    <span>Stay connected</span>
                  </li>
                </ul>
              </div>

              {/* Background Campus Photo overlay */}
              <div className="uni-hero-image-wrap">
                <img
                  src="/assets/images/campus_clock_tower.jpg"
                  alt="University Campus"
                  className="uni-hero-bg-img"
                />
                <div className="uni-hero-gradient-overlay" />
              </div>
            </div>

            {/* Right Form Column: Combined Institutional + Account Steps */}
            <div className="uni-select-column" style={{ padding: "32px 36px" }}>
              <div className="uni-select-header">
                <div className="uni-select-top-link">
                  <span>Already have an account? </span>
                  <Link to="/login" className="uni-text-link">
                    Sign In
                  </Link>
                </div>

                <h1 className="uni-select-title">Create your student account</h1>
                <p className="uni-select-subtitle">
                  Select your university and configure your institutional credentials.
                </p>
              </div>

              {error && (
                <div className="mb-4">
                  <Alert variant="error">{error}</Alert>
                </div>
              )}

              <form onSubmit={handleRegister} className="uni-combined-form">
                {/* 1. University Selection Custom Professional Dropdown */}
                <div className="uni-field-group">
                  <div className="uni-custom-select-container" ref={dropdownRef}>
                    <label className="uni-field-label" id="uni-select-label">
                      <Building2 size={14} className="inline mr-1 text-primary" /> Select Your University
                    </label>
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={institutionDropdownOpen}
                      aria-labelledby="uni-select-label"
                      className={`uni-custom-select-trigger ${institutionDropdownOpen ? "active" : ""}`}
                      onClick={() => setInstitutionDropdownOpen((prev) => !prev)}
                    >
                      <div className="uni-custom-select-selected-info">
                        <div className={`uni-select-emblem university-logo-frame university-logo-frame--${selectedInstitution.slug}`}>
                          <img className="university-logo" src={selectedInstitution.logoSrc} alt="" />
                        </div>
                        <div className="uni-select-selected-texts">
                          <div className="uni-select-selected-name">
                            {selectedInstitution.name}
                          </div>
                          <div className="uni-select-selected-domain">
                            Institutional email format &bull; @{selectedInstitution.allowedDomains[0]}
                          </div>
                        </div>
                      </div>
                      <div className="uni-select-right-actions">
                        <span
                          className="uni-select-code-badge"
                          style={{
                            backgroundColor: selectedInstitution.badgeBg,
                            color: selectedInstitution.badgeColor,
                          }}
                        >
                          {selectedInstitution.code}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`uni-select-chevron ${institutionDropdownOpen ? "open" : ""}`}
                        />
                      </div>
                    </button>

                    {institutionDropdownOpen && (
                      <ul className="uni-custom-select-menu" role="listbox">
                        {UNIVERSITY_BRANDS.map((inst) => {
                          const isSelected = inst.slug === selectedSlug;
                          return (
                            <li
                              key={inst.slug}
                              role="option"
                              aria-selected={isSelected}
                              className={`uni-custom-select-item ${isSelected ? "selected" : ""}`}
                              onClick={() => {
                                handleSelectInstitution(inst.slug);
                                setInstitutionDropdownOpen(false);
                              }}
                            >
                              <div className={`uni-select-item-emblem university-logo-frame university-logo-frame--${inst.slug}`}>
                                <img className="university-logo" src={inst.logoSrc} alt="" />
                              </div>
                              <div className="uni-select-item-details">
                                <div className="uni-select-item-title-row">
                                  <span className="uni-select-item-name">{inst.name}</span>
                                  <span
                                    className="uni-select-item-code"
                                    style={{ backgroundColor: inst.badgeBg, color: inst.badgeColor }}
                                  >
                                    {inst.code}
                                  </span>
                                </div>
                                <div className="uni-select-item-domain">
                                  @{inst.allowedDomains[0]}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="uni-select-item-check">
                                  <Check size={16} />
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* 2. Full Name & Student Registration Number in 2-column grid */}
                <div className="form-grid-2">
                  <div className="uni-field-group">
                    <label className="uni-field-label">
                      <User size={14} className="inline mr-1 text-primary" /> Full Legal Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Chisomo Banda"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="uni-field-input"
                      required
                    />
                  </div>

                  <div className="uni-field-group">
                    <label className="uni-field-label">
                      <Hash size={14} className="inline mr-1 text-primary" /> Registration Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MU123456"
                      value={studentNumber}
                      onChange={(e) => setStudentNumber(e.target.value)}
                      className="uni-field-input"
                      required
                    />
                  </div>
                </div>

                {/* 3. Institutional Email */}
                <div className="uni-field-group">
                  <label className="uni-field-label">
                    <Mail size={14} className="inline mr-1 text-primary" /> Institutional Email Address
                  </label>
                  <input
                    type="email"
                    placeholder={`e.g. yourname@${selectedInstitution.allowedDomains[0]}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="uni-field-input"
                    required
                  />
                  {showDomainConfirmation && (
                    <div
                      className="inline-success-feedback"
                      role="status"
                      aria-live="polite"
                    >
                      <CheckCircle2 size={14} />
                      <span>{selectedInstitution.code} institutional domain recognized</span>
                    </div>
                  )}
                  {emailDomain && isDomainAllowed === false && (
                    <div className="inline-warning-feedback" role="status">
                      Please use an email domain associated with {selectedInstitution.name}.
                    </div>
                  )}
                </div>

                {/* 4. Password & Confirm Password */}
                <div className="form-grid-2">
                  <div className="uni-field-group">
                    <label className="uni-field-label">Password</label>
                    <div className="uni-input-eye-wrap">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="uni-field-input"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="uni-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="uni-field-group">
                    <label className="uni-field-label">Confirm Password</label>
                    <div className="uni-input-eye-wrap">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="uni-field-input"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="uni-eye-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {showPasswordConfirmation && (
                      <div className="inline-success-feedback" role="status" aria-live="polite">
                        <CheckCircle2 size={14} />
                        <span>Passwords match</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Terms Agreement */}
                <div className="uni-checkbox-row" style={{ margin: "12px 0 18px" }}>
                  <input
                    type="checkbox"
                    id="terms-check"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="uni-checkbox"
                    required
                  />
                  <label htmlFor="terms-check" className="uni-checkbox-label">
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </div>

                {/* 6. Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="uni-primary-btn w-full"
                  style={{ padding: "12px 20px", fontSize: "0.9375rem" }}
                >
                  {loading ? "Creating account..." : "Create Account & Continue"}
                </button>

                <div className="uni-select-footer-note" style={{ marginTop: "16px", paddingTop: "12px" }}>
                  <p>
                    Your university will verify your student status and approve your access to UniID.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEPS 2 TO 6: STEP CARD CONTAINER (4-Step Progress Header)
         ══════════════════════════════════════════════════════════════════════ */}
      {step > 1 && (
        <div className="uni-step-card-wrapper">
          <div className="uni-step-card">
            {/* Top Navigation & Stepper Header */}
            <div className="uni-card-top-nav">
              <div className="uni-top-logo">
                <div className="uni-logo-mark-blue">
                  <GraduationCap size={20} color="#1e88e5" />
                </div>
                <span className="uni-logo-text-dark">UniID</span>
              </div>

              {/* Step indicator */}
              <div className="uni-stepper-progress">
                <span className="uni-step-label">
                  Step {step === 2 ? 2 : step === 3 ? 3 : 4} of 4
                </span>
                <div className="uni-progress-track">
                  <div className="uni-progress-node completed" />
                  <div className={`uni-progress-segment ${step >= 2 ? "active" : ""}`} />
                  <div className={`uni-progress-node ${step >= 2 ? "completed" : ""}`} />
                  <div className={`uni-progress-segment ${step >= 3 ? "active" : ""}`} />
                  <div className={`uni-progress-node ${step >= 3 ? "completed" : ""}`} />
                  <div className={`uni-progress-segment ${step >= 4 ? "active" : ""}`} />
                  <div className={`uni-progress-node ${step >= 5 ? "completed" : ""}`} />
                </div>
              </div>
            </div>

            {error && (
              <div className="uni-card-alert mb-4">
                <Alert variant="error">{error}</Alert>
              </div>
            )}

            {/* ── STEP 2: VERIFY YOUR EMAIL ADDRESS ── */}
            {step === 2 && (
              <div className="uni-centered-step-content">
                <h1 className="uni-card-title text-center">Verify your email address</h1>
                <p className="uni-card-subtitle text-center max-w-md mx-auto">
                  We've sent a 6-digit verification code to{" "}
                  <strong className="text-main">{email || "your institutional email"}</strong>. Enter the
                  code below to continue.
                </p>

                <form onSubmit={handleVerifyEmail} className="uni-otp-form">
                  <div className="uni-otp-boxes-row">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="uni-otp-box"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  {devOtpCode && (
                    <div className="uni-dev-otp-pill" role="status" aria-live="polite">
                      <Sparkles size={13} />
                      <span>
                        Simulated test code: <strong style={{ fontFamily: "monospace", letterSpacing: "0.1em" }}>{devOtpCode}</strong>
                      </span>
                      <button
                        type="button"
                        className="uni-dev-autofill-btn"
                        onClick={() => {
                          const next = Array.from({ length: 6 }, (_, index) => devOtpCode[index] || "");
                          setOtpDigits(next);
                          otpInputRefs.current[5]?.focus();
                        }}
                      >
                        Autofill
                      </button>
                    </div>
                  )}

                  <div className="uni-resend-row">
                    {timerSeconds > 0 ? (
                      <span className="uni-timer-text">
                        Resend code in {formatTimer(timerSeconds)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resending}
                        className="uni-resend-btn"
                      >
                        <RotateCcw size={14} className="inline mr-1" />
                        {resending ? "Sending code..." : "Resend code"}
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpDigits.join("").length !== 6}
                    className="uni-primary-btn max-w-sm mx-auto w-full"
                  >
                    {loading ? "Verifying..." : "Verify & Continue"}
                  </button>

                  <p className="uni-otp-footer-help">
                    Didn't receive the code? Check your spam folder or request a new code.
                  </p>
                </form>
              </div>
            )}

            {/* ── STEP 3: CHOOSE VERIFICATION METHOD ── */}
            {step === 3 && (
              <div className="uni-verification-method-layout">
                <h1 className="uni-card-title">Verify your student status</h1>
                <p className="uni-card-subtitle">
                  Your university requires one of the following methods to confirm your student record.
                </p>

                <div className="uni-method-cards-list">
                  {/* Option 1: API */}
                  <div
                    className={`uni-method-card ${verificationMethod === "api" ? "selected" : ""}`}
                    onClick={() => setVerificationMethod("api")}
                  >
                    <div className="uni-method-radio">
                      <div
                        className={`uni-radio-circle ${verificationMethod === "api" ? "active" : ""}`}
                      >
                        {verificationMethod === "api" && <div className="uni-radio-dot" />}
                      </div>
                    </div>

                    <div className="uni-method-icon-wrap">
                      <Plug size={20} color="#1e88e5" />
                    </div>

                    <div className="uni-method-body">
                      <div className="uni-method-header-row">
                        <span className="uni-method-name">Check via university system (API)</span>
                        <span className="uni-recommended-badge">Recommended</span>
                      </div>
                      <p className="uni-method-desc">
                        We'll verify your student record and status directly with your university's system.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Email + Record File */}
                  <div
                    className={`uni-method-card ${verificationMethod === "file" ? "selected" : ""}`}
                    onClick={() => setVerificationMethod("file")}
                  >
                    <div className="uni-method-radio">
                      <div
                        className={`uni-radio-circle ${verificationMethod === "file" ? "active" : ""}`}
                      >
                        {verificationMethod === "file" && <div className="uni-radio-dot" />}
                      </div>
                    </div>

                    <div className="uni-method-icon-wrap">
                      <FileText size={20} color="#1e88e5" />
                    </div>

                    <div className="uni-method-body">
                      <span className="uni-method-name">Email + record file (staff review)</span>
                      <p className="uni-method-desc">
                        You'll be verified using your institutional email and the university's student
                        roster. Your account will be pending approval.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="uni-method-actions-bar">
                  <button
                    type="button"
                    onClick={handleProceedVerificationMethod}
                    className="uni-primary-btn"
                  >
                    Proceed with {verificationMethod === "api" ? "API Verification" : "Staff Review"}
                  </button>
                </div>

                <p className="uni-method-support-footer">
                  Need help? Contact your university's student support.
                </p>
              </div>
            )}

            {/* ── STEP 4: API VERIFICATION IN PROGRESS ── */}
            {step === 4 && (
              <div className="uni-api-verifying-layout">
                <h1 className="uni-card-title">Verifying your student record</h1>
                <p className="uni-card-subtitle">
                  We're checking your details with the university's system. This usually takes a few seconds.
                </p>

                <div className="uni-checklist-container">
                  <div className="uni-checklist-item completed">
                    <div className="uni-check-icon-circle green">
                      <Check size={14} color="#ffffff" strokeWidth={3} />
                    </div>
                    <span className="uni-check-label">Checking student record</span>
                  </div>

                  <div className={`uni-checklist-item ${apiCheckStage >= 2 ? "active" : "pending"}`}>
                    {apiCheckStage >= 3 ? (
                      <div className="uni-check-icon-circle green">
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="uni-check-icon-circle pulsing">
                        <div className="uni-pulsing-spinner" />
                      </div>
                    )}
                    <span className="uni-check-label">Validating enrollment status</span>
                  </div>

                  <div className={`uni-checklist-item ${apiCheckStage >= 3 ? "active" : "pending"}`}>
                    {apiCheckStage >= 4 ? (
                      <div className="uni-check-icon-circle green">
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </div>
                    ) : apiCheckStage === 3 ? (
                      <div className="uni-check-icon-circle pulsing">
                        <div className="uni-pulsing-spinner" />
                      </div>
                    ) : (
                      <div className="uni-check-icon-circle empty" />
                    )}
                    <span className="uni-check-label">Confirming institution and programme</span>
                  </div>

                  <div className={`uni-checklist-item ${apiCheckStage >= 4 ? "completed" : "pending"}`}>
                    {apiCheckStage >= 4 ? (
                      <div className="uni-check-icon-circle green">
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="uni-check-icon-circle empty" />
                    )}
                    <span className="uni-check-label">Finalizing verification</span>
                  </div>
                </div>

                <div className="uni-secure-banner">
                  <ShieldCheck size={18} color="#0284c7" />
                  <span>This process is secure and handled by your university and UniID.</span>
                </div>
              </div>
            )}

            {/* ── STEP 5: API VERIFICATION SUCCESS ── */}
            {step === 5 && (
              <div className="uni-api-success-layout">
                <div className="uni-large-success-circle">
                  <Check size={36} color="#ffffff" strokeWidth={3} />
                </div>

                <h1 className="uni-card-title text-center">Student record verified</h1>
                <p className="uni-card-subtitle text-center">
                  Your student record has been confirmed with the university's system.
                </p>

                <div className="uni-record-details-card">
                  <div className="uni-detail-row">
                    <span className="uni-detail-key">Registration Number</span>
                    <span className="uni-detail-value font-mono font-bold">
                      {studentNumber || "MU123456"}
                    </span>
                  </div>
                  <div className="uni-detail-row">
                    <span className="uni-detail-key">Programme</span>
                    <span className="uni-detail-value">BSc Computer Science</span>
                  </div>
                  <div className="uni-detail-row">
                    <span className="uni-detail-key">Campus</span>
                    <span className="uni-detail-value">Main Campus</span>
                  </div>
                  <div className="uni-detail-row border-none pb-0">
                    <span className="uni-detail-key">Status</span>
                    <span className="uni-active-status-badge">Active</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCompleteAndSignIn}
                  disabled={loading}
                  className="uni-primary-btn w-full mt-6"
                >
                  {loading ? "Opening dashboard..." : "Continue to Dashboard"}
                </button>
              </div>
            )}

            {/* ── STEP 6: EMAIL + RECORD FILE (STAFF REVIEW PENDING) ── */}
            {step === 6 && (
              <div className="uni-pending-review-layout">
                <div className="uni-pending-icon-circle">
                  <div className="uni-clock-doc-badge">
                    <FileText size={32} color="#1e88e5" />
                    <div className="uni-clock-overlay">
                      <Clock size={16} color="#ffffff" />
                    </div>
                  </div>
                </div>

                <h1 className="uni-card-title text-center">Verification in progress</h1>
                <p className="uni-card-subtitle text-center max-w-lg mx-auto">
                  Your email has been verified. We've matched your details with the university's student
                  records and sent your request for review.
                </p>

                <div className="uni-status-meta-card">
                  <div className="uni-detail-row">
                    <span className="uni-detail-key">Current status</span>
                    <span className="uni-pending-review-badge">Pending Review</span>
                  </div>
                  <div className="uni-detail-row">
                    <span className="uni-detail-key">Reference number</span>
                    <span className="uni-detail-value font-mono font-bold">{reference}</span>
                  </div>
                  <div className="uni-detail-row border-none pb-0">
                    <span className="uni-detail-key">Submitted on</span>
                    <span className="uni-detail-value">Apr 29, 2025 10:24 AM</span>
                  </div>
                </div>

                <p className="uni-pending-time-notice">
                  You will be notified once the review is complete. This usually takes 1-3 business days.
                </p>

                <div className="uni-center-actions">
                  <button
                    type="button"
                    onClick={() => navigate(`/pending/${reference}`)}
                    className="uni-primary-btn w-full max-w-sm"
                  >
                    Go to Restricted Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 7: VERIFICATION REJECTED ── */}
            {step === 7 && (
              <div className="uni-rejected-layout max-w-lg mx-auto text-center">
                <div className="uni-rejected-icon-circle">
                  <X size={32} color="#0284c7" strokeWidth={2.5} />
                </div>

                <h1 className="uni-card-title text-center">Verification rejected</h1>
                <p className="uni-card-subtitle text-center">
                  We could not verify your student status with the information provided.
                </p>

                <div className="uni-rejected-reason-box text-left">
                  <div className="uni-reason-title">Reason</div>
                  <p className="uni-reason-text">
                    The provided student record could not be matched with active student records at{" "}
                    {selectedInstitution.name}.
                  </p>
                </div>

                <div className="uni-rejected-buttons-row">
                  <a href="#support" className="uni-secondary-btn flex-1 text-center">
                    Contact Support
                  </a>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="uni-primary-btn flex-1"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default OnboardingPage;

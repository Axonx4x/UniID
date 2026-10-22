import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  CreditCard,
  ShieldCheck,
  FileText,
  Bell,
  Clock,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  HelpCircle,
  Lock,
  Search,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { apiClient } from "@/services/apiClient";
import { StudentDashboardResponse } from "@/types";
import { getUniversityBrand } from "@/config/universities";

export const StudentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchDashboard = async () => {
    try {
      const data = await apiClient.getStudentDashboard();
      setDashboard(data);
    } catch {
      // Handled gracefully with fallback UI state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [location.pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const instBrand = getUniversityBrand(dashboard?.institution?.slug || dashboard?.institution?.name);
  const institutionName = dashboard?.institution?.name || instBrand.name;
  const institutionLogo = instBrand.logoSrc;
  const displayName = dashboard?.account?.full_name || user?.full_name || "Chisomo Banda";
  const studentNo = dashboard?.student?.student_number || "2024/00123";
  const unreadCount = dashboard?.unread_notifications_count ?? 3;
  const pendingRequestsCount = dashboard?.pending_requests_count ?? 0;

  const rawPhoto = dashboard?.student?.photo_url;
  const photoUrl = rawPhoto
    ? rawPhoto.startsWith("http")
      ? rawPhoto
      : rawPhoto.startsWith("/")
      ? rawPhoto
      : `/api/v1${rawPhoto}`
    : "/assets/images/student_id_photo.jpg";

  return (
    <div className="uni-student-portal-layout">
      {/* ── Top Header Bar (Full Width & Clean) ───────────────────────────── */}
      <header className="uni-student-topbar-clean" role="banner">
        <div className="uni-topbar-brand-section">
          <button
            type="button"
            className="uni-mobile-menu-btn mobile-only"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>

          <Link to="/student" className="uni-topbar-logo-link">
            <div className="uni-topbar-logo-icon">
              <GraduationCap size={22} color="#ffffff" />
            </div>
            <div className="uni-topbar-brand-copy">
              <div className="uni-topbar-brand-name">UniID</div>
              <div className="uni-topbar-brand-tagline">
                Digital Student Identity for a Smarter Tomorrow
              </div>
            </div>
          </Link>
        </div>

        <div className="uni-topbar-controls-section">
          {/* Global Search Bar */}
          <div className="uni-topbar-search-wrap">
            <Search size={16} className="uni-search-icon" />
            <input
              type="text"
              placeholder="Search..."
              className="uni-search-input"
              aria-label="Search dashboard"
            />
          </div>

          {/* Notifications Bell */}
          <Link
            to="/student/notifications"
            className="uni-topbar-notification-btn"
            title="View notifications"
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="uni-topbar-badge-counter">{unreadCount}</span>
            )}
          </Link>

          {/* User Profile Pill & Dropdown */}
          <div className="uni-user-dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className="uni-topbar-user-pill"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              aria-expanded={userDropdownOpen}
              aria-haspopup="true"
            >
              <img
                src={photoUrl}
                alt={displayName}
                className="uni-topbar-user-avatar"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/assets/images/student_id_photo.jpg";
                }}
              />
              <span className="uni-topbar-user-name">{displayName}</span>
              <ChevronDown size={14} className={`uni-chevron ${userDropdownOpen ? "open" : ""}`} />
            </button>

            {userDropdownOpen && (
              <div className="uni-user-dropdown-menu">
                <div className="uni-dropdown-header">
                  <div className="uni-dropdown-name">{displayName}</div>
                  <div className="uni-dropdown-meta">Student No: {studentNo}</div>
                  <div className="uni-dropdown-badge">Verified Student</div>
                </div>
                <div className="uni-dropdown-divider" />
                <Link
                  to="/student/profile"
                  className="uni-dropdown-item"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <User size={15} />
                  <span>My Profile</span>
                </Link>
                <Link
                  to="/student/id"
                  className="uni-dropdown-item"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <CreditCard size={15} />
                  <span>Digital ID Card</span>
                </Link>
                <Link
                  to="/student/security"
                  className="uni-dropdown-item"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <Lock size={15} />
                  <span>Security & Account</span>
                </Link>
                <Link
                  to="/student/support"
                  className="uni-dropdown-item"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <HelpCircle size={15} />
                  <span>Help & Support</span>
                </Link>
                <div className="uni-dropdown-divider" />
                <button
                  type="button"
                  className="uni-dropdown-item logout"
                  onClick={handleLogout}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Layout Body: Sidebar + Main Content ────────────────────────────── */}
      <div className="uni-student-portal-body">
        {/* ── Left Sidebar Navigation ───────────────────────────────────────── */}
        <aside
          className={`uni-student-sidebar-modern ${mobileMenuOpen ? "mobile-drawer-open" : ""}`}
          aria-label="Student Navigation"
        >
          {mobileMenuOpen && (
            <div className="uni-sidebar-mobile-close-bar mobile-only">
              <span className="uni-sidebar-mobile-title">Navigation</span>
              <button
                type="button"
                className="uni-mobile-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <nav className="uni-student-nav-menu">
            <NavLink
              to="/student"
              end
              className={({ isActive }) =>
                `uni-nav-link-item ${isActive ? "active-link" : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard size={18} className="uni-nav-icon" />
              <span>Overview</span>
            </NavLink>

            <NavLink
              to="/student/id"
              className={({ isActive }) =>
                `uni-nav-link-item ${isActive ? "active-link" : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <CreditCard size={18} className="uni-nav-icon" />
              <span>My Digital ID</span>
            </NavLink>

            <NavLink
              to="/student/profile"
              className={({ isActive }) =>
                `uni-nav-link-item ${isActive ? "active-link" : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <User size={18} className="uni-nav-icon" />
              <span>My Profile</span>
            </NavLink>

            <NavLink
              to="/student/verification"
              className={({ isActive }) =>
                `uni-nav-link-item ${isActive ? "active-link" : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShieldCheck size={18} className="uni-nav-icon" />
              <span>Verification</span>
            </NavLink>

            <NavLink
              to="/student/requests"
              className={({ isActive }) =>
                `uni-nav-link-item ${isActive ? "active-link" : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <FileText size={18} className="uni-nav-icon" />
              <span>My Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="uni-nav-badge-pill">{pendingRequestsCount}</span>
              )}
            </NavLink>

            <NavLink
              to="/student/notifications"
              className={({ isActive }) =>
                `uni-nav-link-item ${isActive ? "active-link" : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <Bell size={18} className="uni-nav-icon" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="uni-nav-badge-pill alert">{unreadCount}</span>
              )}
            </NavLink>

            <NavLink
              to="/student/activity"
              className={({ isActive }) =>
                `uni-nav-link-item ${isActive ? "active-link" : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <Clock size={18} className="uni-nav-icon" />
              <span>Activity</span>
            </NavLink>

            <NavLink
              to="/student/security"
              className={({ isActive }) =>
                `uni-nav-link-item ${isActive ? "active-link" : ""}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <Lock size={18} className="uni-nav-icon" />
              <span>Security & Account</span>
            </NavLink>
          </nav>

          {/* Sidebar Bottom — Persistent Institution Brand with Logo */}
          <div className="uni-sidebar-bottom-section">
            <Link to="/student/institution" className="uni-sidebar-institution-card" title={`View ${institutionName} details`}>
              <div className="uni-inst-logo-wrap">
                {institutionLogo ? (
                  <img
                    src={institutionLogo}
                    alt={institutionName}
                    className="uni-inst-logo-img"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/assets/logos/unima.png";
                    }}
                  />
                ) : (
                  <GraduationCap size={20} />
                )}
              </div>
              <div className="uni-inst-text">
                <span className="uni-inst-title">{institutionName}</span>
                <span className="uni-inst-sub">Student Portal</span>
              </div>
            </Link>

            <Link to="/student/support" className="uni-sidebar-support-link">
              <HelpCircle size={17} />
              <span>Help &amp; Support</span>
            </Link>
          </div>
                </aside>

        {/* ── Main Canvas ───────────────────────────────────────────────────── */}
        <main className="uni-student-canvas-modern">
          <Outlet context={{ dashboard, refreshDashboard: fetchDashboard, loading }} />
        </main>
      </div>
    </div>
  );
};

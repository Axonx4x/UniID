import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  FileText,
  Database,
  ClipboardList,
  BarChart2,
  Bell,
  Settings,
  Search,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  User,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { apiClient } from "@/services/apiClient";
import { StaffOverviewResponse } from "@/types";
import { getUniversityBrand } from "@/config/universities";

export const StaffLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [overview, setOverview] = useState<StaffOverviewResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Institution context
  const activeMembership =
    user?.memberships?.find(
      (m) => m.role === "registry_admin" || m.role === "platform_admin"
    ) || user?.memberships?.[0];

  const institutionId = activeMembership?.institution?.id;
  const brand = getUniversityBrand(
    activeMembership?.institution?.slug || activeMembership?.institution?.name || "unima"
  );
  const institutionName =
    activeMembership?.institution?.name || overview?.institution_name || brand.name;
  const institutionLogo = brand.logoSrc;

  // Review Officer identity (defaulting to Sarah Johnson from enterprise spec)
  const officerName = user?.full_name || "Sarah Johnson";
  const officerRole = "Review Officer";

  const DEFAULT_OFFICER_PHOTO = "/assets/images/Review_Officer.jpeg";
  const OFFICER_PHOTO_KEY = "officer_profile_photo_dataurl";

  const [officerPhoto, setOfficerPhoto] = useState<string>(() => {
    try {
      return localStorage.getItem(OFFICER_PHOTO_KEY) || DEFAULT_OFFICER_PHOTO;
    } catch {
      return DEFAULT_OFFICER_PHOTO;
    }
  });

  useEffect(() => {
    const updatePhoto = () => {
      try {
        const stored = localStorage.getItem(OFFICER_PHOTO_KEY);
        setOfficerPhoto(stored || DEFAULT_OFFICER_PHOTO);
      } catch {
        setOfficerPhoto(DEFAULT_OFFICER_PHOTO);
      }
    };
    window.addEventListener("officer-photo-updated", updatePhoto);
    window.addEventListener("storage", updatePhoto);
    return () => {
      window.removeEventListener("officer-photo-updated", updatePhoto);
      window.removeEventListener("storage", updatePhoto);
    };
  }, []);

  useEffect(() => {
    if (institutionId) {
      sessionStorage.setItem("astramind.institution", institutionId);
      apiClient
        .getStaffOverview(institutionId)
        .then(setOverview)
        .catch(() => {});
    }
  }, [institutionId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/staff/reviews?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="uni-officer-console-layout">
      {/* ── Left Sidebar (Clean White Enterprise) ─────────────────────────── */}
      <aside className={`uni-officer-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Top Brand */}
        <div className="uni-officer-sidebar-header">
          <Link to="/staff" className="uni-officer-brand-link">
            <div className="uni-officer-logo-badge">
              <GraduationCap size={22} color="#ffffff" />
            </div>
            <div className="uni-officer-brand-text">
              <span className="uni-officer-brand-title">UniID</span>
              <span className="uni-officer-brand-subtitle">
                Digital Student Identity for a Smarter Tomorrow
              </span>
            </div>
          </Link>
          <button
            type="button"
            className="uni-officer-close-btn mobile-only"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="uni-officer-sidebar-scroll">
          <div className="uni-officer-nav-group-title">REVIEWER PORTAL</div>
          <nav className="uni-officer-nav-list" role="navigation" aria-label="Reviewer navigation">
            <NavLink
              to="/staff"
              end
              className={({ isActive }) =>
                `uni-officer-nav-item ${isActive ? "active-officer-link" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <LayoutDashboard size={18} className="uni-officer-nav-icon" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/staff/verification"
              className={({ isActive }) =>
                `uni-officer-nav-item ${isActive ? "active-officer-link" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <ShieldCheck size={18} className="uni-officer-nav-icon" />
              <span>Student Verification</span>
            </NavLink>

            <NavLink
              to="/staff/applications"
              className={({ isActive }) =>
                `uni-officer-nav-item ${isActive ? "active-officer-link" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <FileText size={18} className="uni-officer-nav-icon" />
              <span>Applications</span>
            </NavLink>

            <NavLink
              to="/staff/records"
              className={({ isActive }) =>
                `uni-officer-nav-item ${isActive ? "active-officer-link" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <Database size={18} className="uni-officer-nav-icon" />
              <span>Student Records</span>
            </NavLink>

            <NavLink
              to="/staff/imports"
              className={({ isActive }) =>
                `uni-officer-nav-item ${isActive ? "active-officer-link" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <FileText size={18} className="uni-officer-nav-icon" />
              <span>Roster Imports</span>
            </NavLink>

            <NavLink
              to="/staff/requests"
              className={({ isActive }) =>
                `uni-officer-nav-item ${isActive ? "active-officer-link" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <ClipboardList size={18} className="uni-officer-nav-icon" />
              <span className="uni-nav-label-flex">Requests</span>
              <span className="uni-nav-red-badge">5</span>
            </NavLink>

            <NavLink
              to="/staff/reports"
              className={({ isActive }) =>
                `uni-officer-nav-item ${isActive ? "active-officer-link" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <BarChart2 size={18} className="uni-officer-nav-icon" />
              <span>Reports</span>
            </NavLink>

            <NavLink
              to="/staff/notifications"
              className={({ isActive }) =>
                `uni-officer-nav-item ${isActive ? "active-officer-link" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <Bell size={18} className="uni-officer-nav-icon" />
              <span className="uni-nav-label-flex">Notifications</span>
              <span className="uni-nav-red-badge">3</span>
            </NavLink>

            <NavLink
              to="/staff/settings"
              className={({ isActive }) =>
                `uni-officer-nav-item ${isActive ? "active-officer-link" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <Settings size={18} className="uni-officer-nav-icon" />
              <span>Settings</span>
            </NavLink>
          </nav>
        </div>

        {/* Persistent Bottom Institution Brand */}
        <div className="uni-officer-sidebar-bottom">
          <div className="uni-officer-inst-card">
            <div className="uni-officer-inst-logo-box">
              {institutionLogo ? (
                <img
                  src={institutionLogo}
                  alt={institutionName}
                  className="uni-officer-inst-img"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/assets/logos/unima.png";
                  }}
                />
              ) : (
                <Building2 size={18} color="#1e60ff" />
              )}
            </div>
            <div className="uni-officer-inst-meta">
              <span className="uni-officer-inst-name" title={institutionName}>
                {institutionName}
              </span>
              <span className="uni-officer-inst-role">Review Officer</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Canvas ───────────────────────────────────────────────────── */}
      <div className="uni-officer-main-canvas">
        {/* Topbar */}
        <header className="uni-officer-topbar" role="banner">
          <div className="uni-officer-topbar-left">
            <button
              type="button"
              className="uni-officer-hamburger-btn mobile-only"
              onClick={() => setMobileOpen(true)}
              aria-label="Open mobile menu"
            >
              <Menu size={22} />
            </button>
          </div>

          <div className="uni-officer-topbar-right">
            {/* Global Search Bar */}
            <form onSubmit={handleSearchSubmit} className="uni-officer-search-form">
              <Search size={16} className="uni-officer-search-icon" />
              <input
                type="text"
                placeholder="Search students, requests, or IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="uni-officer-search-input"
                aria-label="Search students, requests, or IDs"
              />
            </form>

            {/* Notification Bell with Badge */}
            <Link
              to="/staff/notifications"
              className="uni-officer-bell-btn"
              title="Notifications"
              aria-label="3 unread notifications"
            >
              <Bell size={19} />
              <span className="uni-officer-bell-badge">3</span>
            </Link>

            {/* Review Officer User Pill */}
            <div className="uni-officer-user-dropdown-wrap" ref={dropdownRef}>
              <button
                type="button"
                className="uni-officer-user-pill"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <div className="uni-officer-avatar-box">
                  <img
                    src={officerPhoto}
                    alt={officerName}
                    className="uni-officer-avatar-img"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_OFFICER_PHOTO;
                    }}
                  />
                </div>
                <div className="uni-officer-user-info desktop-only">
                  <span className="uni-officer-user-name">{officerName}</span>
                  <span className="uni-officer-user-role">{officerRole}</span>
                </div>
                <ChevronDown size={14} className="uni-officer-chevron desktop-only" />
              </button>

              {userDropdownOpen && (
                <div className="uni-officer-menu-popover">
                  <div className="uni-officer-menu-header">
                    <span className="bold">{officerName}</span>
                    <span className="muted">{activeMembership?.institution?.name || "University of Malawi"}</span>
                    <span className="role-tag">Review Officer</span>
                  </div>
                  <div className="uni-officer-menu-divider" />
                  <Link
                    to="/staff/records"
                    className="uni-officer-menu-item"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <User size={15} />
                    <span>Officer Workspace</span>
                  </Link>
                  <Link
                    to="/staff/settings"
                    className="uni-officer-menu-item"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Settings size={15} />
                    <span>System Settings</span>
                  </Link>
                  <div className="uni-officer-menu-divider" />
                  <button
                    type="button"
                    className="uni-officer-menu-item logout"
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

        {/* Content View */}
        <main className="uni-officer-content-body">
          <Outlet context={{ overview, institutionId, institutionName }} />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;

import React from "react";
import {
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  X,
  LucideIcon,
} from "lucide-react";

// ── 1. Page Header ────────────────────────────────────────────────────────────

export interface OfficerPageHeaderProps {
  title: string;
  description: string;
  badgeText?: string;
  badgeType?: "info" | "warning" | "success" | "danger" | "neutral";
  actions?: React.ReactNode;
}

export const OfficerPageHeader: React.FC<OfficerPageHeaderProps> = ({
  title,
  description,
  badgeText,
  badgeType = "info",
  actions,
}) => {
  return (
    <div className="uni-officer-page-header">
      <div className="uni-officer-header-text">
        <div className="uni-officer-title-row">
          <h1 className="uni-officer-title">{title}</h1>
          {badgeText && (
            <span className={`uni-officer-header-badge badge-${badgeType}`}>
              {badgeText}
            </span>
          )}
        </div>
        <p className="uni-officer-subtitle">{description}</p>
      </div>
      {actions && <div className="uni-officer-header-actions">{actions}</div>}
    </div>
  );
};

// ── 2. Stat Metric Card ───────────────────────────────────────────────────────

export interface OfficerStatCardProps {
  label: string;
  value: string | number;
  trendText?: string;
  trendDirection?: "up" | "down" | "neutral";
  trendColor?: "green" | "red" | "amber" | "neutral";
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
}

export const OfficerStatCard: React.FC<OfficerStatCardProps> = ({
  label,
  value,
  trendText,
  trendDirection,
  trendColor = "neutral",
  icon: Icon,
  iconBgColor = "#EFF6FF",
  iconColor = "#1E60FF",
}) => {
  return (
    <div className="uni-officer-metric-card">
      <div
        className="uni-officer-metric-icon-box"
        style={{ backgroundColor: iconBgColor, color: iconColor }}
      >
        <Icon size={20} />
      </div>
      <div className="uni-officer-metric-body">
        <span className="uni-officer-metric-label">{label}</span>
        <div className="uni-officer-metric-val">{value}</div>
        {trendText && (
          <div className={`uni-officer-metric-trend trend-${trendColor}`}>
            {trendDirection === "up" && <ArrowUpRight size={13} />}
            {trendDirection === "down" && <ArrowDownRight size={13} />}
            <span>{trendText}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── 3. Status Badge ───────────────────────────────────────────────────────────

export interface OfficerStatusBadgeProps {
  status: string;
  label?: string;
  size?: "sm" | "md";
}

export const OfficerStatusBadge: React.FC<OfficerStatusBadgeProps> = ({
  status,
  label,
  size = "md",
}) => {
  const norm = (status || "").toLowerCase().trim();

  let badgeClass = "badge-pending";
  let displayLabel = label || status;
  let Icon = Clock;

  if (
    norm === "approved" ||
    norm === "verified" ||
    norm === "resolved" ||
    norm === "completed" ||
    norm === "active"
  ) {
    badgeClass = "badge-approved";
    displayLabel = label || (norm === "resolved" ? "Resolved" : "Approved");
    Icon = CheckCircle2;
  } else if (
    norm === "under_review" ||
    norm === "in_review" ||
    norm === "in_progress" ||
    norm === "processing"
  ) {
    badgeClass = "badge-review";
    displayLabel = label || "Under Review";
    Icon = RefreshCw;
  } else if (
    norm === "needs_information" ||
    norm === "awaiting_info" ||
    norm === "verification_review_required" ||
    norm === "awaiting_student"
  ) {
    badgeClass = "badge-warning";
    displayLabel = label || "Awaiting Info";
    Icon = HelpCircle;
  } else if (
    norm === "rejected" ||
    norm === "declined" ||
    norm === "suspended" ||
    norm === "failed"
  ) {
    badgeClass = "badge-rejected";
    displayLabel = label || (norm === "declined" ? "Declined" : "Rejected");
    Icon = XCircle;
  } else {
    badgeClass = "badge-pending";
    displayLabel = label || (norm === "new" ? "New" : "Pending");
    Icon = Clock;
  }

  return (
    <span className={`uni-officer-status-badge ${badgeClass} size-${size}`}>
      <Icon size={size === "sm" ? 11 : 13} className="badge-icon" />
      <span>{displayLabel}</span>
    </span>
  );
};

// ── 4. Empty State ────────────────────────────────────────────────────────────

export interface OfficerEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const OfficerEmptyState: React.FC<OfficerEmptyStateProps> = ({
  icon: Icon = AlertCircle,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="uni-officer-empty-card">
      <div className="uni-officer-empty-icon-wrap">
        <Icon size={28} />
      </div>
      <h3 className="uni-officer-empty-title">{title}</h3>
      <p className="uni-officer-empty-desc">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          className="uni-officer-btn-primary mt-3"
          onClick={onAction}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

// ── 5. Error State ────────────────────────────────────────────────────────────

export interface OfficerErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const OfficerErrorState: React.FC<OfficerErrorStateProps> = ({
  title = "Failed to load data",
  message,
  onRetry,
}) => {
  return (
    <div className="uni-officer-error-banner" role="alert">
      <div className="uni-officer-error-content">
        <AlertCircle size={20} className="uni-officer-error-icon" />
        <div>
          <h4 className="uni-officer-error-title">{title}</h4>
          <p className="uni-officer-error-msg">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          className="uni-officer-btn-secondary btn-sm"
          onClick={onRetry}
        >
          <RefreshCw size={13} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};

// ── 6. Search & Filter Bar ────────────────────────────────────────────────────

export interface OfficerFilterToolbarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  filters?: React.ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
}

export const OfficerFilterToolbar: React.FC<OfficerFilterToolbarProps> = ({
  searchPlaceholder = "Search by name, student number, or reference...",
  searchValue,
  onSearchChange,
  onSearchSubmit,
  filters,
  onReset,
  hasActiveFilters,
}) => {
  return (
    <div className="uni-officer-filter-toolbar">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit?.(e);
        }}
        className="uni-officer-filter-search-form"
      >
        <Search size={16} className="uni-officer-filter-search-icon" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="uni-officer-filter-search-input"
        />
        {searchValue && (
          <button
            type="button"
            className="uni-officer-filter-search-clear"
            onClick={() => onSearchChange("")}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </form>

      {filters && <div className="uni-officer-filter-controls">{filters}</div>}

      {hasActiveFilters && onReset && (
        <button
          type="button"
          className="uni-officer-filter-reset-btn"
          onClick={onReset}
        >
          Reset Filters
        </button>
      )}
    </div>
  );
};

import React, { useState } from "react";
import { GraduationCap } from "lucide-react";
import { getUniversityBrand } from "@/config/universities";

interface UniversityBrandBadgeProps {
  identifier?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | number;
  showName?: boolean;
  subtext?: string | null;
  className?: string;
  avatarClassName?: string;
  textClassName?: string;
  theme?: "light" | "dark" | "pill" | "plain";
}

export const UniversityBrandBadge: React.FC<UniversityBrandBadgeProps> = ({
  identifier,
  name,
  size = "sm",
  showName = true,
  subtext,
  className = "",
  avatarClassName = "",
  textClassName = "",
  theme = "plain",
}) => {
  const brand = getUniversityBrand(identifier || name);
  const displayName = name || brand.name;
  const [imgError, setImgError] = useState(false);

  // Size mapping
  let px = 24;
  if (typeof size === "number") {
    px = size;
  } else {
    switch (size) {
      case "xs":
        px = 18;
        break;
      case "sm":
        px = 24;
        break;
      case "md":
        px = 32;
        break;
      case "lg":
        px = 44;
        break;
    }
  }

  const themeStyles: Record<string, React.CSSProperties> = {
    plain: {
      display: "inline-flex",
      alignItems: "center",
      gap: px > 30 ? "10px" : "8px",
    },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "#f1f5f9",
      padding: "4px 12px 4px 6px",
      borderRadius: "9999px",
      border: "1px solid #e2e8f0",
      fontSize: "12.5px",
      fontWeight: 600,
      color: "#1e293b",
    },
    light: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      background: "#ffffff",
      padding: "6px 12px",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    },
    dark: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      background: "rgba(255,255,255,0.08)",
      padding: "6px 12px",
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "#ffffff",
    },
  };

  const containerStyle = themeStyles[theme] || themeStyles.plain;

  return (
    <div className={`uni-brand-badge-root ${className}`} style={containerStyle}>
      {/* University Official Logo */}
      <div
        className={`uni-brand-logo-container ${avatarClassName}`}
        style={{
          width: `${px}px`,
          height: `${px}px`,
          minWidth: `${px}px`,
          borderRadius: px > 32 ? "8px" : "6px",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
          flexShrink: 0,
        }}
      >
        {!imgError && brand.logoSrc ? (
          <img
            src={brand.logoSrc}
            alt={displayName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          <GraduationCap size={Math.round(px * 0.6)} color="#1e60ff" />
        )}
      </div>

      {/* University Name & Subtext */}
      {showName && (
        <div
          className={`uni-brand-name-wrap ${textClassName}`}
          style={{ display: "flex", flexDirection: "column", minWidth: 0 }}
        >
          <span
            className="uni-brand-display-name"
            style={{
              fontWeight: 700,
              fontSize: px > 30 ? "14px" : "13px",
              lineHeight: 1.25,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName}
          </span>
          {subtext && (
            <span
              className="uni-brand-subtext"
              style={{
                fontSize: "11px",
                opacity: 0.75,
                lineHeight: 1.2,
                marginTop: "2px",
              }}
            >
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default UniversityBrandBadge;

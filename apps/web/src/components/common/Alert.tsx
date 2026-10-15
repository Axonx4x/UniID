import React from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export interface AlertProps {
  children: React.ReactNode;
  variant?: "error" | "warning" | "info" | "success";
  title?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = "info",
  title,
  icon,
  className = "",
}) => {
  const defaultIcons = {
    error: <AlertCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
    success: <CheckCircle size={18} />,
  };

  return (
    <div className={`alert alert-${variant} ${className}`} role="alert">
      <div style={{ flexShrink: 0, marginTop: title ? 2 : 0 }}>
        {icon || defaultIcons[variant]}
      </div>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>
            {title}
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};

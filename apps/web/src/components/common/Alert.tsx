import React from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

export interface AlertProps {
  children?: React.ReactNode;
  message?: React.ReactNode;
  variant?: "error" | "warning" | "info" | "success";
  type?: "error" | "warning" | "info" | "success";
  title?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  message,
  variant,
  type,
  title,
  icon,
  className = "",
}) => {
  const alertVariant = type || variant || "info";
  const content = children ?? message;

  const defaultIcons = {
    error: <AlertCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
    success: <CheckCircle size={18} />,
  };

  return (
    <div className={`alert alert-${alertVariant} ${className}`} role="alert">
      <div style={{ flexShrink: 0, marginTop: title ? 2 : 0 }}>
        {icon || defaultIcons[alertVariant]}
      </div>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>
            {title}
          </div>
        )}
        <div>{content}</div>
      </div>
    </div>
  );
};

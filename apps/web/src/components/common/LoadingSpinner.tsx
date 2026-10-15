import React from "react";

export interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 24,
  message,
  className = "",
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        gap: "var(--space-3)",
      }}
      className={className}
    >
      <span
        className="spinner"
        style={{
          width: size,
          height: size,
          borderWidth: Math.max(2, Math.round(size / 8)),
          color: "var(--color-accent)",
        }}
      />
      {message && (
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
          {message}
        </span>
      )}
    </div>
  );
};

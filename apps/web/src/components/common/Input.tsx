import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  id,
  className = "",
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input ${error ? "border-error" : ""} ${className}`}
        style={error ? { borderColor: "var(--status-error)" } : undefined}
        {...props}
      />
      {error && (
        <p style={{ color: "var(--status-error)", fontSize: "var(--font-size-xs)", marginTop: "4px" }}>
          {error}
        </p>
      )}
      {!error && helperText && <p className="form-help">{helperText}</p>}
    </div>
  );
};

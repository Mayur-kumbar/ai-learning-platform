import React from "react";
import { useAuth } from "../context/AuthContext";

const AuthForm = ({
  title,
  subtitle,
  onSubmit,
  error,
  loading,
  submitLabel,
  footer,
  children,
}) => {
  const { ready } = useAuth();
  return (
    <form method="post" className="auth-form" onSubmit={onSubmit}>
      
      <h2 className="form-title">{title}</h2>
      {subtitle && <p className="form-subtitle">{subtitle}</p>}

      <div className="form-fields">
        {children}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <button
        type="submit"
        className={`submit-btn ${loading ? "loading" : ""}`}
        disabled={loading || !ready}
      >
        {loading ? "Processing..." : submitLabel}
      </button>

      {footer && <div className="form-footer">{footer}</div>}
    </form>
  );
};

export default AuthForm;
import React from "react";

const AuthLayout = ({ panel, form }) => {
  return (
    <div className="auth-layout">
      {/* LEFT PANEL */}
      <div className="auth-panel">
        {panel}
      </div>

      {/* RIGHT SIDE */}
      <div className="auth-form-side">
        {form}
      </div>
    </div>
  );
};

export default AuthLayout;
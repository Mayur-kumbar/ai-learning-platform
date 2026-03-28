import React from "react";

const InputField = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  suffix,
}) => {
  return (
    <div className="field-group">
      
      {label && <label className="field-label">{label}</label>}

      <div className="input-wrapper">
        <input
          className="field-input"
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
        />

        {suffix && <div className="input-suffix">{suffix}</div>}
      </div>

    </div>
  );
};

export default InputField;
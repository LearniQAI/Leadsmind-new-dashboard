// components/LinkInput.tsx
import React from "react";

interface LinkInputProps {
  label: string;
  id: string;
  defaultValue: string;
}

const LinkInput: React.FC<LinkInputProps> = ({ label, id, defaultValue }) => {
  return (
    <div className="from__input-box">
      <div className="form__input-title">
        <label htmlFor={id}>{label}</label>
      </div>
      <div className="input-group">
        <span className="input-group-text">@</span>
        <input
          type="text"
          className="form-control"
          id={id}
          placeholder=""
          defaultValue={defaultValue}
        />
      </div>
    </div>
  );
};

export default LinkInput;

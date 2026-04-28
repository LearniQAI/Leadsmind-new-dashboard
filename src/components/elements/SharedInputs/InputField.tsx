import ErrorMessage from "@/components/error-message/ErrorMessage";
import React from "react";
import { FieldError, UseFormRegister } from "react-hook-form";

interface InputFieldProps {
  label: string;
  id: string;
  type?: string;
  required?: boolean;
  register?: ReturnType<UseFormRegister<any>>;
  error?: FieldError;
  groupInput?: boolean;
  groupText?: string;
  isTextArea?: boolean;
  defaultValue?: string | number;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  id,
  type = "text",
  groupText = "USD",
  required = true,
  register,
  error,
  groupInput = false,
  isTextArea = false,
  defaultValue = "",
}) => {
  return (
    <div className="form__input-box">
      <div className="form__input-title">
        <label htmlFor={id}>
          {label} {required && <span>*</span>}
        </label>
      </div>
      <>
        {!isTextArea ? (
          <>
            {!groupInput ? (
              <>
                <div className="form__input">
                  <input
                    className={`form-control ${error ? "is-invalid" : ""}`}
                    id={id}
                    type={type}
                    defaultValue={defaultValue} // Set the default value
                    {...(register ? register : {})}
                  />
                </div>
                {error && <ErrorMessage error={error.message} />}
              </>
            ) : (
              <>
                <div className="input-group">
                  <span className="input-group-text">{groupText}</span>
                  <input
                    className={`form-control ${error ? "is-invalid" : ""}`}
                    id={id}
                    type={type}
                    defaultValue={defaultValue} // Set the default value
                    {...(register ? register : {})}
                  />
                </div>
                {error && <ErrorMessage error={error.message} />}
              </>
            )}
          </>
        ) : (
          <>
            <div className="form__input">
              <textarea
                id={id}
                className={`form-control ${error ? "is-invalid" : ""}`}
                defaultValue={defaultValue} // Set the default value
                {...(register ? register : {})}
              ></textarea>
            </div>
            {error && <ErrorMessage error={error.message} />}
          </>
        )}
      </>
    </div>
  );
};

export default InputField;

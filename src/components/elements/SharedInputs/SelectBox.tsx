import React from "react";
import { Controller, FieldError } from "react-hook-form";
import { FormControl, Select, MenuItem, FormHelperText } from "@mui/material";

interface SelectBoxProps {
  id: string;
  label: string;
  isRequired?: boolean;
  options: { value: string | number; label: string | number }[];
  control: any; // React Hook Form control
  error?: FieldError; // Validation error feedback
  className?: string;
  defaultValue?: string | number; // Default selected value
}

const SelectBox: React.FC<SelectBoxProps> = ({
  id,
  label,
  isRequired = true,
  options,
  control,
  error,
  className = "form-select",
  defaultValue = "", // Default to an empty string
}) => {
  return (
    <div className="from__input-box select-wrapper">
      <div className="form__input-title">
        <label htmlFor={id} className="form-label">
          {label}
          {isRequired && <span>*</span>}
        </label>
      </div>
      <div className="mz-default-select">
        <FormControl fullWidth error={!!error}>
          <Controller
            name={id}
            control={control}
            defaultValue={defaultValue}
            render={({ field }) => (
              <Select
                {...field}
                displayEmpty
                className={`${className} ${error ? "is-invalid" : ""}`}
                MenuProps={{
                  disableScrollLock: true,
                }}
                renderValue={(selected) =>
                  selected === "" ? `Select ${label}` : selected
                }
              >
                {options.map((option, index) => (
                  <MenuItem key={index} value={option.value} className="menu-item" >
                    {option.value}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {error && <FormHelperText>{error.message}</FormHelperText>}
        </FormControl>
      </div>
    </div>
  );
};

export default SelectBox;

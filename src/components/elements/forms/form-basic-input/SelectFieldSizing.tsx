"use client";
import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import React, { useState } from "react";

interface SelectorOption {
  value: string;
  label: string;
}

const singleSelectorData: SelectorOption[] = [
  { value: "1", label: "CRM Analytics" },
  { value: "2", label: "Banking" },
  { value: "3", label: "Crypto" },
];

const SelectFieldSizing = () => {
  const [selectedOptions, setSelectedOptions] = useState<string>("");
  const [selectedOptionsTwo, setSelectedOptionsTwo] = useState<string>("");
  const [selectedOptionsThree, setSelectedOptionsThree] = useState<string>("");

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    setSelectedOptions(event.target.value);
  };

  const handleSelectChangeTwo = (event: SelectChangeEvent<string>) => {
    setSelectedOptionsTwo(event.target.value);
  };

  const handleSelectChangeThree = (event: SelectChangeEvent<string>) => {
    setSelectedOptionsThree(event.target.value);
  };

  return (
    <>
      <div className="card__wrapper no-height">
        <div className="card__title-wrap mb-[20px]">
          <h5 className="card__heading-title">Select Field Sizing</h5>
        </div>

        {/* Large Select Field */}
        <div className="from__input-box select-wrapper">
          <div className="form__input-title">
            <label htmlFor="largeSelect" className="form-label">
              Large Select Field
            </label>
          </div>
          <div className="mz-large-select">
            <FormControl sx={{ m: 1 }}>
              <Select
                displayEmpty
                value={selectedOptionsTwo}
                onChange={handleSelectChangeTwo}
                renderValue={(selected) => (selected === "" ? "Large Select" : selected)}
                MenuProps={{
                  disableScrollLock: true,
                }}
              >
                {singleSelectorData.map((option) => (
                  <MenuItem key={option.value} value={option.label} className="menu-item-lg">
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Default Select Field */}
        <div className="from__input-box select-wrapper">
          <div className="form__input-title">
            <label htmlFor="defaultSelect" className="form-label">
              Default Select Field
            </label>
          </div>
          <div className="mz-default-select">
            <FormControl sx={{ m: 1 }}>
              <Select
                displayEmpty
                value={selectedOptions}
                onChange={handleSelectChange}
                renderValue={(selected) => (selected === "" ? "Default Select" : selected)}
                MenuProps={{
                  disableScrollLock: true,
                }}
              >
                {singleSelectorData.map((option) => (
                  <MenuItem key={option.value} value={option.label} className="menu-item">
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Small Select Field */}
        <div className="from__input-box select-wrapper">
          <div className="form__input-title">
            <label htmlFor="smallSelect" className="form-label">
              Small Select Field
            </label>
          </div>
          <div className="mz-small-select">
            <FormControl sx={{ m: 1 }}>
              <Select
                displayEmpty
                value={selectedOptionsThree}
                onChange={handleSelectChangeThree}
                renderValue={(selected) => (selected === "" ? "Small Select" : selected)}
                MenuProps={{
                  disableScrollLock: true,
                }}
              >
                {singleSelectorData.map((option) => (
                  <MenuItem key={option.value} value={option.label} className="menu-item-small">
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
      </div>
    </>
  );
};

export default SelectFieldSizing;

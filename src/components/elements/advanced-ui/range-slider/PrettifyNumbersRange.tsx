"use client";
import { Box, Slider } from "@mui/material";
import React, { useState } from "react";

interface PrefixRangeProps {
  label?: string; // Optional label for the slider
  min?: number; // Minimum value for the slider
  max?: number; // Maximum value for the slider
  defaultValue?: number; // Initial slider values
  marks?: { value: number; label: string }[]; // Customizable marks
  valueLabelPrefix?: string; // Prefix for the value label
  className?: string; // Additional class names
}

const PrettifyNumbersRange: React.FC<PrefixRangeProps> = ({
  label = "Prettify Numbers",
  min = 1000,
  max = 10000,
  defaultValue = 2000,
  marks = [
    { value: 1000, label: "1 000" },
    { value: 3250, label: "3 250" },
    { value: 5500, label: "5 500" },
    { value: 7750, label: "7 750" },
    { value: 10000, label: "10 000" },
  ],
  valueLabelPrefix = "",
  className = "mb-[20px]",
}) => {
  const [value, setValue] = useState<number>(defaultValue);

  const handleChange = (
    event: Event | React.SyntheticEvent,
    newValue: number | number[]
  ) => {
    setValue(newValue as number);
  };

  const valuetext = (value: number) => `${valueLabelPrefix}${value}`;

  return (
    <div className={className}>
      <div className="col-span-12 prefix">
        <label className="mb-2.5" htmlFor="range-active-1">
          {label}
        </label>
        <Box>
          <div className="flex justify-between irs">
            <span
              className="irs-min"
              style={{ visibility: value > 1600 ? "visible" : "hidden" }}
            >
              {marks[0].label}
            </span>
            <span
              className="irs-max"
              style={{ visibility: value < 9000 ? "visible" : "hidden" }}
            >
              {marks[marks.length - 1].label}
            </span>
          </div>
          <Slider
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            valueLabelDisplay="on"
            valueLabelFormat={(val) => `${valueLabelPrefix}${val}`}
            getAriaValueText={valuetext}
            marks={marks}
          />
        </Box>
      </div>
    </div>
  );
};

export default PrettifyNumbersRange;

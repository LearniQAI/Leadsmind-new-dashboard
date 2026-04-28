"use client";
import { Box, Slider } from "@mui/material";
import React, { useState } from "react";

interface RangeSliderProps {
  label?: string; // Optional label for the slider
  min?: number; // Minimum value for the slider
  max?: number; // Maximum value for the slider
  defaultValue?: number; // Default starting value for the slider
}

const MinMaxValue: React.FC<RangeSliderProps> = ({
  label = "Min-Max Value",
  min = 100,
  max = 1000,
  defaultValue = 100,
}) => {
  const [value, setValue] = useState<number>(defaultValue);

  const handleChange = (event: Event, newValue: number | number[]) => {
    // Reset to min if the new value goes below min
    const newValueAdjusted = Array.isArray(newValue) ? newValue[0] : newValue;
    const finalValue = Math.max(newValueAdjusted, min); // Ensure it doesn't go below min
    setValue(finalValue);
  };

  return (
    <div className="mb-[20px]">
      <div className="col-span-12">
        <label className="mb-2.5" htmlFor="range-active-1">
          {label}
        </label>
        <Box>
          <div className="flex justify-between irs">
            {/* Show min label when value is above min */}
            <span
              className="irs-min"
              style={{ visibility: value > min - 110 ? "visible" : "hidden" }}
            >
              {min}
            </span>
            {/* Show max label when value is below max */}
            <span
              className="irs-max"
              style={{ visibility: value < max - 50 ? "visible" : "hidden" }}
            >
              {max}
            </span>
          </div>
          <Slider
            value={value}
            onChange={handleChange}
            min={0}
            max={max}
            valueLabelDisplay="on"
          />
        </Box>
      </div>
    </div>
  );
};

export default MinMaxValue;

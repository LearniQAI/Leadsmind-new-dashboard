"use client";
import { Box, Slider } from "@mui/material";
import React, { useState } from "react";

interface PrefixRangeProps {
  label?: string; // Optional label for the slider
  min?: number; // Minimum value for the slider
  max?: number; // Maximum value for the slider
  defaultValue?: number[]; // Initial slider values
  marks?: { value: number; label: string }[]; // Customizable marks
  valueLabelPrefix?: string; // Prefix for the value label
  className?: string; // Additional class names
}

const PrefixRange: React.FC<PrefixRangeProps> = ({
  label = "Prefix",
  min = 0,
  max = 1000,
  defaultValue = [0, 1000],
  marks = [
    { value: 0, label: "0" },
    { value: 250, label: "250" },
    { value: 500, label: "500" },
    { value: 750, label: "750" },
    { value: 1000, label: "1000" },
  ],
  valueLabelPrefix = "$",
  className = "mb-[20px]",
}) => {
  const [value, setValue] = useState<number[]>(defaultValue);

  const handleChange = (event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      setValue(newValue as number[]);
    }
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
              style={{
                visibility:
                  value[0] > min + (max - min) * 0.05 ? "visible" : "hidden",
              }}
            >
              {valuetext(min)}
            </span>
            <span
              className="irs-max"
              style={{
                visibility:
                  value[1] < max - (max - min) * 0.05 ? "visible" : "hidden",
              }}
            >
              {valuetext(max)}
            </span>
          </div>
          <Slider
            track="inverted"
            aria-labelledby="track-inverted-range-slider"
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

export default PrefixRange;

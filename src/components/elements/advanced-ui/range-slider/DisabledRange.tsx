"use client";
import { Box, Slider } from '@mui/material';
import React, { useState } from 'react';

interface RangeSliderProps {
    label?: string; // Optional label for the slider
    min?: number; // Minimum value for the slider
    max?: number; // Maximum value for the slider
    defaultValue?: number; // Initial slider value
    className?: string; // Additional class names
}

const RangeSlider: React.FC<RangeSliderProps> = ({
    label = "Disabled",
    min = 100,
    max = 1000,
    defaultValue = 550, // Set initial value to 550
    className = "mb-[20px]",
}) => {
    const [value, setValue] = useState<number>(defaultValue);

    const handleChange = (event: Event, newValue: number | number[]) => {
        // Prevent any changes; the slider remains at 550
        return;
    };

    return (
        <div className={className}>
            <div className="col-span-12 irs-disabled">
                <label className="mb-2.5" htmlFor="range-active-1">{label}</label>
                <Box>
                    <div className="flex justify-between irs">
                        <span
                            className="irs-min"
                            style={{ visibility: value > min ? 'visible' : 'hidden' }}
                        >
                            {min}
                        </span>
                        <span
                            className="irs-max"
                            style={{ visibility: value < max ? 'visible' : 'hidden' }}
                        >
                            {max}
                        </span>
                    </div>
                    <Slider
                        value={value}
                        onChange={handleChange}
                        min={min}
                        max={max}
                        valueLabelDisplay="on"
                        disabled // Disable the slider completely
                    />
                </Box>
            </div>
        </div>
    );
};

export default RangeSlider;

"use client";
import { Box, Slider } from '@mui/material';
import React, { useState } from 'react';

interface PrefixRangeProps {
    label?: string; // Optional label for the slider
    min?: number; // Minimum value for the slider
    max?: number; // Maximum value for the slider
    defaultValue?: number; // Initial slider values
    marks?: { value: number; label: string }[]; // Customizable marks
    className?: string; // Additional class names
}

const CustomValuesRange: React.FC<PrefixRangeProps> = ({
    label = "Custom value",
    min = 1,
    max = 12,
    defaultValue = 4,
    marks = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ],
    className = "mb-[20px]",
}) => {
    const [value, setValue] = useState<number>(defaultValue);

    const handleChange = (event: Event, newValue: number | number[]) => {
        setValue(newValue as number);
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const valuetext = (value: number) => monthNames[value - 1]; // Convert numeric value to month name

    return (
        <div className={className}>
            <div className="col-span-12 prefix">
                <label className="mb-2.5" htmlFor="range-active-1">{label}</label>
                <Box>
                    <div className='flex justify-between irs'>
                        <span className='irs-min' style={{ visibility: value > (min + (max - min) * 0.05) ? 'visible' : 'hidden' }}>
                            January
                        </span>
                        <span className='irs-max' style={{ visibility: value < (max - (max - min) * 0.05) ? 'visible' : 'hidden' }}>
                            December
                        </span>
                    </div>
                    <Slider
                        value={value}
                        onChange={handleChange}
                        min={min}
                        max={max}
                        step={1} // Ensures it snaps to each month
                        marks={marks}
                      valueLabelDisplay="on"
                        valueLabelFormat={(val) => valuetext(val)} // Display the month name
                        sx={{
                            transition: "transform 0.2s ease-in-out", // Smooth transition effect
                        }}
                    />
                </Box>
            </div>
        </div>
    );
};

export default CustomValuesRange;
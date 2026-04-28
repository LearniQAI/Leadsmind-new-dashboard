"use client"
import React from 'react';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';

const BasicRating = () => {
    const [value, setValue] = React.useState<number | null>(5);

    return (
        <div className="card__wrapper">
            <Box sx={{ maxWidth: 300, '& > legend': { mt: 2 } }}>
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">1/10 Ratings</h5>
                </div>
                <Rating
                    name="simple-controlled"
                    value={value}
                    onChange={(event, newValue) => {
                        setValue(newValue);
                    }}
                    max={10}
                />
            </Box>
        </div>

    );
};

export default BasicRating;

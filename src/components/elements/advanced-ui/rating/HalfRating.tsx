
import React from 'react';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';

const HalfRating = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Half Ratings</h5>
                </div>
                <div className="rating-container">
                    <Stack spacing={1}>
                        {/* Read-only Half Rating */}
                        <Rating name="half-rating-read" defaultValue={2.5} precision={0.5} readOnly />
                    </Stack>
                </div>
            </div>
        </>
    );
};

export default HalfRating;

import React from 'react';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';

const RatingSize = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Sizes Ratings</h5>
                </div>
                <div className="rating-container">
                    {/* Stack for different rating sizes */}
                    <Stack spacing={1}>
                        <Rating name="size-small" defaultValue={2} size="small" />
                        <Rating name="size-medium" defaultValue={2} />
                        <Rating name="size-large" defaultValue={2} size="large" />
                    </Stack>
                </div>
            </div>
        </>
    );
};

export default RatingSize;

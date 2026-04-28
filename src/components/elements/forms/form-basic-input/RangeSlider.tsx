'use client'
import { Box, Slider, Typography } from '@mui/material';
import React from 'react';

const MAX = 100;
const MIN = 0;
const marks = [
    {
        value: MIN,
        label: '',
    },
    {
        value: MAX,
        label: '',
    },
];

const RangeSlider = () => {
    function valuetext(value: number) {
        return `${value}°C`;
    }

    //Min and max Range
    const [val, setVal] = React.useState<number>(MIN);
    const handleChange = (_: Event, newValue: number | number[]) => {
        setVal(newValue as number);
    };
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Range</h5>
                </div>
                <div className="from__input-box from-grid">
                    <div className="form__input-title">
                        <label htmlFor="formRange1" className="form-label">Example range</label>
                    </div>
                    <div className="form__input">
                        <Slider
                            size="small"
                            defaultValue={70}
                            aria-label="Small"
                            valueLabelDisplay="auto"
                            color='primary'
                        />
                    </div>
                </div>
                <div className="from__input-box from-grid">
                    <div className="form__input-title">
                        <label htmlFor="formRange3" className="form-label">Steps Range</label>
                    </div>
                    <div className="form__input">
                        <Slider
                            aria-label="Temperature"
                            defaultValue={30}
                            getAriaValueText={valuetext}
                            valueLabelDisplay="auto"
                            shiftStep={30}
                            step={10}
                            marks
                            min={10}
                            max={110}
                            color='primary'
                            size='small'
                        />
                    </div>
                </div>
                <div className="from__input-box from-grid">
                    <div className="form__input-title">
                        <label htmlFor="formRange2" className="form-label">Min and max Range</label>
                    </div>
                    <div className="form__input">
                        <Box>
                            <Slider
                                marks={marks}
                                step={10}
                                value={val}
                                color='primary'
                                size='small'
                                valueLabelDisplay="auto"
                                min={MIN}
                                max={MAX}
                                onChange={handleChange}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography
                                    variant="body2"
                                    onClick={() => setVal(MIN)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    {MIN} min
                                </Typography>
                                <Typography
                                    variant="body2"
                                    onClick={() => setVal(MAX)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    {MAX} max
                                </Typography>
                            </Box>
                        </Box>
                    </div>
                </div>
                <div className="from__input-box from-grid">
                    <div className="form__input-title">
                        <label htmlFor="disabledRange" className="form-label">Disabled range</label>
                    </div>
                    <div className="form__input">
                        <Slider defaultValue={30} step={10} marks min={10} max={110} disabled size='small' />
                    </div>
                </div>
            </div>
        </>
    );
};

export default RangeSlider;
'use client'
import { Checkbox, Radio } from '@mui/material';
import React from 'react';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import TripOriginIcon from '@mui/icons-material/TripOrigin';

const CheckboxRadioSwitch = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Checkbox, Radio and Switch</h5>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <div className="input-group-text">
                            <Checkbox size='small' className='custom-checkbox checkbox-small' />
                        </div>
                        <input type="text" className="form-control" aria-label="Checkbox with text input" placeholder="Right Checkbox" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <input type="text" className="form-control" aria-label="Checkbox with text input" placeholder="Left Checkbox" />
                        <div className="input-group-text">
                            <Checkbox size='small' className='custom-checkbox checkbox-small' />
                        </div>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <div className="input-group-text">
                            <Radio size="small" />
                        </div>
                        <input type="text" className="form-control" aria-label="radio button with text input field" placeholder="Right Radio Button" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <input type="text" className="form-control" aria-label="radio button with text input field" placeholder="Left Radio Button" />
                        <div className="input-group-text">
                            <Radio size="small" />
                        </div>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group ">
                        <div className="input-group-text">
                            <div className="form-check form-switch">
                                <div className="checkbox switches">
                                    <Checkbox size='small' icon={<RadioButtonCheckedIcon />} checkedIcon={<TripOriginIcon />} />
                                </div>
                            </div>
                        </div>
                        <input type="text" className="form-control" aria-label="checkbox with text input field" placeholder="Left Side Checkbox" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group ">
                        <input type="text" className="form-control" aria-label="checkbox with text input field" placeholder="Right Side Checkbox" />
                        <div className="input-group-text">
                            <div className="checkbox switches">
                                <Checkbox size='small' icon={<RadioButtonCheckedIcon />} checkedIcon={<TripOriginIcon />} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CheckboxRadioSwitch;
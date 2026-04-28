"use client"
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import React from 'react';
import CustomRadioGroup from './Radio';

const CheckboxesRadio = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap">
                    <h5 className="card__heading-title">Checkboxes & Radio Color</h5>
                </div>
                <div className="flex justify-between gap-[10px] sm:gap-[20px]">
                    <div className="checkbox-colors mt-3">
                        <div className="flex items-center mt-1">
                            <FormGroup>
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox' defaultChecked />
                                }
                                    label="Primary"
                                />
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox' defaultChecked color="secondary" />
                                }
                                    label="Secondary"
                                />
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox' defaultChecked color="success" />
                                }
                                    label="Success"
                                />
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox danger-checkbox' defaultChecked />
                                }
                                    label="Danger"
                                />
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox' defaultChecked color="warning" />
                                }
                                    label="Warning"
                                />
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox' defaultChecked color="info" />
                                }
                                    label="Info"
                                />
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox' defaultChecked color="default" />
                                }
                                    label="Dark"
                                />
                            </FormGroup>
                        </div>
                    </div>
                    <CustomRadioGroup />
                </div>
            </div>
        </>
    );
};

export default CheckboxesRadio;
import { Label } from '@mui/icons-material';
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import React from 'react';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import TripOriginIcon from '@mui/icons-material/TripOrigin';

const Switches = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Switches</h5>
                </div>
                <div className="checkbox switches">
                    <div className="flex items-center mt-1">
                        <FormGroup>
                            <FormControlLabel control={
                                <Checkbox {...Label} icon={<RadioButtonCheckedIcon />} checkedIcon={<TripOriginIcon />} />
                            }
                                label="Default switch checkbox input"
                            />
                            <FormControlLabel control={
                                <Checkbox {...Label} icon={<RadioButtonCheckedIcon />} checkedIcon={<TripOriginIcon />} defaultChecked />
                            }
                                label="Checked switch checkbox input"
                            />
                            <FormControlLabel control={
                                <Checkbox {...Label} icon={<RadioButtonCheckedIcon />} checkedIcon={<TripOriginIcon />} disabled />
                            }
                                label="Disabled switch checkbox input"
                            />
                            <FormControlLabel control={
                                <Checkbox {...Label} icon={<RadioButtonCheckedIcon />} checkedIcon={<TripOriginIcon />} disabled defaultChecked />
                            }
                                label="Disabled checked switch checkbox input"
                            />
                        </FormGroup>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Switches;
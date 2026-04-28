'use client'
import { Box, Checkbox, FormControl, FormControlLabel, FormGroup, Radio, RadioGroup } from '@mui/material';
import React from 'react';

// Define the possible radio values
type RadioValue = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' | 'disabled';

interface BpRadioProps {
    value: RadioValue | "";
    [key: string]: any;
}

const BpRadio: React.FC<BpRadioProps> = ({ value, ...rest }) => {
    return (
        <Radio
            disableRipple
            color="default"
            checkedIcon={<span className="bp-icon bp-icon-checked" />}
            icon={<span className="bp-icon" />}
            value={value}
            {...rest}
        />
    );
};

const ChecksRadios = () => {
    //indeterminate checkbox start
    const [checked, setChecked] = React.useState([true, false]);

    const handleChange1 = (event: React.ChangeEvent<HTMLInputElement>) => {
        setChecked([event.target.checked, event.target.checked]);
    };

    const handleChange2 = (event: React.ChangeEvent<HTMLInputElement>) => {
        setChecked([event.target.checked, checked[1]]);
    };

    const handleChange3 = (event: React.ChangeEvent<HTMLInputElement>) => {
        setChecked([checked[0], event.target.checked]);
    };

    const children = (
        <Box sx={{ display: 'flex', flexDirection: 'column', ml: 3 }}>
            <FormControlLabel
                label="Child 1"
                control={<Checkbox checked={checked[0]} onChange={handleChange2} />}
            />
            <FormControlLabel
                label="Child 2"
                control={<Checkbox checked={checked[1]} onChange={handleChange3} />}
            />
        </Box>
    );

    //indeterminate checkbox end

    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Checks & Radios</h5>
                </div>
                <div className="card-grid-style">
                    <div className="checkbox">
                        <div className="flex items-center mt-1">
                            <FormGroup>
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox' />
                                }
                                    label="Default Checkbox"
                                />
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox' defaultChecked />
                                }
                                    label="Checked checkbox"
                                />
                                <div>
                                    <FormControlLabel
                                        label="Indeterminate check"
                                        control={
                                            <Checkbox
                                                checked={checked[0] && checked[1]}
                                                indeterminate={checked[0] !== checked[1]}
                                                onChange={handleChange1}
                                            />
                                        }
                                    />
                                    {children}
                                </div>
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox disabled' disabled={true} />
                                }
                                    label="Disabled checkbox"
                                />
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox disabled' disabled={true} defaultChecked />
                                }
                                    label="Disabled checkbox"
                                />
                            </FormGroup>
                        </div>
                    </div>

                    <div className="radio">
                        <div className='radio-input-style'>
                            <FormControl>
                                <RadioGroup defaultValue="primary" aria-labelledby="demo-customized-radios" name="customized-radios">
                                    <FormControlLabel className='radio-primary' control={<BpRadio value="primary" />} label="Checked" />
                                    <FormControlLabel className='radio-primary' control={<BpRadio value="" />} label="Unchecked" />
                                    <FormControlLabel className='radio-primary' disabled control={<BpRadio value="disabled" />} label="Disabled Unchecked" />
                                </RadioGroup>
                            </FormControl>
                        </div>
                        <div className='radio-input-style'>
                            <FormControl>
                                <RadioGroup defaultValue="primary" aria-labelledby="demo-customized-radios" name="customized-radios">
                                    <FormControlLabel className='radio-primary' value={'primary'} disabled control={<BpRadio value="primary" />} label="Disabled Checked" />
                                </RadioGroup>
                            </FormControl>
                        </div>
                    </div>

                    <div className="checkbox-inline">
                        <h6 className="card__sub-title mb-2.5 font-medium">Inline Checkboxes</h6>
                        <div className="flex items-center flex-wrap gap-2 mt-3">
                            <div className="flex items-center mt-1">
                                <FormGroup className='checkbox-inline'>
                                    <FormControlLabel control={
                                        <Checkbox className='custom-checkbox' defaultChecked />
                                    }
                                        label="1"
                                    />
                                    <FormControlLabel control={
                                       <Checkbox className='custom-checkbox' defaultChecked />
                                    }
                                        label="2"
                                    />
                                    <FormControlLabel control={
                                       <Checkbox className='custom-checkbox disabled' disabled={true} />
                                    }
                                        label="Disabled checkbox"
                                    />
                                </FormGroup>
                            </div>
                        </div>
                    </div>
                    <div className="radio">
                        <h6 className="card__sub-title mb-2.5 font-medium">Inline Radio</h6>
                        <div className='flex flex-wrap gap-3'>
                            <div className='radio-input-style'>
                                <FormControl>
                                    <RadioGroup className='!flex-row gap-1' defaultValue="primary" aria-labelledby="demo-customized-radios" name="customized-radios">
                                        <FormControlLabel className='radio-primary' control={<BpRadio value="primary" />} label="1" />
                                        <FormControlLabel className='radio-primary' control={<BpRadio value="" />} label="2" />
                                        <FormControlLabel className='radio-primary' disabled control={<BpRadio value="disabled" />} label="3(disabled)" />
                                    </RadioGroup>
                                </FormControl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChecksRadios;
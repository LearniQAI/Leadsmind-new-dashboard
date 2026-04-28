import { FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';
import React from 'react';

type RadioValue = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark';

interface BpRadioProps {
  value: RadioValue;
  [key: string]: any;
}

export const BpRadio: React.FC<BpRadioProps> = ({ value, ...rest }) => {
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

const FormVariationOne = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Form Variation One</h5>
                </div>
                <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0">
                    <div className='col-span-12 lg:col-span-6'>
                        <div className="text-center">
                            <div className="from__input-box">
                                <div className="form__input">
                                    <input className="form-control" name="fname" id="fname" type="text" placeholder="First Name" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 lg:col-span-6'>
                        <div className="text-center">
                            <div className="from__input-box">
                                <div className="form__input">
                                    <input className="form-control" name="lname" id="lname" type="text" placeholder="Last name" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 lg:col-span-6'>
                        <div className="text-center">
                            <div className="from__input-box">
                                <div className="form__input">
                                    <input className="form-control" name="name" id="number" type="text" placeholder="Phone Number" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12 lg:col-span-6'>
                        <div className="text-center">
                            <div className="from__input-box">
                                <div className="form__input">
                                    <input className="form-control" name="name" id="password" type="password" placeholder="Password" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='col-span-12'>
                        <div className="text-center">
                            <div className="from__input-box">
                                <div className="form__input">
                                    <textarea className="form-control" name="message" placeholder="Your Message"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-[20px] mb-[20px]">
                    <div className='radio-input-style'>
                        <FormControl>
                            <RadioGroup aria-labelledby="demo-customized-radios" name="customized-radios">
                                <FormControlLabel className='radio-primary' control={<BpRadio value="primary" />} label="Agree to terms and conditions" />
                            </RadioGroup>
                        </FormControl>
                    </div>
                </div>
                <button className="btn btn-primary" type="submit">Submit form</button>
            </div>
        </>
    );
};

export default FormVariationOne;
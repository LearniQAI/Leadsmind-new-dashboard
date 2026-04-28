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

const FormVariationFive = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[30px]">
                    <h5 className="card__heading-title">Form Variation Five</h5>
                </div>
                <div className="grid grid-cols-12 gap-[19px] maxXs:gap-x-0 items-center">
                    <div className="col-span-12">
                        <div className="floating__form-input">
                            <input className="form-control inputText" type="text" />
                            <span className="floating-label">Full Name</span>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="floating__form-input">
                            <input className="form-control inputText" type="text" />
                            <span className="floating-label">Your Email</span>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="floating__form-input">
                            <input className="form-control inputText" type="number" />
                            <span className="floating-label">Phone Number</span>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="floating__form-input">
                            <input className="form-control inputText" type="text" />
                            <span className="floating-label">Subject</span>
                        </div>
                    </div>
                    <div className="col-span-12 text-center">
                        <div className="from__input-box">
                            <div className="floating__form-input">
                                <textarea className="form-control textareaText"></textarea>
                                <span className="floating-label-two">Your Message</span>
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

export default FormVariationFive;
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import React from 'react';

const FormVariationThree = () => {
    return (
        <>
            <div className="card__wrapper height-equal">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Form Variation Three</h5>
                </div>
                <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0  items-center justify-center">
                    <div className="col-span-12 lg:col-span-6">
                        <div className="from__input-box">
                            <div className="form__input-title">
                                <label htmlFor="text">First Name<span>*</span></label>
                            </div>
                            <div className="form__input">
                                <input className="form-control" name="fname" id="fnametwo" type="text" placeholder="" />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                        <div className="from__input-box">
                            <div className="form__input-title">
                                <label htmlFor="text">Last name<span>*</span></label>
                            </div>
                            <div className="form__input">
                                <input className="form-control" name="lname" id="lnametwo" type="text" placeholder="" />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                        <div className="from__input-box">
                            <div className="form__input-title">
                                <label htmlFor="text">Phone Number<span>*</span></label>
                            </div>
                            <div className="form__input">
                                <input className="form-control" name="phone" id="phonetwo" type="text" placeholder="" />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                        <div className="from__input-box">
                            <div className="form__input-title">
                                <label htmlFor="text">Password<span>*</span></label>
                            </div>
                            <div className="form__input">
                                <input className="form-control" name="password" id="passwordtwo" type="password" placeholder="" />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="text-start">
                            <div className="from__input-box">
                                <div className="form__input-title">
                                    <label htmlFor="text">Your Message<span>*</span></label>
                                </div>
                                <div className="form__input">
                                    <textarea className="form-control" name="message" placeholder=""></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="my-[20px]">
                    <div className="form-check">
                        <div className="checkbox">
                            <FormGroup>
                                <FormControlLabel control={
                                    <Checkbox className='custom-checkbox' />
                                }
                                    label="Agree to terms and conditions"
                                />
                            </FormGroup>
                        </div>
                    </div>
                </div>
                <button className="btn btn-primary" type="submit">Submit form</button>
            </div>
        </>
    );
};

export default FormVariationThree;
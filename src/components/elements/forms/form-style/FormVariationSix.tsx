import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import React from 'react';

const FormVariationSix = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Form Variation Six</h5>
                </div>
                <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0 items-center justify-center">
                    <div className="col-span-12">
                        <div className="from__input-box">
                            <div className="grid grid-cols-12 gap-2.5">
                                <div className="col-span-12 sm:col-span-3">
                                    <div className="form__input-title">
                                        <label htmlFor="lnameFive">First Name<span>*</span></label>
                                    </div>
                                </div>
                                <div className="col-span-12 sm:col-span-9">
                                    <div className="form__input">
                                        <input className="form-control" name="name" id="fnameFive" type="text" placeholder="" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="from__input-box">
                            <div className="grid grid-cols-12 gap-2.5">
                                <div className="col-span-12 sm:col-span-3">
                                    <div className="form__input-title">
                                        <label htmlFor="lnameFive">Last name<span>*</span></label>
                                    </div>
                                </div>
                                <div className="col-span-12 sm:col-span-9">
                                    <div className="form__input">
                                        <input className="form-control" name="name" id="lnameFive" type="text" placeholder="" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="from__input-box">
                            <div className="grid grid-cols-12 gap-2.5">
                                <div className="col-span-12 sm:col-span-3">
                                    <div className="form__input-title">
                                        <label htmlFor="phoneFive">Phone Number<span>*</span></label>
                                    </div>
                                </div>
                                <div className="col-span-12 sm:col-span-9">
                                    <div className="form__input">
                                        <input className="form-control" name="name" id="phoneFive" type="text" placeholder="" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="from__input-box">
                            <div className="grid grid-cols-12 gap-2.5">
                                <div className="col-span-12 sm:col-span-3">
                                    <div className="form__input-title">
                                        <label htmlFor="passwordFive">Password<span>*</span></label>
                                    </div>
                                </div>
                                <div className="col-span-12 sm:col-span-9">
                                    <div className="form__input">
                                        <input className="form-control" name="name" id="passwordFive" type="password" placeholder="" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12 text-center">
                        <div className="from__input-box">
                            <div className="grid grid-cols-12 gap-2.5">
                                <div className="col-span-12 sm:col-span-3">
                                    <div className="form__input-title">
                                        <label htmlFor="messageF">Your Message<span>*</span></label>
                                    </div>
                                </div>
                                <div className="col-span-12 sm:col-span-9">
                                    <div className="form__input">
                                        {/* -- <textarea name="name" placeholder=""></textarea> -- */}
                                        <textarea className="form-control" name="name" id='messageF' placeholder=""></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 gap-2.5">
                            <div className='hidden sm:block sm:col-span-3'></div>
                            <div className="col-span-9">
                                <div className="mb-[20px]">
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
                            </div>
                        </div>
                    </div>
                </div>
                <button className="btn btn-primary" type="submit">Submit form</button>
            </div>
        </>
    );
};

export default FormVariationSix;
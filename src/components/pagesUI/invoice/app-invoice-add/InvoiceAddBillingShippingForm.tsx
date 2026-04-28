import { Checkbox, FormControlLabel } from '@mui/material';
import React from 'react';

const InvoiceAddBillingShippingForm = () => {
    return (
        <>
            <div className="col-span-12 xl:col-span-6">
                <div className="mb-[15px]">
                    <h5 className="card__heading-title">Billing Address</h5>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="billingName">Full Name</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input type="text" className="form-control" id="billingName" placeholder="Full Name" />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="billingEmail">Email</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input type="email" className="form-control" id="billingEmail" placeholder="Email address" />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="billingAddress">Address</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <textarea
                            className="form-control"
                            id="billingAddress"
                            rows={3}
                            placeholder="Address"
                        ></textarea>
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="billingNumber">Mobile Number</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input type="text" className="form-control" id="billingNumber" placeholder="+1(800) 642 7676" />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="billingPhone">Phone Number</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input type="text" className="form-control" id="billingPhone" placeholder="+1(800) 642 7676" />
                    </div>
                </div>
                <div className="form-check flex items-center">
                   <FormControlLabel control={<Checkbox className='custom-checkbox' defaultChecked /> }label="Are your billing and shipping addresses the same?"/>
                </div>
            </div>
            <div className="col-span-12 xl:col-span-6">
                <div className="mb-[15px]">
                    <h5 className="card__heading-title">Shipping Address</h5>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="shippinggName">Full Name</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input type="text" className="form-control" id="shippinggName" placeholder="Full Name" />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="shippinggEmail">Email</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input type="email" className="form-control" id="shippinggEmail" placeholder="Email address" />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="shippinggAddress">Address</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <textarea
                            className="form-control"
                            id="shippinggAddress"
                            rows={3}
                            placeholder="Address"
                        ></textarea>
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="shippinggNumber">Mobile Number</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input type="text" className="form-control" id="shippinggNumber" placeholder="+1(800) 642 7676" />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="shippinggPhone">Phone Number</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input type="text" className="form-control" id="shippinggPhone" placeholder="+1(800) 642 7676" />
                    </div>
                </div>
            </div>
        </>
    );
};

export default InvoiceAddBillingShippingForm;
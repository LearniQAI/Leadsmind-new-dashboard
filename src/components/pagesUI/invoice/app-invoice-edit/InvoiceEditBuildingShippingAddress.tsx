"use client";
import { Checkbox, FormControlLabel } from "@mui/material";
import React from "react";

const InvoiceEditBuildingShippingAddress = () => {
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
                        <input
                            type="text"
                            className="form-control"
                            id="billingName"
                            placeholder="Full Name"
                            defaultValue="Ethan Mitchell"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="billingEmail">Email</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input
                            type="email"
                            className="form-control"
                            id="billingEmail"
                            placeholder="Email Address"
                            defaultValue="name@manez.com"
                        />
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
                            defaultValue="100 Terminal, Fort Lauderdale, Miami 33315, United States"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="billingNumber">Mobile Number</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input
                            type="text"
                            className="form-control"
                            id="billingNumber"
                            placeholder="+1(800) 642 7676"
                            defaultValue="+1(800) 642 7676"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="billingPhone">Phone Number</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input
                            type="text"
                            className="form-control"
                            id="billingPhone"
                            placeholder="+1(800) 642 7676"
                            defaultValue="+1(800) 642 7676"
                        />
                    </div>
                </div>

                <div className="form-check flex items-center">
                    <FormControlLabel
                        control={<Checkbox className="custom-checkbox" defaultChecked />}
                        label="Are your billing and shipping addresses the same?"
                    />
                </div>
            </div>
            <div className="col-span-12 xl:col-span-6">
                <div className="mb-[15px]">
                    <h5 className="card__heading-title">Shipping Address</h5>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="shippingName">Full Name</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input
                            type="text"
                            className="form-control"
                            id="shippingName"
                            placeholder="Full Name"
                            defaultValue="Ethan Mitchell"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="shippingEmail">Email</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input
                            type="email"
                            className="form-control"
                            id="shippingEmail"
                            placeholder="Email Address"
                            defaultValue="name@manez.com"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="shippingAddress">Address</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <textarea
                            className="form-control"
                            id="shippingAddress"
                            rows={3}
                            placeholder="Address"
                            defaultValue="100 Terminal, Fort Lauderdale, Miami 33315, United States"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="shippingNumber">Mobile Number</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input
                            type="text"
                            className="form-control"
                            id="shippingNumber"
                            placeholder="+1(800) 642 7676"
                            defaultValue="+1(800) 642 7676"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-12 items-center mb-2.5">
                    <div className="col-span-12 lg:col-span-4">
                        <div className="form__input-title">
                            <label htmlFor="shippingPhone">Phone Number</label>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                        <input
                            type="text"
                            className="form-control"
                            id="shippingPhone"
                            placeholder="+1(800) 642 7676"
                            defaultValue="+1(800) 642 7676"
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default InvoiceEditBuildingShippingAddress;

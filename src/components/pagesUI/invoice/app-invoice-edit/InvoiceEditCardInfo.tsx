"use client";
import { BpRadio } from "@/components/elements/forms/form-basic-input/Radio";
import { FormControlLabel, RadioGroup, Tab, Tabs } from "@mui/material";
import React, { useState } from "react";

const InvoiceEditCardInfo = () => {
  const [selectedValue, setSelectedValue] = useState("primary");
  const [value, setValue] = useState<number>(0);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    // Sync selectedValue based on the tab index
    const tabValues = ["primary", "secondary", "info"];
    setSelectedValue(tabValues[newValue]);
  };

  // Handle radio button change
  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelectedValue = event.target.value;
    setSelectedValue(newSelectedValue);
    // Sync tab index based on the selected radio defaultValue
    const tabValues = ["primary", "secondary", "info"];
    setValue(tabValues.indexOf(newSelectedValue));
  };

  return (
    <>
      <div className="card__info-wrapper">
        <div className="payment__card-tab">
          {/* Tabs */}
          <div className="invoice-tabs-wrapper radio-input-style">
            <Tabs
              value={value}
              onChange={handleTabChange}
              className="flex justify-between"
              TabIndicatorProps={{ style: { display: "none" } }}
            >
              <Tab
                label={
                  <RadioGroup
                    value={selectedValue}
                    onChange={handleRadioChange}
                    name="customized-radios"
                  >
                    <FormControlLabel
                      className="radio-primary"
                      control={<BpRadio value="primary" />}
                      label="Bank Account"
                    />
                  </RadioGroup>
                }
              />
              <Tab
                label={
                  <RadioGroup
                    value={selectedValue}
                    onChange={handleRadioChange}
                    name="customized-radios"
                  >
                    <FormControlLabel
                      className="radio-secondary"
                      control={<BpRadio value="secondary" />}
                      label="PayPal"
                    />
                  </RadioGroup>
                }
              />
              <Tab
                label={
                  <RadioGroup
                    value={selectedValue}
                    onChange={handleRadioChange}
                    name="customized-radios"
                  >
                    <FormControlLabel
                      className="radio-info"
                      control={<BpRadio value="info" />}
                      label="Cash On Delivery"
                    />
                  </RadioGroup>
                }
              />
            </Tabs>
          </div>
        </div>
        <div>
          <div hidden={value !== 0}>
            {value === 0 && (
              <div className="payment__card-content">
                <div className="grid grid-cols-12 gap-5 maxSm:gap-x-0 items-center content-end justify-between">
                  <div className="col-span-12 md:col-span-6">
                    <div className="from__input-box">
                      <div className="form__input-title">
                        <label htmlFor="cardname">Card Name</label>
                      </div>
                      <div className="form__input">
                        <input
                          className="form-control"
                          name="name"
                          id="cardname"
                          type="text"
                          placeholder="Card Holder Name"
                          defaultValue={"Ethan Mitchell"}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="from__input-box">
                      <div className="form__input-title">
                        <label htmlFor="creditCard">Card Number</label>
                      </div>
                      <div className="card-form-control relative">
                        <input
                          className="form-control"
                          type="text"
                          id="creditCard"
                          name="creditCard"
                          placeholder="XXXX XXXX XXXX XXXX"
                          defaultValue={"34"}
                        />
                        <div className="credit-card__logo">
                          <i
                            className="fa-brands fa-cc-amex"
                            id="creditCardLogo"
                          ></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="from__input-box">
                      <div className="form__input-title">
                        <label className="form-check-label" htmlFor="cardmmyy">
                          Exp. Date
                        </label>
                      </div>
                      <input
                        className="form-control"
                        id="cardmmyy"
                        placeholder="MM/YY"
                        defaultValue={"01/24"}
                      />
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="from__input-box">
                      <div className="form__input-title">
                        <label className="form-check-label" htmlFor="cvvcode">
                          CVV Code
                        </label>
                      </div>
                      <input
                        className="form-control"
                        id="cvvcode"
                        type="text"
                        placeholder="XXX"
                        defaultValue={"123"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div hidden={value !== 1}>
            {value === 1 && (
              <div className="payment__card-content mt-5 mb-5">
                <div className="from__input-box">
                  <div className="form__input-title">
                    <label htmlFor="cardname2">Send Mony</label>
                  </div>
                  <div className="form__input">
                    <input
                      className="form-control"
                      name="name"
                      id="cardname2"
                      type="text"
                      placeholder="Name, email or mobile number"
                      defaultValue={"name@manez.com"}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div hidden={value !== 2}>
            {value === 2 && (
              <div className="payment__card-content mt-5 mb-5"></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceEditCardInfo;

"use client";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import React from "react";

const FormVariationFour = () => {
  return (
    <>
      <div className="card__wrapper height-equal">
        <div className="card__title-wrap mb-[20px]">
          <h5 className="card__heading-title">Form Variation Four</h5>
        </div>
        <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0 items-center justify-center">
          <div className="col-span-12 lg:col-span-6">
            <div className="from__input-box has-icon input-icon-right">
              <div className="form__input">
                <input
                  className="form-control"
                  name="name"
                  id="fnamefour"
                  type="text"
                  placeholder="Your Name"
                />
                <div className="">
                  <span>
                    <i className="fa-solid fa-user"></i>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <div className="from__input-box has-icon input-icon-right">
              <div className="form__input">
                <input
                  className="form-control"
                  name="name"
                  id="emailfour"
                  type="text"
                  placeholder="Your Email"
                />
                <div className="">
                  <span>
                    <i className="fa-solid fa-envelope"></i>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <div className="from__input-box has-icon input-icon-right">
              <div className="form__input">
                <input
                  className="form-control"
                  name="name"
                  id="phonefour"
                  type="text"
                  placeholder="Your Phone"
                />
                <div className="">
                  <span>
                    <i className="fa-solid fa-phone"></i>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <div className="from__input-box has-icon input-icon-right">
              <div className="form__input">
                <input
                  className="form-control"
                  name="name"
                  id="subject"
                  type="text"
                  placeholder="Subject"
                />
                <div className="">
                  <span>
                    <i className="fa-solid fa-book"></i>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12">
            <div className="text-center">
              <div className="from__input-box has-icon input-icon-right">
                <div className="form__input">
                  <textarea
                    className="form-control"
                    name="name"
                    placeholder="Your Message"
                  ></textarea>
                  <div className="">
                    <span>
                      <i className="fa-solid fa-pen"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="my-[20px]">
          <div className="form-check">
            <div className="checkbox">
              <FormGroup>
                <FormControlLabel
                  control={<Checkbox className="custom-checkbox" />}
                  label="Agree to terms and conditions"
                />
              </FormGroup>
            </div>
          </div>
        </div>
        <button className="btn btn-primary" type="submit">
          Submit form
        </button>
      </div>
    </>
  );
};

export default FormVariationFour;

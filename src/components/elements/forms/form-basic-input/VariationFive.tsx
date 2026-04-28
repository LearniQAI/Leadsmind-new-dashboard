'use client'
import React, { useState } from 'react';
import FormLabel from '../../SharedInputs/FormLabel';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const BasicInputFieldWithLabelTop = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [localTimeDate, setLocalTimeDate] = useState<Date | null>(new Date());
  const [weekPicker, setWeekPicker] = useState<Date | null>(new Date());
  const [month, setMonth] = useState<Date | null>(new Date());
  return (
    <>
      <div className="card__wrapper no-height">
        <div className="card__title-wrap mb-[20px]">
          <h5 className="card__heading-title">
            Basic input field with Label Top
          </h5>
        </div>
        <div className="grid grid-cols-12">
          {/* Name Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Name" id="text2" />
            <div className="form__input">
              <input
                className="form-control"
                name="name"
                id="text2"
                type="text"
                placeholder="Manez Admin"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Password" id="password2" />
            <div className="form__input">
              <input
                className="form-control"
                name="name"
                id="password2"
                type="password"
                placeholder="Password"
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Email" id="email2" />
            <div className="form__input">
              <input
                className="form-control"
                name="name"
                id="email2"
                type="email"
                placeholder="Email Address"
              />
            </div>
          </div>

          {/* Number Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Number" id="number2" />
            <div className="form__input">
              <input
                className="form-control"
                name="name"
                id="number2"
                type="number"
                placeholder="+123456789"
              />
            </div>
          </div>

          {/* Telephone Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Telephone" id="tel2" />
            <div className="form__input">
              <input
                className="form-control"
                name="name"
                id="tel2"
                type="tel"
                placeholder="012345"
              />
            </div>
          </div>

          {/* URL Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Url" id="html5-url-input2" />
            <div className="form__input">
              <input
                className="form-control"
                type="url"
                defaultValue="https://bdevs.net"
                id="html5-url-input2"
              />
            </div>
          </div>
          {/* Time Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Time" id="" />
            <div className="datepicker-style">
              <DatePicker
                selected={startTime}
                onChange={(date) => setStartTime(date)}
                showYearDropdown
                showMonthDropdown
                useShortMonthInDropdown
                showPopperArrow={false}
                peekNextMonth
                dropdownMode="select"
                isClearable
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={1}
                timeCaption="Time"
                dateFormat="h:mm aa"
                placeholderText="Select time"
                className="w-full"
              />
            </div>
          </div>

          {/* Date Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Date" id="" />
            <div className="datepicker-style">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                showYearDropdown
                showMonthDropdown
                useShortMonthInDropdown
                showPopperArrow={false}
                peekNextMonth
                dropdownMode="select"
                isClearable
                dateFormat="dd/MM/yyyy"
                placeholderText="Select date"
                className="w-full"
              />
            </div>
          </div>

          {/* DateTime Local Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Local Time & Date" id="" />
            <div className="datepicker-style">
              <DatePicker
                selected={localTimeDate}
                onChange={(date) => setLocalTimeDate(date)}
                showTimeSelect
                timeFormat="p"
                timeIntervals={15}
                dateFormat="Pp"
                placeholderText="Select date"
                isClearable
              />
            </div>
          </div>

          {/* Week Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Week" id="" />
            <div className="datepicker-style">
              <DatePicker
                selected={weekPicker}
                onChange={(date) => setWeekPicker(date)}
                dateFormat="I/R"
                showWeekNumbers
                showWeekPicker
                isClearable
                placeholderText="Select date"
              />
            </div>
          </div>

          {/* Month Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Month" id="" />
            <div className="datepicker-style">
              <DatePicker
                selected={month}
                onChange={(date) => setMonth(date)}
                showMonthYearPicker
                isClearable
                dateFormat="MMMM, yyyy"
                placeholderText="Select Month"
              />
            </div>
          </div>

          {/* Color Input */}
          <div className="col-span-12 from__input-box">
            <div className="form__input-title">
              <label htmlFor="color-input2">
                Color<span>*</span>
              </label>
            </div>
            <div className="form__input clr_style_two">
              <input type="color" defaultValue="#6C5FFC" id="color-input2" />
            </div>
          </div>

          {/* Search Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel label="Search" id="search2" />
            <div className="form__input">
              <input
                className="form-control"
                name="name"
                id="search2"
                type="search"
                placeholder="Search Here"
              />
            </div>
          </div>

          {/* Read Only Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel
              label="Read only Box"
              id="exampleFormControlReadOnlyInput2"
              optional={true}
            />
            <div className="form__input">
              <input
                className="form-control"
                type="text"
                id="exampleFormControlReadOnlyInput2"
                placeholder="Readonly input here..."
              />
            </div>
          </div>

          {/* Read Only Plain Input */}
          <div className="col-span-12 from__input-box">
            <FormLabel
              label="Read plain"
              id="exampleFormControlReadOnlyInputPlain2"
              optional={true}
            />
            <div className="form__input">
              <input
                type="text"
                className="form-control-plaintext"
                id="exampleFormControlReadOnlyInputPlain2"
                defaultValue="email@example.com"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="grid justify-end">
          <div className="col-span-12">
            <div className="flex items-center gap-[10px]">
              <button className="btn btn-primary" type="submit">
                Submit
              </button>
              <button className="btn btn-danger" type="button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BasicInputFieldWithLabelTop;

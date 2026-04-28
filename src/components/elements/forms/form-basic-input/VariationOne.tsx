'use client'
import React, { useState } from 'react';
import FormLabel from '../../SharedInputs/FormLabel';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const BasicInputFieldWithRightSideLabel = () => {
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [startTime, setStartTime] = useState<Date | null>(new Date());
    const [timeDate, setTimeDate] = useState<Date | null>(new Date());
    const [weekPicker, setWeekPicker] = useState<Date | null>(new Date());
    const [month, setMonth] = useState<Date | null>(new Date());

    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Basic input field with Right Side Label</h5>
                </div>
                <div className="grid grid-cols-12 gap-[15px] maxXs:gap-x-0 items-center justify-center">
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Text" id="name" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="form__input">
                                    <input className="form-control" name="name" id="name" type="text" placeholder="Manez Admin" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Password" id="password" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="form__input">
                                    <input className="form-control" name="name" id="password" type="password" placeholder="Password" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Email" id="email" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="form__input">
                                    <input className="form-control" name="name" id="email" type="email" placeholder="Email Address" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Number" id="number" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="form__input">
                                    <input className="form-control" name="name" id="number" type="number" placeholder="+123456789" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Telephone" id="tel" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="form__input">
                                    <input className="form-control" name="name" id="tel" type="tel" placeholder="012345" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Url" id="html5-url-input" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="form__input">
                                    <input className="form-control" type="url" defaultValue="https://bdevs.net" id="html5-url-input" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Time" id="startTime" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="datepicker-style">
                                    <DatePicker
                                        id='startTime'
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
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Date" id="startDate" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="datepicker-style">
                                    <DatePicker
                                        id='startDate'
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
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Time & Date" id="timeDate" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="datepicker-style">
                                    <DatePicker
                                        id='timeDate'
                                        selected={timeDate}
                                        onChange={(date) => setTimeDate(date)}
                                        showTimeSelect
                                        isClearable
                                        timeFormat="HH:mm"
                                        timeIntervals={15}
                                        timeCaption="time"
                                        dateFormat="MMMM d, yyyy h:mm aa"
                                        placeholderText="Select date & time"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Week" id="weekPicker" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="datepicker-style">
                                    <DatePicker
                                        id='weekPicker'
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
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Month" id="month" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="datepicker-style">
                                    <DatePicker
                                        id='month'
                                        selected={month}
                                        onChange={(date) => setMonth(date)}
                                        showMonthYearPicker
                                        isClearable
                                        dateFormat="MMMM, yyyy"
                                        placeholderText="Select Month"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Color" id="color" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="form__input clr_style_two">
                                    <input type="color" defaultValue="#6C5FFC" id="color-input2" />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Color Input */}
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Search" id="search" />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="form__input">
                                    <input className="form-control" name="name" id="search" type="search" placeholder="Search Here" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Read only Box" id="exampleFormControlReadOnlyInput1" optional={true} />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="form__input">
                                    <input className="form-control" type="text" id="exampleFormControlReadOnlyInput1" placeholder="Readonly input here..." />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="grid grid-cols-12 from__input-box">
                            <div className="col-span-12 sm:col-span-3">
                                <FormLabel label="Readplain" id="exampleFormControlReadOnlyInputPlain1" className='form-label' optional={true} />
                            </div>
                            <div className="col-span-12 sm:col-span-9">
                                <div className="form__input">
                                    <input type="text" className="form-control-plaintext" id="exampleFormControlReadOnlyInputPlain1" defaultValue="email@example.com" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid justify-end">
                    <div className="col-span-12">
                        <div className="flex items-center gap-[10px]">
                            <button className="btn btn-primary" type="submit">Submit</button>
                            <button className="btn btn-danger" type="submit">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BasicInputFieldWithRightSideLabel;

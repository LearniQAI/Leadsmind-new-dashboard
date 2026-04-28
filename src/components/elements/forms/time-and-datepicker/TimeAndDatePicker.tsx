'use client'
import React, { useState } from 'react';
import FormLabel from '../../SharedInputs/FormLabel';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const TimeAndDatePicker = () => {
    const [selectStartDate, setSelectStartDate] = useState<Date | null>(new Date());
    const [selectEndDate, setSelectEndDate] = useState<Date | null>(new Date());
    const [nullDate, setNullDate] = useState<Date | null>();
    const [startTime, setStartTime] = useState<Date | null>(new Date());
    const [endTime, setEndTime] = useState<Date | null>(new Date());
    const [nullTime, setNullTime] = useState<Date | null>();
    const [timeDate, setTimeDate] = useState<Date | null>(new Date());
    const [weekPicker, setWeekPicker] = useState<Date | null>(new Date());
    const [month, setMonth] = useState<Date | null>(new Date());
    const [localTimeDate, setLocalTimeDate] = useState<Date | null>(new Date());

    //range calendar start
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [startDate, endDate] = dateRange;
    //range calendar end

    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Time & Datepicker</h5>
                </div>
                <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0">
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="Start Date" id="selectStartDate" />
                        <div className="datepicker-style">
                            <DatePicker
                                id='selectStartDate'
                                selected={selectStartDate}
                                onChange={(date) => setSelectStartDate(date)}
                                showYearDropdown
                                showMonthDropdown
                                useShortMonthInDropdown
                                showPopperArrow={false}
                                peekNextMonth
                                dropdownMode="select"
                                isClearable
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Start date"
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="End Date" id="selectEndDate" />
                        <div className="datepicker-style">
                            <DatePicker
                                id='selectEndDate'
                                selected={selectEndDate}
                                onChange={(date) => setSelectEndDate(date)}
                                showYearDropdown
                                showMonthDropdown
                                useShortMonthInDropdown
                                showPopperArrow={false}
                                peekNextMonth
                                dropdownMode="select"
                                isClearable
                                dateFormat="dd/MM/yyyy"
                                placeholderText="End Date"
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="Null Date" id="nullDate" />
                        <div className="datepicker-style">
                            <DatePicker
                                id='nullDate'
                                selected={nullDate}
                                onChange={(date) => setNullDate(date)}
                                showYearDropdown
                                showMonthDropdown
                                useShortMonthInDropdown
                                showPopperArrow={false}
                                peekNextMonth
                                dropdownMode="select"
                                isClearable
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Select Date"
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="Start Time" id="startTime" />
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
                                placeholderText="Start time"
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="End Time" id="endTime" />
                        <div className="datepicker-style">
                            <DatePicker
                                id='endTime'
                                selected={endTime}
                                onChange={(date) => setEndTime(date)}
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
                                placeholderText="End time"
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="Default Null Time" id="nullTime" />
                        <div className="datepicker-style">
                            <DatePicker
                                id='nullTime'
                                selected={nullTime}
                                onChange={(date) => setNullTime(date)}
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
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="Date & Time" id="timeDate" />
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
                                placeholderText="Select date"
                            />
                        </div>
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="Local Time & Date" id="localTimeDate" />
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
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="Week" id="weekPicker" />
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
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="Month" id="month" />
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
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                        <FormLabel label="Range Calendar" id="month" />
                        <div className="datepicker-style">
                            <DatePicker
                                selectsRange
                                startDate={startDate || undefined}
                                endDate={endDate || undefined}
                                onChange={(update: [Date | null, Date | null]) => {
                                    setDateRange(update);
                                }}
                                placeholderText="Select date"
                                isClearable
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TimeAndDatePicker;
"use client"
import { FormControl, MenuItem, Select, Tab, Tabs } from '@mui/material';
import Link from 'next/link';
import React, { useState } from 'react';
import WorkingHourYearChart from './WorkingHourYearChart';
import WorkingHourMonthChart from './WorkingHourMonthChart';
import WorkingHourWeekChart from './WorkingHourWeekChart';
import { yearData } from '@/data/dropdown-data';

const AttendanceLeaves = () => {
    const [value, setValue] = useState<number>(0);
    const [selectYear, setSelectYear] = useState<string>("");

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <>
            <div className="card__wrapper mb-[20px] no-height">
                <div className="card__title-wrap flex items-center justify-between mb-[20px]">
                    <h5 className="card__heading-title">Attendance & Leaves</h5>
                    <div className="card__dropdown select-wrapper">
                        <div className="from__input-box">
                            <FormControl sx={{ m: 1 }}>
                                <Select
                                    displayEmpty
                                    value={selectYear}
                                    onChange={(e) => setSelectYear(e.target.value)}
                                    renderValue={(selected) => (selected === "" ? "Year" : selected)}
                                    MenuProps={{
                                        disableScrollLock: true,
                                    }}
                                >
                                    {yearData.map((option) => (
                                        <MenuItem key={option.value} value={option.label} className="menu-item">
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </div>
                    </div>
                </div>
                <div className="attendance__list">
                    <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-2.5">
                        <div className="col-span-6 md:col-span-4">
                            <div className="attendance__details mb-[10px]">
                                <h4 className="text-primary dark:text-primary-dark">10</h4>
                                <p>Total Leaves</p>
                            </div>
                        </div>
                        <div className="col-span-6 md:col-span-4">
                            <div className="attendance__details mb-[10px]">
                                <h4 className="text-secondary dark:text-secondary-dark">6.5</h4>
                                <p>Leaves Taken</p>
                            </div>
                        </div>
                        <div className="col-span-6 md:col-span-4">
                            <div className="attendance__details mb-[10px]">
                                <h4 className="text-success dark:text-success-dark">06</h4>
                                <p>Leaves Absent</p>
                            </div>
                        </div>
                        <div className="col-span-6 md:col-span-4">
                            <div className="attendance__details mb-[10px]">
                                <h4 className="text-link dark:text-link-dark">1</h4>
                                <p>Pending Approval</p>
                            </div>
                        </div>
                        <div className="col-span-6 md:col-span-4">
                            <div className="attendance__details mb-[10px]">
                                <h4 className="text-info dark:text-info-dark">315</h4>
                                <p>Working Days</p>
                            </div>
                        </div>
                        <div className="col-span-6 md:col-span-4">
                            <div className="attendance__details mb-[10px]">
                                <h4 className="text-danger dark:text-danger-dark">3</h4>
                                <p>Loss of Pay</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="attendance-btn">
                    <Link className="btn btn-primary" href="/hrm/leaves-employee">
                        Apply Leave</Link>
                </div>
            </div>
            <div className="chart-common mb-[20px]">
                <div className="card__wrapper style_two card-tab-wrapper">
                    <div className="card__title-wrap flex flex-wrap items-center justify-between gap-[10px] mb-[15px]">
                        <h5 className="card__heading-title">Working Hours</h5>
                        <div className="card__tab">
                            <Tabs value={value} onChange={handleChange}>
                                <Tab label="1Y" />
                                <Tab label="1M" />
                                <Tab label="1W" />
                            </Tabs>
                        </div>
                    </div>
                </div>
                <div className="tab-content">
                    <div hidden={value !== 0}>
                        <div className="card__chart">
                            {value === 0 && (
                                <WorkingHourYearChart />
                            )}
                        </div>
                    </div>
                    <div hidden={value !== 1}>
                        <div className="card__chart">
                            {value === 1 && (
                                <WorkingHourMonthChart />
                            )}
                        </div>
                    </div>
                    <div hidden={value !== 2}>
                        <div className="card__chart">
                            {value === 2 && (
                                <WorkingHourWeekChart />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AttendanceLeaves;
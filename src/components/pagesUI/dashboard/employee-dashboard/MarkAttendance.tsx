"use client"
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import React from 'react';

const MarkAttendance = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap flex items-center justify-between mb-[20px]">
                    <h5 className="card__heading-title">Mark Attendance</h5>
                    <CustomDropdown items={dropdownItems} />
                </div>
                <p className="text-muted">Office Time: 09:00AM to 06:00PM</p>
                <div className="flex items-center gap-[15px]">
                    <div className="">
                        <form action="#">
                            <button type="submit" value="0" name="in" id="clock_in" className="btn btn-primary">Clock
                                In</button>
                        </form>
                    </div>
                    <div className="">
                        <button type="submit" id="clock_out" className="btn btn-danger">Clock Out</button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MarkAttendance;
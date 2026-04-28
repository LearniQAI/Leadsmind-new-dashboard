import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import TimeAndDatePicker from './TimeAndDatePicker';

const TimeAndDatePickerMain = () => {
    return (
        <>
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Time & Datepicker' subTitle='Home' />

                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <TimeAndDatePicker />
                    </div>
                </div>
            </div>
        </>
    );
};

export default TimeAndDatePickerMain;
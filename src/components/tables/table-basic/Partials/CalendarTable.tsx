"use client";
import React from "react";
import { dropdownItems } from "@/data/dropdown-data";
import CustomDropdown from "@/components/dropdown/CustomDropdown";
import MiniCalendar from "@/components/pagesUI/apps/home/MiniCalander";

const CalendarTable = () => {
  return (
    <>
      <div className="col-span-12 xxl:col-span-7">
        <div className="card__wrapper">
          <div className="card__title-wrap flex items-center justify-between mb-5">
            <h5 className="card__heading-title">Table Calender</h5>
            <CustomDropdown items={dropdownItems} />
          </div>
          <div className="calendar-wrapper">
            <MiniCalendar />
          </div>
        </div>
      </div>
    </>
  );
};

export default CalendarTable;

"use client";
import React from "react";
import { dropdownItems } from "@/data/dropdown-data";
import MiniCalendar from "./MiniCalander";
import CustomDropdown from "@/components/dropdown/CustomDropdown";

const CalanderSection = () => {
  return (
    <>
      <div className="col-span-12 xxl:col-span-7">
        <div className="card__wrapper">
          <div className="card__title-wrap flex items-center justify-between mb-5">
            <h5 className="card__heading-title">Calender</h5>
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

export default CalanderSection;

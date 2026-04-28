"use client"
import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import CustomDropdown from "@/components/dropdown/CustomDropdown";
import { dropdownItems } from "@/data/dropdown-data";

const EmployeeCalendar = () => {
  return (

    <div className="card__wrapper">
      <div className="card__title-wrap flex items-center justify-between mb-[20px]">
        <h5 className="card__heading-title">Calender</h5>
        <CustomDropdown items={dropdownItems} />
      </div>
      <div className="calendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          initialDate="2024-05-12"
          navLinks={true}
          businessHours={true}
          editable={true}
          selectable={true}
          events={[
            {
              title: "Conference",
              start: "2024-05-18",
              end: "2024-05-20",
            },
          ]}
        />
      </div>
    </div>
  );
};

export default EmployeeCalendar;

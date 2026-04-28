"use client"
import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import FullCalendar from "@fullcalendar/react";
import React, { useState } from "react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import AddEventModal from "./AddEventModal";

const CalendarMainArea = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Calendar" subTitle="Home" />
        <div className="grid grid-cols-12">
          <div className="col-span-12 flex mb-5 justify-end text-end">
            <button type="button" onClick={() => setModalOpen(true)} className="btn btn-primary">Add
              New Event</button>
          </div>
          <div className="col-span-12">
            <div className="card__wrapper">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
                }}
                initialDate="2024-05-12"
                navLinks={true}
                businessHours={true}
                editable={true}
                selectable={true}
                events={[
                  {
                    title: 'Event 1',
                    start: '2024-05-01'
                  },
                  {
                    start: '2024-05-06',
                    end: '2024-05-08',
                    overlap: false,
                    display: 'background',
                    color: '#FFB200'
                  }
                ]}
              />
            </div>
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
      {modalOpen && <AddEventModal open={modalOpen} setOpen={setModalOpen} />}
    </>
  );
};

export default CalendarMainArea;

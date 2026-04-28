"use client";
import Link from "next/link";
import React, { useState } from "react";
import DesignationsTable from "../designations/DesignationsTable";
import AddNewDesignationModal from "../designations/AddNewDesignationModal";
import HolidayTable from "./HolidayTable";
import AddNewHoliday from "./AddNewHoliday";

const HolidaysMainArea = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="app__slide-wrapper">
        <div className="breadcrumb__wrapper mb-[25px]">
          <nav>
            <ol className="breadcrumb flex items-center mb-0">
              <li className="breadcrumb-item">
                <Link href="/">Home</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Holidays
              </li>
            </ol>
          </nav>
          <div className="breadcrumb__btn">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setModalOpen(true)}
            >
              Add Holidays
            </button>
          </div>
        </div>
        {/* table */}
        <HolidayTable />

        {modalOpen && <AddNewHoliday open={modalOpen} setOpen={setModalOpen} />}
      </div>
    </>
  );
};

export default HolidaysMainArea;

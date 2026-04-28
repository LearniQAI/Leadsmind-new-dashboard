"use client";
import React, { useState } from "react";
import Link from "next/link";
import ActivitiesTable from "./ActivitiesTable";
import AddActivitiesModal from "./AddActivitiesModal";

const ActivitiesMainArea = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="app__slide-wrapper">
        <div className="breadcrumb__area">
          <div className="breadcrumb__wrapper mb-[25px]">
            <nav>
              <ol className="breadcrumb mb-0 flex">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Activities
                </li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModalOpen(true)}
              >
                Add Activities
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <ActivitiesTable />
        </div>
      </div>

      {modalOpen && (
        <AddActivitiesModal open={modalOpen} setOpen={setModalOpen} />
      )}
    </>
  );
};

export default ActivitiesMainArea;

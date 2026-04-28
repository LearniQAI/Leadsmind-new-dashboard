"use client";
import React, { useState } from "react";
import Link from "next/link";
import AddNewTrainee from "./AddNewTrainee";
import TrainingSummary from "./TrainingSummary";
import TrainingTable from "./TrainingTable";
const TrainingMainArea = () => {
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
                Training
              </li>
            </ol>
          </nav>
          <div className="breadcrumb__btn">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setModalOpen(true)}
            >
              Add New Trainee
            </button>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-0">
          <TrainingSummary />
          <TrainingTable />
        </div>

        {/* table */}

        {modalOpen && <AddNewTrainee open={modalOpen} setOpen={setModalOpen} />}
      </div>
    </>
  );
};

export default TrainingMainArea;

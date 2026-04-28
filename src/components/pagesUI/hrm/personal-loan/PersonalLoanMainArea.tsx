"use client";
import Link from "next/link";
import React, { useState } from "react";
import PersonalLoanSummary from "./PersonalLoanSummary";
import PersonalLoanTable from "./PersonalLoanTable";
import AddPersonalLoanModal from "./AddPersonalLoanModal";

const PersonalLoanMainArea = () => {
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
                Personal Loan
              </li>
            </ol>
          </nav>
          <div className="breadcrumb__btn">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setModalOpen(true)}
            >
              Add Loan
            </button>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <PersonalLoanSummary />
          <PersonalLoanTable />
        </div>
        {modalOpen && (
          <AddPersonalLoanModal open={modalOpen} setOpen={setModalOpen} />
        )}
      </div>
    </>
  );
};

export default PersonalLoanMainArea;

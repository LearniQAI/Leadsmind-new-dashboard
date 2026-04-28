"use client";
import Link from "next/link";
import React, { useState } from "react";
import AddNewResignationModal from "./AddNewResignationModal";
import ResignationTable from "./ResignationTable";

const ReisgnationMainArea = () => {
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
                Resignation
              </li>
            </ol>
          </nav>
          <div className="breadcrumb__btn">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setModalOpen(true)}
            >
              Add Resignation
            </button>
          </div>
        </div>
        {/* table */}
        <ResignationTable />
        {modalOpen && (
          <AddNewResignationModal open={modalOpen} setOpen={setModalOpen} />
        )}
      </div>
    </>
  );
};

export default ReisgnationMainArea;

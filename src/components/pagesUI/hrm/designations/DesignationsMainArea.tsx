"use client";
import Link from "next/link";
import React, { useState } from "react";
import AddNewDesignationModal from "./AddNewDesignationModal";
import DesignationsTable from "./DesignationsTable";

const DesignationsMainArea = () => {
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
                Designations
              </li>
            </ol>
          </nav>
          <div className="breadcrumb__btn">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setModalOpen(true)}
            >
              Add Designation
            </button>
          </div>
        </div>
        {/* table */}
        <DesignationsTable />

        {modalOpen && (
          <AddNewDesignationModal open={modalOpen} setOpen={setModalOpen} />
        )}
      </div>
    </>
  );
};

export default DesignationsMainArea;

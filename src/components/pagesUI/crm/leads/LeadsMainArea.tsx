"use client";
import React, { useState } from "react";
import Link from "next/link";
import AddLeadsModal from "./AddLeadsModal";
import LeadsSummary from "./LeadsSummary";
import LeadsTable from "./LeadsTable";

const LeadsMainArea = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <div className="breadcrumb__area">
          <div className="breadcrumb__wrapper mb-[25px]">
            <nav>
              <ol className="breadcrumb flex items-center mb-0">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Leads
                </li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="btn btn-primary"
              >
                Add Lead
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <LeadsSummary />
          <LeadsTable />
        </div>
      </div>
      {/* -- App side area end -- */}
      {modalOpen && <AddLeadsModal open={modalOpen} setOpen={setModalOpen} />}
    </>
  );
};

export default LeadsMainArea;

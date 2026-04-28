"use client";
import Link from "next/link";
import React, { useState } from "react";
import DealsTable from "./DealsTable";
import AddDealsModal from "./AddDealsModal";
import DealsSummary from "./DealsSummary";

const DealsMainArea = () => {
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
                <li className="breadcrumb-item active">Deals</li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="btn btn-primary"
              >
                Add Deals
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <DealsSummary />
          <DealsTable />
        </div>
      </div>
      {/* -- App side area end -- */}
      {modalOpen && <AddDealsModal open={modalOpen} setOpen={setModalOpen} />}
    </>
  );
};

export default DealsMainArea;

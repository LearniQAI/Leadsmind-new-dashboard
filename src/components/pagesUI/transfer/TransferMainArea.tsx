"use client";
import Link from "next/link";
import React, { useState } from "react";
import TransferTable from "./TransferTable";
import AddNewTransferModal from "./AddNewTransferModal";

const TransferMainArea = () => {
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
                Transfer
              </li>
            </ol>
          </nav>
          <div className="breadcrumb__btn">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setModalOpen(true)}
            >
              Add Transfer
            </button>
          </div>
        </div>
        {/* table */}
        <TransferTable />
        {modalOpen && (
          <AddNewTransferModal open={modalOpen} setOpen={setModalOpen} />
        )}
      </div>
    </>
  );
};

export default TransferMainArea;

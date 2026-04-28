"use client";
import Link from "next/link";
import React, { useState } from "react";
import AnnouncementTable from "./AnnouncementTable";
import AddNewAnnouncementModal from "./AddNewAnnouncementModal";

const AnnouncementMainArea = () => {
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
                Announcement
              </li>
            </ol>
          </nav>
          <div className="breadcrumb__btn">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setModalOpen(true)}
            >
              Add Announcement
            </button>
          </div>
        </div>
        {/* table */}
        <AnnouncementTable />
        {modalOpen && (
          <AddNewAnnouncementModal open={modalOpen} setOpen={setModalOpen} />
        )}
      </div>
    </>
  );
};

export default AnnouncementMainArea;

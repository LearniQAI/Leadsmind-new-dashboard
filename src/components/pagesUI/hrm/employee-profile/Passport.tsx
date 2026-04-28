"use client";
import React, { useState } from "react";
import UpdateBankAccountModal from "./UpdateBankAccountModal";
import UpdatePassportModal from "./UpdatePassportModal";
import Link from "next/link";

const Passport = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="col-span-12 md:col-span-6 xl:col-span-4 xxl:col-span-4">
        <div className="card__wrapper">
          <div className="employee__profile-single-box relative">
            <div className="card__title-wrap flex align-center justify-between mb-[15px]">
              <h5 className="card__heading-title">Passport Information</h5>
              <button
                onClick={() => setModalOpen(true)}
                className="edit-icon"
                data-bs-toggle="modal"
                data-bs-target="#passport__info"
              >
                <i className="fa-solid fa-pencil"></i>
              </button>
            </div>
            <div className="personal-info-wrapper bank__account">
              <ul className="personal-info">
                <li>
                  <div className="title">Passport Number:</div>
                  <div className="text">A1234567</div>
                </li>
                <li>
                  <div className="title">Nationality:</div>
                  <div className="text">American</div>
                </li>
                <li>
                  <div className="title">Issue Date:</div>
                  <div className="text">01 Jan 2010</div>
                </li>
                <li>
                  <div className="title">Expiry Date:</div>
                  <div className="text">01 Jan 2025</div>
                </li>
                <li>
                  <div className="title">Scan Copy:</div>
                  <div className="text">
                    <Link href="#">passport.pdf</Link>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <UpdatePassportModal open={modalOpen} setOpen={setModalOpen} />
      )}
    </>
  );
};

export default Passport;

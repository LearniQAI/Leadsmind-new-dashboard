"use client";
import React, { useState } from "react";
import UpdateBankAccountModal from "./UpdateBankAccountModal";

const BankAccount = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="col-span-12 md:col-span-6 xl:col-span-4">
        <div className="card__wrapper">
          <div className="employee__profile-single-box relative">
            <div className="card__title-wrap flex align-center justify-between mb-[15px]">
              <h5 className="card__heading-title">Bank Account</h5>
              <button
                type="button"
                className="edit-icon"
                onClick={() => setModalOpen(true)}
              >
                <i className="fa-solid fa-pencil"></i>
              </button>
            </div>
            <div className="personal-info-wrapper bank__account">
              <ul className="personal-info">
                <li>
                  <div className="title">Account Holder Name:</div>
                  <div className="text">Ethan Mitchell</div>
                </li>
                <li>
                  <div className="title">Account Number:</div>
                  <div className="text">123456789</div>
                </li>
                <li>
                  <div className="title">Bank Name:</div>
                  <div className="text">ABC Bank</div>
                </li>
                <li>
                  <div className="title">Branch Name:</div>
                  <div className="text">XYZ Branch</div>
                </li>
                <li>
                  <div className="title">SWIFT Code:</div>
                  <div className="text">ABCXYZ123</div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <UpdateBankAccountModal open={modalOpen} setOpen={setModalOpen} />
      )}
    </>
  );
};

export default BankAccount;

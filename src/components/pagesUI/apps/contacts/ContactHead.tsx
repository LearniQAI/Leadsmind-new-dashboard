"use client";
import React, { useState } from "react";
import AddContactModal from "./AddContactModal";

const ContactHead = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="grid grid-cols-12 gap-x-5 gap-y-5 maxXs:gap-x-0 mb-[25px]">
        <div className="col-span-12 sm:col-span-6 md:col-span-4">
          <div className="from__input-box">
            <div className="form__input-title">
              <label htmlFor="contactsName">Contacts Name</label>
            </div>
            <div className="form__input">
              <input
                type="text"
                className="form-control"
                id="contactsName"
                placeholder=""
              />
            </div>
          </div>
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-4 xxl:col-span-3">
          <div className="from__input-box">
            <div className="form__input-title">
              <label htmlFor="phoneNumber">Search by Number</label>
            </div>
            <div className="form__input">
              <input
                type="text"
                className="form-control"
                id="phoneNumber"
                placeholder=""
              />
            </div>
          </div>
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-4 xxl:col-span-3">
          <div className="from__input-box">
            <div className="form__input-title">
              <label htmlFor="contactsEmail">Search by Email</label>
            </div>
            <div className="form__input">
              <input
                type="email"
                className="form-control"
                id="contactsEmail"
                placeholder=""
              />
            </div>
          </div>
        </div>
        <div className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-2 xxl:mt-[25px]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setModalOpen(true)}
              type="button"
              className="btn btn-primary w-full"
            >
              Add Contacts
            </button>
          </div>
        </div>
      </div>

      {modalOpen && <AddContactModal open={modalOpen} setOpen={setModalOpen} />}
    </>
  );
};

export default ContactHead;

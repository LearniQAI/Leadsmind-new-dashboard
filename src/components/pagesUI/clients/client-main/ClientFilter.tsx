"use client";
import React, { useState } from "react";
import AddNewClientModal from "./AddNewClientModal";

const ClientFilter = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-12">
        <div className="col-span-12">
          <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-0">
            <div className="col-span-12 md:col-span-6 xl:col-span-6 xxl:col-span-3">
              <div className="card__wrapper">
                <div className="from__input-box">
                  <div className="form__input">
                    <input
                      type="text"
                      className="form-control"
                      id="clientName"
                      placeholder="Clients Name"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-6 xxl:col-span-3">
              <div className="card__wrapper">
                <div className="from__input-box">
                  <div className="form__input">
                    <input
                      type="text"
                      className="form-control"
                      id="clientCompanyName"
                      placeholder="Company Name"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-6 xxl:col-span-3">
              <div className="card__wrapper">
                <div className="from__input-box">
                  <div className="form__input">
                    <input
                      type="text"
                      className="form-control"
                      id="clientId"
                      placeholder="Clients ID"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-6 xxl:col-span-3">
              <div className="card__wrapper">
                <div className="flex items-center flex-wrap justify-between gap-[15px]">
                  <button className="btn btn-secondary ">Search</button>
                  <button
                    type="button"
                    className="btn btn-primary max-w-[65%] w-full"
                    data-bs-toggle="modal"
                    data-bs-target="#addNewClient"
                    onClick={() => setModalOpen(true)}
                  >
                    Add Clients
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {modalOpen && (
        <AddNewClientModal open={modalOpen} setOpen={setModalOpen} />
      )}
    </>
  );
};

export default ClientFilter;

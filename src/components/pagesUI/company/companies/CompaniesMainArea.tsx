"use client";
import React, { useState } from "react";
import Link from "next/link";
import CompaniesSummary from "./CompaniesSummary";
import CompanyListTable from "./CompanyListTable";
import AddCompanyModal from "./AddCompanyModal";
const CompaniesMainArea = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="app__slide-wrapper">
        <div className="breadcrumb__area">
          <div className="breadcrumb__wrapper mb-[25px]">
            <nav>
              <ol className="breadcrumb mb-0 flex">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Company
                </li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModalOpen(true)}
              >
                Add Company
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <CompaniesSummary />
          <CompanyListTable />
        </div>
      </div>

      {modalOpen && <AddCompanyModal open={modalOpen} setOpen={setModalOpen} />}
    </>
  );
};

export default CompaniesMainArea;

"use client";
import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import lightLogo from "../../../../../public/assets/images/logo/logo.svg";
import whiteLogo from "../../../../../public/assets/images/logo/logo-white.svg";
import Image from "next/image";
import InvoiceEditTable from "./InvoiceEditTable";
import InvoiceEditCardInfo from "./InvoiceEditCardInfo";
import Link from "next/link";
import InvoiceEditBuildingShippingAddress from "./InvoiceEditBuildingShippingAddress";

const InvoiceEditMainArea = () => {
  const invoiceNumber = "$MZ-00114";
  const invoiceDate = "2024-01-08";
  const dueDate = "2024-01-08";

  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Invoice Edit" subTitle="Home" />
        <div className="card__wrapper">
          <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0">
            <div className="col-span-12 sm:col-span-6">
              <div className="invoice__logo mb-5">
                <Image
                  className="light-logo"
                  src={lightLogo}
                  priority
                  alt="payslip logo"
                />
                <Image className="dark-logo" src={whiteLogo} priority alt="payslip logo" />
              </div>
              <p className="mb-[5px]">100 Terminal, Fort Lauderdale,</p>
              <p className="mb-[5px]">Miami 33315, United States</p>
              <p className="mb-[5px]">name@manez.com</p>
              <p className="mb-[5px]">+1(800) 642 7676</p>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <div className="grid grid-cols-12 items-center mb-2.5">
                <div className="col-span-12 lg:col-span-3">
                  <div className="form__input-title">
                    <label htmlFor="invoiceNumber">Invoice No.</label>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-9">
                  <div className="form__input">
                    <input
                      id="invoiceNumber"
                      type="text"
                      className="form-control"
                      defaultValue={invoiceNumber}
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center mb-2.5">
                <div className="col-span-12 lg:col-span-3">
                  <div className="form__input-title">
                    <label htmlFor="basicInput">Date</label>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-9">
                  <div className="form__input">
                    <input
                      className="form-control flatpickr-input active"
                      id="basicInput"
                      type="text"
                      placeholder="Select Date"
                      defaultValue={invoiceDate}
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-12 items-center mb-2.5">
                <div className="col-span-12 lg:col-span-3">
                  <div className="form__input-title">
                    <label htmlFor="basicInput2">Due Date</label>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-9">
                  <div className="form__input">
                    <input
                      className="form-control flatpickr-input active"
                      id="basicInput2"
                      type="text"
                      placeholder="Select Date"
                      defaultValue={dueDate}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="invoice-line"></div>
          <div className="grid grid-cols-12 gap-x-0 md:gap-x-[60px] gap-y-5">
            <InvoiceEditBuildingShippingAddress />
          </div>
          <div className="invoice-line"></div>
          <div className="grid grid-cols-12">
            <InvoiceEditTable />
          </div>
          <div className="invoice-line"></div>
          <div className="grid grid-cols-12">
            <div className="col-span-12 lg:col-span-10 xl:col-span-8">
              <InvoiceEditCardInfo />
            </div>
          </div>
          <div className="invoice-line"></div>
          <div className="flex flex-wrap gap-2.5 lg:justify-end">
            <Link
              className="btn btn-info"
              href="/invoice/app-invoice-preview"
            >
              <i className="fa-sharp fa-regular fa-eye"></i> Preview
            </Link>
            <button type="submit" className="btn btn-success">
              <i className="fa-sharp fa-light fa-floppy-disk"></i> Save
            </button>
            <Link
              className="btn btn-warning"
              href="assets/pdf/invoice-print-version.pdf"
              download="invoice-print-version.pdf"
            >
              <i className="fa-sharp fa-thin fa-file-arrow-down"></i>{" "}
              Download
            </Link>
            <button type="submit" className="btn btn-primary">
              <i className="fa-light fa-paper-plane"></i> Send
            </button>
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default InvoiceEditMainArea;

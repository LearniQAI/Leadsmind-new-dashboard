import Image from "next/image";
import React from "react";
import logoLight from "../../../../../public/assets/images/logo/logo.svg";
import darkLogo from "../../../../../public/assets/images/logo/logo-white.svg";
import Link from "next/link";
import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import InvoicePreviewTable from "./InvoicePreviewTable";

const AppInvoicePreviewMainArea = () => {
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Invoice Preview" subTitle="Home" />
        <div className="grid grid-cols-12 justify-center">
          <div className="col-span-12">
            <div className="card__wrapper">
            <div className="flex justify-between xl:flex-row sm:flex-row flex-col">
                <div className="mb-[5px]">
                  <div className="invoice__logo mb-5">
                    <Image className="light-logo" src={logoLight} priority alt="payslip logo" />
                    <Image className="dark-logo" src={darkLogo} priority alt="payslip logo" />
                  </div>
                  <p className="mb-[5px]">100 Terminal, Fort Lauderdale,</p>
                  <p className="mb-[5px]">Miami 33315, United States</p>
                  <p className="mb-[5px]">name@manez.com</p>
                  <p className="mb-[5px]">+1(800) 642 7676</p>
                </div>
                <div>
                  <div className="mb-2.5">
                    <h5 className="card__heading-title">Invoice No. #MZ-00114</h5>
                  </div>
                  <div className="mb-2.5">
                    <span>Date: </span>
                    <span className="font-semibold">2024-01-08</span>
                  </div>
                  <div className="mb-2.4">
                    <span>Date Due: </span>
                    <span className="font-semibold">2024-01-08</span>
                  </div>
                </div>
             </div>
              <div className="invoice-line"></div>
              <div className="grid grid-cols-12 gap-y-5 gap-0 md:gap-x-[60px]">

                <div className="col-span-12 sm:col-span-6">
                  <div className="mb-5">
                    <h5 className="card__heading-title">Billing Address</h5>
                  </div>
                  <div className="invoice__address">
                    <h6 className="mb-[15px] font-semibold">Ethan Mitchell</h6>
                    <p>Email: <span> name@manez.com</span> </p>
                    <p>Address: <span> 100 Terminal, Fort Lauderdale, Miami 33315, United
                      States</span></p>
                    <p>Phone: <span> +1(800) 642 7676</span></p>
                    <p>Fax: <span> +1(800) 642 7676</span> </p>
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <div className="mb-5">
                    <h5 className="card__heading-title">Shipping Address</h5>
                  </div>
                  <div className="invoice__address">
                    <h6 className="mb-[15px] font-semibold">Ethan Mitchell</h6>
                    <p>Email: <span> name@manez.com</span> </p>
                    <p>Address: <span> 100 Terminal, Fort Lauderdale, Miami 33315, United
                      States</span></p>
                    <p>Phone: <span> +1(800) 642 7676</span></p>
                    <p>Fax: <span> +1(800) 642 7676</span> </p>
                  </div>
                </div>
              </div>
              <div className="invoice-line"></div>
              <InvoicePreviewTable />
              <div className="invoice-line"></div>
              <div className="invoice__payment-details">
                <h5 className="card__heading-title mb-[15px]">Payment Details:</h5>
                <p>Payment Method: <span>Amex</span></p>
                <p>Card Holder: <span>Ethan Mitchell</span></p>
                <p>Card Number: <span>3456 xxxx xxxx 1234</span></p>
                <p>Total Amount: <span>$3461.00</span></p>
              </div>
              <div className="invoice-line"></div>
              <div className="flex flex-wrap gap-2.5 lg:justify-end"> 
                <button type="submit" className="btn btn-success"><i className="fa-sharp fa-light fa-floppy-disk"></i> Save</button>
                <Link className="btn btn-warning" href="assets/pdf/invoice-print-version.pdf" download="invoice-print-version.pdf"><i className="fa-sharp fa-thin fa-file-arrow-down"></i> Download</Link>
                <button type="submit" className="btn btn-primary"><i className="fa-light fa-paper-plane"></i> Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default AppInvoicePreviewMainArea;

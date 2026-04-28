import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import InvoiceListSummary from "./InvoiceListSummary";
import InvoiceListTable from "./InvoiceListTable";

const AppInvoiceListMainArea = () => {
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Invoice List" subTitle="Home" />
        <div className="grid grid-cols-12 gap-x-6  maxXs:gap-x-4">
          <InvoiceListSummary />
          <InvoiceListTable />
        </div>
      </div>
    </>
  );
};

export default AppInvoiceListMainArea;

import Wrapper from "@/components/layouts/DefaultWrapper";
import InvoiceEditMainArea from "@/components/pagesUI/invoice/app-invoice-edit/InvoiceEditMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const InvoiceEditMain = () => {
  return (
    <>
      <MetaData pageTitle="invoice edit">
        <Wrapper>
          <InvoiceEditMainArea/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default InvoiceEditMain;

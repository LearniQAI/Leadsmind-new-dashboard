import Wrapper from "@/components/layouts/DefaultWrapper";
import AppInvoicePreviewMainArea from "@/components/pagesUI/invoice/app-invoice-preview/AppInvoicePreviewMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const InvoicePreviewMain = () => {
  return (
    <>
      <MetaData pageTitle="invoice preview">
        <Wrapper>
          <AppInvoicePreviewMainArea/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default InvoicePreviewMain;

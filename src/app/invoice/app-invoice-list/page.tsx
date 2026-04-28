import Wrapper from "@/components/layouts/DefaultWrapper";
import AppInvoiceListMainArea from "@/components/pagesUI/invoice/app-invoice-list/AppInvoiceListMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="invoice list">
        <Wrapper>
          <AppInvoiceListMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

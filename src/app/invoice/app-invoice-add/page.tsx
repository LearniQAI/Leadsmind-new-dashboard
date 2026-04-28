import Wrapper from "@/components/layouts/DefaultWrapper";
import AppInvoiceAddMainArea from "@/components/pagesUI/invoice/app-invoice-add/AppInvoiceAddMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const AppInvoiceAddMain = () => {
  return (
    <>
      <MetaData pageTitle="invoice add">
        <Wrapper>
          <AppInvoiceAddMainArea/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default AppInvoiceAddMain;

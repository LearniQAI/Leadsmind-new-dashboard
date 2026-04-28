import Wrapper from "@/components/layouts/DefaultWrapper";
import PayrollMainArea from "@/components/pagesUI/payroll/payroll/PayrollMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Payroll">
        <Wrapper>
          <PayrollMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

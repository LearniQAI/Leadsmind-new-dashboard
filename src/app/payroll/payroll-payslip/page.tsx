import Wrapper from "@/components/layouts/DefaultWrapper";
import PayrollSlipMainArea from "@/components/pagesUI/payroll/payroll-payslip/PayrollSlipMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Payroll Payslip">
        <Wrapper>
          <PayrollSlipMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

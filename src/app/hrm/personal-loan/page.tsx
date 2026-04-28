import Wrapper from "@/components/layouts/DefaultWrapper";
import PersonalLoanMainArea from "@/components/pagesUI/hrm/personal-loan/PersonalLoanMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Personal Loan">
        <Wrapper>
          <PersonalLoanMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

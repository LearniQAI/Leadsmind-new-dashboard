import Wrapper from "@/components/layouts/DefaultWrapper";
import OfficeLoanMainArea from "@/components/pagesUI/hrm/office-loan/OfficeLoanMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Office Loan">
        <Wrapper>
          <OfficeLoanMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

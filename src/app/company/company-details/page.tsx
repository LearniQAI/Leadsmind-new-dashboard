import Wrapper from "@/components/layouts/DefaultWrapper";
import CompanyDetailsMainArea from "@/components/pagesUI/company/company-details/CompanyDetailsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const CompanyDetailsMain = () => {
  const id = 1;
  return (
    <>
      <MetaData pageTitle="Company Details">
        <Wrapper>
          <CompanyDetailsMainArea id={id} />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default CompanyDetailsMain;

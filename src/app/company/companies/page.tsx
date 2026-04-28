import Wrapper from "@/components/layouts/DefaultWrapper";
import CompaniesMainArea from "@/components/pagesUI/company/companies/CompaniesMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const CompanyMain= () => {
  return (
    <>
      <MetaData pageTitle="Company">
        <Wrapper>
          <CompaniesMainArea/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default CompanyMain;

import Wrapper from "@/components/layouts/DefaultWrapper";
import CompanyDetailsMainArea from "@/components/pagesUI/company/company-details/CompanyDetailsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const CompanyDetailsMain = ({ params }: { params: { id: number } }) => {
  const id = params.id;
  return (
    <>
      <MetaData pageTitle="Company Details Dynamic">
        <Wrapper>
          <CompanyDetailsMainArea id={id}/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default CompanyDetailsMain;

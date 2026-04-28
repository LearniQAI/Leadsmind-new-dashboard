import Wrapper from "@/components/layouts/DefaultWrapper";
import EmployeeProfileMainArea from "@/components/pagesUI/hrm/employee-profile/EmployeeProfileMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Employee Profile">
        <Wrapper>
          <EmployeeProfileMainArea id={1} />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

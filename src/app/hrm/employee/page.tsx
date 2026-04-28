import Wrapper from "@/components/layouts/DefaultWrapper";
import EmployeeMainArea from "@/components/pagesUI/hrm/employee/EmployeeMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Employee">
        <Wrapper>
          <EmployeeMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

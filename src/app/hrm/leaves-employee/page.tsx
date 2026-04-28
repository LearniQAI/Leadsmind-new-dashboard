import Wrapper from "@/components/layouts/DefaultWrapper";
import LeavesEmployeeMainArea from "@/components/pagesUI/hrm/leaves-employee/LeavesEmployeeMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Leaves Employee">
        <Wrapper>
          <LeavesEmployeeMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

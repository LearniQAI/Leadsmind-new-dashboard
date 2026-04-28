import Wrapper from "@/components/layouts/DefaultWrapper";
import EmployeeProfileMainArea from "@/components/pagesUI/hrm/employee-profile/EmployeeProfileMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = ({ params }: { params: { id: number } }) => {
  const id = params.id;
  return (
    <>
      <MetaData pageTitle="Employee Details Dynamic">
        <Wrapper>
          <EmployeeProfileMainArea id={id} />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

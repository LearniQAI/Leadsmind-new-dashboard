import Wrapper from "@/components/layouts/DefaultWrapper";
import EmployeeAttendanceMainArea from "@/components/pagesUI/hrm/employee-attendance/EmployeeAttendanceMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Employee Attendance">
        <Wrapper>
          <EmployeeAttendanceMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

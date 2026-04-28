import Wrapper from "@/components/layouts/DefaultWrapper";
import AttendanceMainArea from "@/components/pagesUI/hrm/attendance/AttendanceMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Attendance">
        <Wrapper>
          <AttendanceMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

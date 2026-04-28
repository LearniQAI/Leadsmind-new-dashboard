import Wrapper from "@/components/layouts/DefaultWrapper";
import BiometricAttendanceMainArea from "@/components/pagesUI/hrm/biometric-attendance/BiometricAttendanceMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Biometric Attendance">
        <Wrapper>
          <BiometricAttendanceMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

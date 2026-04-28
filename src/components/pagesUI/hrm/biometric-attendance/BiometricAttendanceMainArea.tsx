import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import BiometricAttendanceTable from "./BiometricAttendanceTable";

const BiometricAttendanceMainArea = () => {
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Biometric Attendance" subTitle="Home" />
        <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-0">
          <BiometricAttendanceTable />
        </div>
      </div>
    </>
  );
};

export default BiometricAttendanceMainArea;

import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import AttendanceSummary from "./AttendanceSummary";
import AdminAttendanceTable from "./AdminAttendanceTable";

const AttendanceMainArea = () => {
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Attendance" subTitle="Home" />
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <AttendanceSummary />
          <AdminAttendanceTable />
        </div>
      </div>
    </>
  );
};

export default AttendanceMainArea;

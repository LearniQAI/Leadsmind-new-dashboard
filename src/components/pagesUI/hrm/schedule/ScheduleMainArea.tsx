import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import ScheduleTable from "./ScheduleTable";

const ScheduleMainArea = () => {
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Schedule" subTitle="Home" />
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <ScheduleTable />
        </div>
      </div>
    </>
  );
};

export default ScheduleMainArea;

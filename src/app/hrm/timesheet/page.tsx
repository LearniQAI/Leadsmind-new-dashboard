import Wrapper from "@/components/layouts/DefaultWrapper";
import TimesheetMainArea from "@/components/pagesUI/hrm/timesheet/TimesheetMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Timesheet">
        <Wrapper>
          <TimesheetMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

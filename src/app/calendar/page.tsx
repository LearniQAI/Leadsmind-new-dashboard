import Wrapper from "@/components/layouts/DefaultWrapper";
import CalendarMainArea from "@/components/pagesUI/apps/calendar/CalendarMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const CalendarMain = () => {
  return (
    <>
      <MetaData pageTitle="Calendar">
        <Wrapper>
          <CalendarMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default CalendarMain;

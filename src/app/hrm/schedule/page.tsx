import Wrapper from "@/components/layouts/DefaultWrapper";
import ScheduleMainArea from "@/components/pagesUI/hrm/schedule/ScheduleMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Schedule">
        <Wrapper>
          <ScheduleMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

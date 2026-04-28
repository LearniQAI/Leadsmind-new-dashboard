import Wrapper from "@/components/layouts/DefaultWrapper";
import OvertimeMainArea from "@/components/pagesUI/hrm/overtime/OvertimeMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Overtime">
        <Wrapper>
          <OvertimeMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

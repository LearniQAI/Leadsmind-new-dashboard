import Wrapper from "@/components/layouts/DefaultWrapper";
import WarningMainArea from "@/components/pagesUI/hrm/warning/WarningMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Warning">
        <Wrapper>
          <WarningMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

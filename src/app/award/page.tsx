import Wrapper from "@/components/layouts/DefaultWrapper";
import AwardMainArea from "@/components/pagesUI/award/AwardMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Award">
        <Wrapper>
          <AwardMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

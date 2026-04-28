import Wrapper from "@/components/layouts/DefaultWrapper";
import MettingMainArea from "@/components/pagesUI/meeting/MettingMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Meeting">
        <Wrapper>
          <MettingMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

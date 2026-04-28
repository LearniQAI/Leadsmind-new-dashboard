import Wrapper from "@/components/layouts/DefaultWrapper";
import TerminationMainArea from "@/components/pagesUI/termination/TerminationMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Termination">
        <Wrapper>
          <TerminationMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

import Wrapper from "@/components/layouts/DefaultWrapper";
import ReisgnationMainArea from "@/components/pagesUI/resignation/ReisgnationMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Resignation">
        <Wrapper>
          <ReisgnationMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

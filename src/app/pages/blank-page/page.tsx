import Wrapper from "@/components/layouts/DefaultWrapper";
import BlankPageMainArea from "@/components/pagesUI/pages/blank-page/BlankPageMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const BlankPageMain = () => {
  return (
    <>
      <MetaData pageTitle="Blank Page">
        <Wrapper>
          <BlankPageMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default BlankPageMain;

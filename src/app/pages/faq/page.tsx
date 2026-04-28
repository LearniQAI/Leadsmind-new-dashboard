import Wrapper from "@/components/layouts/DefaultWrapper";
import FaqMainArea from "@/components/pagesUI/pages/faq/FaqMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const FaqMain = () => {
  return (
    <>
      <MetaData pageTitle="Faq">
        <Wrapper>
          <FaqMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default FaqMain;

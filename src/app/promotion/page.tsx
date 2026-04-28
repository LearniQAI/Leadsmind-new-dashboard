import Wrapper from "@/components/layouts/DefaultWrapper";
import PromotionsMainArea from "@/components/pagesUI/promotion/PromotionsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Promotion">
        <Wrapper>
          <PromotionsMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

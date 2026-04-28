import Wrapper from "@/components/layouts/DefaultWrapper";
import DealsMainArea from "@/components/pagesUI/crm/deals/DealsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const DealsMain = () => {
  return (
    <>
      <MetaData pageTitle="Deals">
        <Wrapper>
          <DealsMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default DealsMain;

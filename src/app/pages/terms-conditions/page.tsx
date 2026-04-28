

import Wrapper from "@/components/layouts/DefaultWrapper";
import TermsConditionsMainArea from "@/components/pagesUI/pages/terms-conditions/TermsConditionsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const TermsConditionsMain = () => {
  return (
    <>
      <MetaData pageTitle="Terms and Conditions">
        <Wrapper>
          <TermsConditionsMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default TermsConditionsMain;

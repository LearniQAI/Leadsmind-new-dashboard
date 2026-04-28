import Wrapper from "@/components/layouts/DefaultWrapper";
import PrivacyPolicyMainArea from "@/components/pagesUI/pages/privacy-policy/PrivacyPolicyMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const PrivacyPolicyMain = () => {
  return (
    <>
      <MetaData pageTitle="Privacy and Policy">
        <Wrapper>
          <PrivacyPolicyMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default PrivacyPolicyMain;

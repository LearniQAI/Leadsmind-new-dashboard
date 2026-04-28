import Wrapper from "@/components/layouts/DefaultWrapper";
import CrmSetupMainArea from "@/components/pagesUI/crm/crm-setup/CrmSetupMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const CrmSetupMain = () => {
  return (
    <>
      <MetaData pageTitle="CRM Setup">
        <Wrapper>
          <CrmSetupMainArea/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default CrmSetupMain;

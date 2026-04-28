import Wrapper from "@/components/layouts/DefaultWrapper";
import LeadsMainArea from "@/components/pagesUI/crm/leads/LeadsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const LeadsMain = () => {
  return (
    <>
      <MetaData pageTitle="Leads">
        <Wrapper>
          <LeadsMainArea/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default LeadsMain;

import Wrapper from "@/components/layouts/DefaultWrapper";
import CrmDashboardMainArea from "@/components/pagesUI/dashboard/crm-dashboard/CrmDashboardMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const CrmDashboardMain = () => {
  return (
    <>
      <MetaData pageTitle="CRM Dashboard">
        <Wrapper>
          <CrmDashboardMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default CrmDashboardMain;

import Wrapper from "@/components/layouts/DefaultWrapper";
import HomeMainArea from "@/components/pagesUI/apps/home/HomeMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const HrmDashboardMain = () => {
  return (
    <>
      <MetaData pageTitle="HRM Dashboard">
        <Wrapper>
          <HomeMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default HrmDashboardMain;

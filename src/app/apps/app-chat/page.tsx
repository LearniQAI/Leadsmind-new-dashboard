import Wrapper from "@/components/layouts/DefaultWrapper";
import AppChartMainArea from "@/components/pagesUI/apps/app-chat/AppChartMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const AppChatMain = () => {
  return (
    <>
      <MetaData pageTitle="App Chart">
        <Wrapper>
         <AppChartMainArea/>
        </Wrapper>
      </MetaData>
    </>
  );
};

export default AppChatMain;

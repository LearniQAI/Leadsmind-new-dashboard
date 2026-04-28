import Wrapper from "@/components/layouts/DefaultWrapper";
import ActivitiesMainArea from "@/components/pagesUI/activities/ActivitiesMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Activities">
        <Wrapper>
          <ActivitiesMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

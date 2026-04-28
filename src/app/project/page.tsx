import Wrapper from "@/components/layouts/DefaultWrapper";
import ProjectMainArea from "@/components/pagesUI/project/project/ProjectMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Project">
        <Wrapper>
          <ProjectMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

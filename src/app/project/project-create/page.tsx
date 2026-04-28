import Wrapper from "@/components/layouts/DefaultWrapper";
import ProjectCreateMainArea from "@/components/pagesUI/project/project-create/ProjectCreateMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Project Create">
        <Wrapper>
          <ProjectCreateMainArea />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

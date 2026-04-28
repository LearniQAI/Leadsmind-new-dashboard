import Wrapper from "@/components/layouts/DefaultWrapper";
import ProjectDetailsMainArea from "@/components/pagesUI/project/project-details/ProjectDetailsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = () => {
  return (
    <>
      <MetaData pageTitle="Project Details">
        <Wrapper>
          <ProjectDetailsMainArea id={1} />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

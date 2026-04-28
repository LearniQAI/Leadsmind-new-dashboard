import Wrapper from "@/components/layouts/DefaultWrapper";
import ProjectDetailsMainArea from "@/components/pagesUI/project/project-details/ProjectDetailsMainArea";
import MetaData from "@/hooks/useMetaData";
import React from "react";

const page = ({ params }: { params: { id: number } }) => {
  const id = params.id;
  return (
    <>
      <MetaData pageTitle="Project Details Dynamic">
        <Wrapper>
          <ProjectDetailsMainArea id={id} />
        </Wrapper>
      </MetaData>
    </>
  );
};

export default page;

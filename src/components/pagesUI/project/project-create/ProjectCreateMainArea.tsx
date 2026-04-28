import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import ProjectCreateForm from "./ProjectCreateForm";

const ProjectCreateMainArea = () => {
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Project Create" subTitle="Projects" />
        <ProjectCreateForm />
      </div>
    </>
  );
};

export default ProjectCreateMainArea;

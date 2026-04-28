import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import ProjectSingleCard from "@/components/common/ProjectSingleCard";
import projectData from "@/data/project-data";
import React from "react";

const ProjectMainArea = () => {
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Projects" subTitle="Projects" />

        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          {projectData.slice(0, 6).map((item) => (
            <ProjectSingleCard item={item} key={item.id} />
          ))}
        </div>
      </div>
    </>
  );
};

export default ProjectMainArea;

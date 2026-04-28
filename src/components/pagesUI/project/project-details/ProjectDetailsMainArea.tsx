import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import { idType } from "@/interface/common.interface";
import React from "react";
import LeftContent from "./LeftContent";
import RightContent from "./RightContent";

const ProjectDetailsMainArea = ({ id }: idType) => {
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Project Details" subTitle="Projects" />
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <LeftContent />
          <RightContent />
        </div>
      </div>
    </>
  );
};

export default ProjectDetailsMainArea;

import React from "react";
import AssignedTeam from "./AssignedTeam";
import WorkProgress from "./WorkProgress";
import ProjectMilestones from "./ProjectMilestones";

const RightContent = () => {
  return (
    <>
      <div className="col-span-12 md:col-span-4 lg:col-span-4">
        <div className="position-sticky">
          <AssignedTeam />
          <WorkProgress />
          <ProjectMilestones />
        </div>
      </div>
    </>
  );
};

export default RightContent;

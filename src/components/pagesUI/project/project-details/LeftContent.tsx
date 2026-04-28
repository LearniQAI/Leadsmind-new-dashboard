import Image from "next/image";
import React from "react";
import projectImg from "../../../../../public/assets/images/user/client6.png";
import ProjectSummary from "./ProjectSummary";
import Documents from "./Documents";
import TeamDiscussions from "./TeamDiscussions";
const LeftContent = () => {
  return (
    <>
      <div className="col-span-12 md:col-span-8 lg:col-span-8">
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="card__wrapper">
              <div className="project__details-top flex flex-wrap items-center gap-[10px]">
                <Image
                  priority
                  src={projectImg}
                  alt="image"
                  className="w-[60px] rounded-[50%]"
                />
                <div className="project__details-title">
                  <h4 className="mb-[8px]">
                    Laravel Education App Development
                  </h4>
                  <div className="project__details-meta flex flex-wrap items-center gap-[5px]">
                    <span className="block">Bdevs Limited</span>
                    <span className="block">
                      <span className="font-semibold">Create Date:</span> May
                      16, 2024
                    </span>
                    <span className="block">
                      <span className="font-semibold">Deadline:</span> Aug 15,
                      2025
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ProjectSummary />
        <Documents />
        <TeamDiscussions />
      </div>
    </>
  );
};

export default LeftContent;

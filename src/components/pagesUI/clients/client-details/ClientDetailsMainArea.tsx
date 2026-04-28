import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import { idType } from "@/interface/common.interface";
import React from "react";
import ClientProfileCard from "./ClientProfileCard";
import projectData from "@/data/project-data";
import ProjectSingleCard from "@/components/common/ProjectSingleCard";
import clientData from "@/data/client-data";

const ClientDetailsMainArea = ({ id }: idType) => {
  const data = clientData?.find((item) => item?.id == id);
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Client Profile" subTitle="Client" />

        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <div className="col-span-12 md:col-span-12 xl:col-span-12 xxl:col-span-3">
            <ClientProfileCard data={data} />
          </div>
          <div className="col-span-12 md:col-span-12 xl:col-span-12 xxl:col-span-9">
            <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
              {projectData.slice(0, 6).map((item) => (
                <ProjectSingleCard item={item} key={item.id} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientDetailsMainArea;

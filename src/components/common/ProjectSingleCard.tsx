
import { IProject } from "@/interface";
import { Box, LinearProgress } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface propsType {
  item: IProject;
}

const ProjectSingleCard = ({ item }: propsType) => {
  return (
    <>
      <div className="col-span-12 md:col-span-6 lg:col-span-4">
        <div className="card__wrapper">
          <div className="project__wrapper">
            <div className="project__top-content">
              <h5 className="mb-2">
                <Link href={`/project/project-details/${item.id}`}>
                  {item.title}
                </Link>
              </h5>
              <div className={`flex items-center gap-[5px] ${item.statusClass}`}>
                <i className="fa-solid fa-circle blink"></i>
                <span className="block">{item.status}</span>
              </div>
              <div className="text-[14px] block mb-[15px]">
                <span>{item.openTask}</span>{" "}
                <span className="text-muted">open tasks,</span>
                <span>{item.completeTask}</span>{" "}
                <span className="text-muted"> tasks have been completed</span>
              </div>
            </div>
            <p className="project__description mb-[15px]">{item.description}</p>
            <div className="flex justify-between">
              <div className="project__deadline mb-[20px]">
                <span className="project__meta-title">Start:</span>
                <div className="text-muted">{item.startDate}</div>
              </div>
              <div className="project__deadline mb-[20px]">
                <span className="project__meta-title">Deadline:</span>
                <div className="text-muted">{item.endDate}</div>
              </div>
            </div>
          </div>
          <div className="flex justify-between mb-[20px]">
            <div className="project__team">
              <span className="project__meta-title mb-2">
                Project Coordinator:
              </span>
              <div>
                <Link href={`/project/project-details/${item.id}`}>
                  <Image
                    className="w-[36px] rounded-[50%]"
                    src={item.coordinatorAvatar}
                    width={36}
                    height={36}
                    alt="Coordinator Avatar"
                  />
                </Link>
              </div>
            </div>
            <div className="project__team">
              <span className="project__meta-title mb-2">Team Leader:</span>
              <div>
                <Link href={`/project/project-details/${item.id}`}>
                  <Image
                    className="w-[36px] rounded-[50%]"
                    src={item.teamLeaderAvatar}
                    width={36}
                    height={36}
                    alt="Team Leader Avatar"
                  />
                </Link>
              </div>
            </div>
          </div>
          <div className="project__team mb-[20px]">
            <span className="project__meta-title mb-2">Team:</span>
            <div className="avatar">
              <ul className="flex">
                {item.teamsAvatar.map((team) => (
                  <li key={team.id}>
                    <Image
                      className="w-[36px] rounded-[50%]"
                      src={team.avatar}
                      width={36}
                      height={36}
                      alt="Team Avatar"
                    />
                  </li>
                ))}
                <li>
                  <span className="avatar-bg">{item.member}+</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="project__progress">
            <div className="flex justify-between mb-2">
              <span className="project__meta-title">Project Progress</span>
              <span className="project__meta-title">
                {item?.projectProgress}%
              </span>
            </div>
            <Box sx={{ width: "100%", mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={item?.projectProgress}
                className="progress-bar bg-primary"
                sx={{ height: "5px" }}
              />
            </Box>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectSingleCard;

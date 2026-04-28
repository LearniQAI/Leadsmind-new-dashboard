import { teamStyleOneData } from "@/data/team-data";
import Image from "next/image";
import React from "react";

const AssignedTeam = () => {
  return (
    <>
      <div className="card__wrapper">
        <div className="card__title-wrap mb-[25px]">
          <h5 className="card__heading-title">Assigned Team</h5>
        </div>
        <div className="card__body">
          <ul className="user__list">
            {teamStyleOneData?.slice(0, 5)?.map((item, index) => (
              <li key={index}>
                <div className="flex items-center gap-[10px] mb-2.5">
                  <Image
                    className="w-[50px] rounded-[50%]"
                    priority
                    src={item?.image}
                    alt="image"
                  />
                  <div className="profile-info">
                    <h6>Melanie S.</h6>
                    <p className="mb-0">Project Manager</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default AssignedTeam;

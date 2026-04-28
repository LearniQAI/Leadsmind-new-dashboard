import EmployeeSingleCard from "@/components/common/EmployeeSingleCard";
import employeeData from "@/data/hrm/employee-data";
import React from "react";

const TeamStyleVeriationOne = () => {
  return (
    <div className="card__wrapper">
      <div className="card__title-wrap mb-[20px]">
        <h5 className="card__heading-title">Team Style 1</h5>
      </div>
      <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
        {employeeData.slice(0, 4)?.map((employee, index) => (
          <EmployeeSingleCard key={index} employee={employee} />
        ))}
      </div>
    </div>
  );
};

export default TeamStyleVeriationOne;

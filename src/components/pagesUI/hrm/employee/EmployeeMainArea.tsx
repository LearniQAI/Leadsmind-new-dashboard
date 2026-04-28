import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import EmployeeFilter from "./EmployeeFilter";

import EmployeeSingleCard from "@/components/common/EmployeeSingleCard";
import employeeData from "@/data/hrm/employee-data";

const EmployeeMainArea = () => {
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Employee" subTitle="Home" />
        <EmployeeFilter />
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          {employeeData?.map((employee, index) => (
            <EmployeeSingleCard key={index} employee={employee} />
          ))}
        </div>

        <div className="flex justify-center mt-[20px] mb-[20px]">
          <button type="button" className="btn btn-primary">
            Load More
          </button>
        </div>
      </div>
    </>
  );
};

export default EmployeeMainArea;

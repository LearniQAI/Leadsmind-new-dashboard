import EmployeeSingleCard from "@/components/common/EmployeeSingleCard";
import employeeData from "@/data/hrm/employee-data";
import React from "react";

const SearchTabTwoItems = () => {
  return (
    <>
      <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
        {employeeData.map((item, index) => (
          <EmployeeSingleCard key={index} employee={item} />
        ))}
      </div>
      <div className="flex justify-center mb-[20px]">
        <div className="mt-[20px]">
          <button type="button" className="btn btn-primary">
            Load More
          </button>
        </div>
      </div>
    </>
  );
};

export default SearchTabTwoItems;

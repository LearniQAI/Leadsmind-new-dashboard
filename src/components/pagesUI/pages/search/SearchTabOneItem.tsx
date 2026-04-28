import React from "react";

import projectData from "@/data/project-data";
import EmployeeSingleCard from "@/components/common/EmployeeSingleCard";
import ProjectSingleCard from "@/components/common/ProjectSingleCard";
import employeeData from "@/data/hrm/employee-data";
const SearchTabOneItem = () => {
  return (
    <>
      <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
        {/* employee items start*/}
        {employeeData.slice(0, 4).map((employee, index) => (
          <EmployeeSingleCard key={index} employee={employee} />
        ))}
        {/* employee items end*/}
        {/* project items start*/}
        {projectData.slice(0, 3).map((item) => (
          <ProjectSingleCard item={item} key={item.id} />
        ))}
        {/* project items end*/}
        {/* youtube video*/}
        <div className="col-span-12 md:col-span-6">
          <div className="card__wrapper">
            <div className="ratio ratio-21x9">
              <iframe src="https://www.youtube.com/embed/IyR_uYsRdPs?si=cRVsyYlGOP9dL066"></iframe>
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6">
          <div className="card__wrapper">
            <div className="ratio ratio-21x9">
              <iframe src="https://www.youtube.com/embed/vn9B2hH4G_E?si=O9HLXWP6BBTJADIl"></iframe>
            </div>
          </div>
        </div>
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

export default SearchTabOneItem;

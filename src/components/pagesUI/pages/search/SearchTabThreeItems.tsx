import ProjectSingleCard from "@/components/common/ProjectSingleCard";
import projectData from "@/data/project-data";
import React from "react";
const SearchTabThreeItems = () => {
  return (
    <>
      <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
        {projectData.map((item) => (
          <ProjectSingleCard item={item} key={item.id} />
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

export default SearchTabThreeItems;

import ClientSingleCard from "@/components/common/ClientSingleCard";
import clientData from "@/data/client-data";
import React from "react";

const SearchTabFourItems = () => {
  return (
    <>
      <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
        {clientData.map((item, index) => (
          <ClientSingleCard item={item} key={index} />
        ))}
      </div>

      <div className="flex justify-center">
          <button type="button" className="btn btn-primary">
            Load More
          </button>
      </div>
    </>
  );
};

export default SearchTabFourItems;

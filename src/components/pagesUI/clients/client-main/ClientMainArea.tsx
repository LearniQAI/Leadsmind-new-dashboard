import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import ClientSingleCard from "@/components/common/ClientSingleCard";
import clientData from "@/data/client-data";
import React from "react";
import ClientFilter from "./ClientFilter";

const ClientMainArea = () => {
  return (
    <>
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Clients Profile" subTitle="HRM" />
        <ClientFilter />
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          {clientData?.map((item, index) => (
            <ClientSingleCard item={item} key={index} />
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

export default ClientMainArea;

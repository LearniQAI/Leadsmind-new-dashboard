import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import TicketsSummary from "./TicketsSummary";
import TicketsTable from "./TicketsTable";

const TicketsMainArea = () => {
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <Breadcrumb breadTitle="Tickets List" subTitle="Home" />
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <TicketsSummary />
          <TicketsTable />
        </div>
      </div>
      {/* -- App side area end -- */}
    </>
  );
};

export default TicketsMainArea;

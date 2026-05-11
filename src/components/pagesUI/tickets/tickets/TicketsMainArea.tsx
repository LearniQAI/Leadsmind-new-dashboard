import Breadcrumb from "@/common/Breadcrumb/breadcrumb";
import React from "react";
import TicketsSummary from "./TicketsSummary";
import TicketsTable from "./TicketsTable";
import SubmitTicketModal from "./SubmitTicketModal";

const TicketsMainArea = ({ initialTickets }: { initialTickets: any[] }) => {
 return (
  <>
   {/* -- App side area start -- */}
   <div className="app__slide-wrapper">
    <div className="flex items-center justify-between mb-8">
     <Breadcrumb breadTitle="Tickets Hub" subTitle="Home" />
     <SubmitTicketModal />
    </div>
    <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
     <TicketsSummary tickets={initialTickets} />
     <TicketsTable initialTickets={initialTickets} />
    </div>
   </div>
   {/* -- App side area end -- */}
  </>
 );
};

export default TicketsMainArea;

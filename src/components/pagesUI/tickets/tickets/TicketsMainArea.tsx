import React from "react";
import TicketsSummary from "./TicketsSummary";
import TicketsTable from "./TicketsTable";
import SubmitTicketModal from "./SubmitTicketModal";

const TicketsMainArea = ({ initialTickets }: { initialTickets: any[] }) => {
 return (
  <>
   {/* Page Header */}
   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-6 md:py-8 border-b border-white/5 bg-[#080f28]/40">
    <div className="flex flex-col">
     <h1 className="text-[20px] md:text-[28px] font-space font-black text-t1 tracking-tighter leading-tight uppercase">
      SUPPORT TICKETS <span className="text-accent2">HUB</span> 🛠️
     </h1>
     <p className="text-[10px] md:text-[11px] text-t3 font-black uppercase tracking-[0.2em] mt-1">
      REAL-TIME SERVICE DESK OPERATIONS & CLIENT INCIDENT TRACKING
     </p>
    </div>
    <div className="flex items-center gap-2">
     <SubmitTicketModal />
    </div>
   </div>

   {/* Main Content Area */}
   <div className="app__slide-wrapper p-6">
    <div className="grid grid-cols-12 gap-5">
     <TicketsSummary tickets={initialTickets} />
     <TicketsTable initialTickets={initialTickets} />
    </div>
   </div>
  </>
 );
};

export default TicketsMainArea;

import React from "react";
import TicketsSummary from "./TicketsSummary";
import TicketsTable from "./TicketsTable";
import SubmitTicketModal from "./SubmitTicketModal";
import SupportWidgetEmbedModal from "./SupportWidgetEmbedModal";

const TicketsMainArea = ({ initialTickets, workspaceId }: { initialTickets: any[]; workspaceId: string }) => {
 return (
  <>
   {/* Page Header */}
   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-6 md:py-8 border-b border-dash-border bg-white">
    <div className="flex flex-col">
     <h1 className="text-2xl md:text-3xl font-bold !text-dash-text tracking-tight leading-tight">
      Support Tickets Hub
     </h1>
     <p className="text-[13px] !text-dash-textMuted mt-1">
      Real-time service desk operations &amp; client incident tracking
     </p>
    </div>
    <div className="flex items-center gap-2">
     <SupportWidgetEmbedModal workspaceId={workspaceId} />
     <SubmitTicketModal />
    </div>
   </div>

   {/* Main Content Area */}
   <div className="p-6 bg-dash-surface min-h-[calc(100vh-88px)]">
    <div className="grid grid-cols-12 gap-5">
     <TicketsSummary tickets={initialTickets} />
     <TicketsTable initialTickets={initialTickets} />
    </div>
   </div>
  </>
 );
};

export default TicketsMainArea;

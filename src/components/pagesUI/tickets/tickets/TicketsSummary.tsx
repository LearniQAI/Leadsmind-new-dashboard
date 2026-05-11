import SummarySingleCard from "@/components/common/SummarySingleCard";

import React from "react";

const TicketsSummary = ({ tickets }: { tickets: any[] }) => {
  const total = tickets.length;
  const open = tickets.filter(t => t.status === 'open').length;
  const hold = tickets.filter(t => t.status === 'hold').length;
  const cancelled = tickets.filter(t => t.status === 'closed' || t.status === 'cancelled').length;

  return (
   <>
    <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
     <SummarySingleCard
      iconClass="fa-sharp fa-light fa-file-chart-column"
      title="Total Tickets"
      value={total}
      description="Than Last Week"
      percentageChange="+11.54%"
      isIncrease={true}
     />
    </div>
    <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
     <SummarySingleCard
      iconClass="fa-light fa-badge-check"
      title="Open Tickets"
      value={open}
      description="Than Last Week"
      percentageChange="+35.15%"
      isIncrease={true}
     />
    </div>
    <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
     <SummarySingleCard
      iconClass="fa-sharp fa-light fa-circle-xmark"
      title="Hold Tickets"
      value={hold}
      description="Than Last Week"
      percentageChange="+22.15%"
      isIncrease={true}
     />
    </div>
    <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
     <SummarySingleCard
      iconClass="fa-light fa-ban"
      title="Closed Tickets"
      value={cancelled}
      description="Than Last Week"
      percentageChange="+15.95%"
      isIncrease={false}
     />
    </div>
   </>
  );
};

export default TicketsSummary;

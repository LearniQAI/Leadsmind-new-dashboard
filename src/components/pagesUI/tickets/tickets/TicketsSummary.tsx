import React from "react";
import { FileStack, BadgeCheck, CircleDashed, Ban, ArrowUp, ArrowDown } from "lucide-react";

interface TicketStatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  description: string;
  percentageChange: string;
  isIncrease: boolean;
  colorClass: string;
  iconBgClass: string;
}

const TicketStatCard: React.FC<TicketStatCardProps> = ({
  icon,
  title,
  value,
  description,
  percentageChange,
  isIncrease,
  colorClass,
  iconBgClass,
}) => (
  <div className="bg-white border border-dash-border rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgClass} ${colorClass}`}>
        {icon}
      </div>
      <div
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
          isIncrease ? "bg-green/10 text-green" : "bg-red/10 text-red"
        }`}
      >
        {isIncrease ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
        <span>{percentageChange}</span>
      </div>
    </div>
    <div className="text-[32px] font-bold !text-dash-text tracking-tight leading-none">{value}</div>
    <div className="text-[14px] font-bold !text-dash-text mt-2">{title}</div>
    <div className="text-[12px] !text-dash-textMuted mt-0.5">{description}</div>
  </div>
);

const TicketsSummary = ({ tickets }: { tickets: any[] }) => {
  const total = tickets.length;
  const open = tickets.filter(t => t.status === 'open').length;
  const hold = tickets.filter(t => t.status === 'hold').length;
  const cancelled = tickets.filter(t => t.status === 'closed' || t.status === 'cancelled').length;

  return (
   <>
    <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
     <TicketStatCard
      icon={<FileStack size={18} />}
      title="Total Tickets"
      value={total}
      description="Than last week"
      percentageChange="+11.54%"
      isIncrease={true}
      colorClass="!text-dash-accent"
      iconBgClass="bg-dash-accent/10"
     />
    </div>
    <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
     <TicketStatCard
      icon={<BadgeCheck size={18} />}
      title="Open Tickets"
      value={open}
      description="Than last week"
      percentageChange="+35.15%"
      isIncrease={true}
      colorClass="!text-green"
      iconBgClass="bg-green/10"
     />
    </div>
    <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
     <TicketStatCard
      icon={<CircleDashed size={18} />}
      title="Hold Tickets"
      value={hold}
      description="Than last week"
      percentageChange="+22.15%"
      isIncrease={true}
      colorClass="!text-amber"
      iconBgClass="bg-amber/10"
     />
    </div>
    <div className="col-span-12 sm:col-span-6 xxl:col-span-3">
     <TicketStatCard
      icon={<Ban size={18} />}
      title="Closed Tickets"
      value={cancelled}
      description="Than last week"
      percentageChange="+15.95%"
      isIncrease={false}
      colorClass="!text-red"
      iconBgClass="bg-red/10"
     />
    </div>
   </>
  );
};

export default TicketsSummary;

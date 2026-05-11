"use client";
import React from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard";
import { 
 Users, 
 Briefcase, 
 CheckCircle, 
 UserPlus, 
 Ticket, 
 TrendingUp, 
 Calendar, 
 Clock,
 ArrowUpRight
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface HrmDashboardClientProps {
 stats: {
  employees: number;
  projects: number;
  completedProjects: number;
  clients: number;
  tickets: number;
  revenue: number;
 };
 upcomingMeetings: any[];
 recentTasks: any[];
}

const HrmDashboardClient = ({ stats, upcomingMeetings, recentTasks }: HrmDashboardClientProps) => {
 const cardsData = [
  {
   iconClass: "fa-sharp fa-regular fa-users",
   title: "Total Employees",
   value: stats.employees,
   description: "Active Members",
   isIncrease: true,
  },
  {
   iconClass: "fa-sharp fa-regular fa-briefcase",
   title: "Total Projects",
   value: stats.projects,
   description: "Current Pipeline",
   isIncrease: true,
  },
  {
   iconClass: "fa-light fa-badge-check",
   title: "Completed Projects",
   value: stats.completedProjects,
   description: "Successfully Delivered",
   isIncrease: true,
  },
  {
   iconClass: "fa-sharp fa-regular fa-user-plus",
   title: "Total Clients",
   value: stats.clients,
   description: "Active Leads/Clients",
   isIncrease: true,
  },
  {
   iconClass: "fa-sharp fa-light fa-ticket",
   title: "Support Tickets",
   value: stats.tickets,
   description: "Open Tickets",
   isIncrease: false,
  },
  {
   iconClass: "fa-regular fa-arrow-up-right-dots",
   title: "Total Revenue",
   value: `$${stats.revenue.toLocaleString()}`,
   description: "Total Paid Invoices",
   isIncrease: true,
  },
 ];

 return (
  <div className="app__slide-wrapper">
   <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-0">
    {/* Stats Cards */}
    {cardsData.map((card, index) => (
     <div key={index} className="col-span-12 sm:col-span-6 xxl:col-span-4 mb-[20px]">
      <SummarySingleCard {...card} />
     </div>
    ))}

    {/* Meeting Schedule & Recent Tasks */}
    <div className="col-span-12 xxl:col-span-6">
     <div className="card__wrapper no-height">
      <div className="card__title-wrap flex items-center justify-between mb-[20px]">
       <h5 className="card__heading-title flex items-center gap-2">
        <Calendar size={18} className="text-primary" /> Upcoming Meetings
       </h5>
       <Link href="/calendar" className="text-xs text-primary font-bold hover:underline">View Calendar</Link>
      </div>
      <div className="table__wrapper meeting-table table-responsive">
       <table className="table mb-[20px] w-full">
        <thead>
         <tr className="table__title">
          <th>Meeting Title</th>
          <th>Contact</th>
          <th>Date & Time</th>
         </tr>
        </thead>
        <tbody className="table__body">
         {upcomingMeetings.length === 0 ? (
          <tr>
           <td colSpan={3} className="text-center py-10 text-white/40 uppercase text-[10px] font-bold tracking-widest">No upcoming meetings</td>
          </tr>
         ) : (
          upcomingMeetings.map((meeting, index) => (
           <tr key={index}>
            <td>{meeting.title}</td>
            <td>{meeting.contacts ? `${meeting.contacts.first_name} ${meeting.contacts.last_name}` : 'Unknown'}</td>
            <td className="text-primary">{format(new Date(meeting.start_time), 'MMM dd, p')}</td>
           </tr>
          ))
         )}
        </tbody>
       </table>
      </div>
     </div>
    </div>

    <div className="col-span-12 xxl:col-span-6">
     <div className="card__wrapper no-height">
      <div className="card__title-wrap flex items-center justify-between mb-[20px]">
       <h5 className="card__heading-title flex items-center gap-2">
        <Clock size={18} className="text-info" /> Recent Tasks
       </h5>
       <Link href="/projects" className="text-xs text-info font-bold hover:underline">All Projects</Link>
      </div>
      <div className="table__wrapper meeting-table table-responsive">
       <table className="table mb-[20px] w-full">
        <thead>
         <tr className="table__title">
          <th>Task Title</th>
          <th>Project</th>
          <th>Status</th>
         </tr>
        </thead>
        <tbody className="table__body">
         {recentTasks.length === 0 ? (
          <tr>
           <td colSpan={3} className="text-center py-10 text-white/40 uppercase text-[10px] font-bold tracking-widest">No recent tasks</td>
          </tr>
         ) : (
          recentTasks.map((task, index) => (
           <tr key={index}>
            <td>{task.title}</td>
            <td>{task.projects?.name || 'N/A'}</td>
            <td>
             <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              task.status === 'done' ? 'bg-success/10 text-success' :
              task.status === 'in_progress' ? 'bg-info/10 text-info' :
              'bg-warning/10 text-warning'
             }`}>
              {task.status}
             </span>
            </td>
           </tr>
          ))
         )}
        </tbody>
       </table>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
};

export default HrmDashboardClient;

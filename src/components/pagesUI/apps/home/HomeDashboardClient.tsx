"use client";
import React from "react";
import SummarySingleCard from "@/components/common/SummarySingleCard";
import { 
  Users, 
  Zap, 
  Trophy, 
  Share2, 
  TrendingUp, 
  Activity, 
  DollarSign, 
  ArrowUpRight,
  Target
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface HomeDashboardClientProps {
  stats: {
    leads: number;
    newLeads: number;
    automations: number;
    wonDeals: number;
    socialQueue: number;
    revenue: number;
  };
  recentActivities: any[];
  topOpportunities: any[];
}

const HomeDashboardClient = ({ stats, recentActivities, topOpportunities }: HomeDashboardClientProps) => {
  const conversionRate = stats.leads > 0 ? ((stats.wonDeals / stats.leads) * 100).toFixed(1) : "0";

  const cardsData = [
    {
      iconClass: "fa-sharp fa-regular fa-users",
      title: "Total Leads",
      value: stats.leads,
      description: `${stats.newLeads} New this week`,
      isIncrease: true,
    },
    {
      iconClass: "fa-sharp fa-regular fa-bolt",
      title: "Active Automations",
      value: stats.automations,
      description: "Workflows running",
      isIncrease: true,
    },
    {
      iconClass: "fa-sharp fa-regular fa-trophy",
      title: "Won Opportunities",
      value: stats.wonDeals,
      description: `${conversionRate}% Conv. Rate`,
      isIncrease: true,
    },
    {
      iconClass: "fa-sharp fa-regular fa-share-nodes",
      title: "Social Queue",
      value: stats.socialQueue,
      description: "Scheduled posts",
      isIncrease: true,
    },
    {
      iconClass: "fa-regular fa-dollar-sign",
      title: "Total Revenue",
      value: `$${stats.revenue.toLocaleString()}`,
      description: "Total Paid Invoices",
      isIncrease: true,
    },
    {
      iconClass: "fa-sharp fa-regular fa-chart-line",
      title: "Growth Metric",
      value: stats.newLeads > 0 ? `+${((stats.newLeads / (stats.leads || 1)) * 100).toFixed(1)}%` : "0%",
      description: "Leads WoW",
      isIncrease: true,
    },
  ];

  return (
    <div className="app__slide-wrapper">
      <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-0">
        {/* Stats Cards */}
        {cardsData.map((card, index) => (
          <div key={index} className="col-span-12 sm:col-span-6 lg:col-span-4 mb-[20px]">
            <SummarySingleCard {...card} />
          </div>
        ))}

        {/* Activity Feed & Top Opportunities */}
        <div className="col-span-12 xxl:col-span-7">
          <div className="card__wrapper no-height">
            <div className="card__title-wrap flex items-center justify-between mb-[20px]">
              <h5 className="card__heading-title flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Live Activity Feed
              </h5>
              <Link href="/activities" className="text-xs text-primary font-bold hover:underline">View All</Link>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto common-scrollbar pr-2">
              {recentActivities.length === 0 ? (
                <div className="text-center py-20 text-white/20 uppercase text-[10px] font-bold tracking-widest border border-dashed border-white/5 rounded-2xl">No recent activity</div>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      {activity.type === 'note' ? <Zap size={16} /> : <TrendingUp size={16} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white/80 font-medium">
                        <span className="text-primary font-bold">{activity.contacts ? `${activity.contacts.first_name} ${activity.contacts.last_name}` : 'Unknown'}</span>: {activity.description}
                      </p>
                      <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ArrowUpRight size={14} className="text-white/10 group-hover:text-white/40" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 xxl:col-span-5">
          <div className="card__wrapper no-height">
            <div className="card__title-wrap flex items-center justify-between mb-[20px]">
              <h5 className="card__heading-title flex items-center gap-2">
                <Target size={18} className="text-success" /> High-Value Opportunities
              </h5>
              <Link href="/opportunities" className="text-xs text-success font-bold hover:underline">Pipeline</Link>
            </div>
            <div className="table__wrapper meeting-table table-responsive">
              <table className="table mb-[20px] w-full">
                <thead>
                  <tr className="table__title">
                    <th>Deal</th>
                    <th>Contact</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody className="table__body">
                  {topOpportunities.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-white/40 uppercase text-[10px] font-bold tracking-widest">No open opportunities</td>
                    </tr>
                  ) : (
                    topOpportunities.map((opp, index) => (
                      <tr key={index}>
                        <td className="font-bold">{opp.title}</td>
                        <td>{opp.contacts ? `${opp.contacts.first_name} ${opp.contacts.last_name}` : 'Unknown'}</td>
                        <td className="text-success font-black tracking-tighter">${Number(opp.value).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-6 rounded-2xl bg-success/5 border border-success/10">
               <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-success/60">Revenue Target</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-success">85%</p>
               </div>
               <div className="h-2 w-full bg-success/10 rounded-full overflow-hidden">
                  <div className="h-full bg-success w-[85%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboardClient;

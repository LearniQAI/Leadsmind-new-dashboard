"use client";
import React from "react";
import {
  Zap,
  TrendingUp,
  Activity,
  Target,
  ArrowUpRight,
  MousePointer2,
  PieChart,
  Layers,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import QuickActions from "@/components/dashboard/QuickActions";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";

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
  overdueTasks?: any[];
  attributionMetrics?: {
    totalRandRevenue: number;
    ctor: number;
    stepRevenue: Record<string, { step_id: string; workflow_name: string; step_type: string; revenue: number }>;
  };
}

const HomeDashboardClient = ({
  stats,
  recentActivities,
  topOpportunities,
  overdueTasks = [],
  attributionMetrics,
}: HomeDashboardClientProps) => {
  const { user } = useDashboardContext();
  const conversionRate =
    stats.leads > 0 ? ((stats.wonDeals / stats.leads) * 100).toFixed(1) : "0";

  const cardsData = [
    {
      label: "Total Leads",
      value: stats.leads.toLocaleString(),
      subLabel: `${stats.newLeads} New this week`,
      icon: "fa-users",
      color: "var(--accent2)",
      bgColor: "rgba(59, 130, 246, 0.1)",
      trend:
        stats.newLeads > 0
          ? `+${((stats.newLeads / (stats.leads || 1)) * 100).toFixed(1)}%`
          : "0%",
      trendType: "up",
    },
    {
      label: "Won Opportunities",
      value: stats.wonDeals.toLocaleString(),
      subLabel: `${conversionRate}% Conv. Rate`,
      icon: "fa-trophy",
      color: "var(--green)",
      bgColor: "rgba(16, 185, 129, 0.1)",
      trend: "Healthy",
      trendType: "up",
    },
    {
      label: "Total Revenue",
      value: `$${stats.revenue.toLocaleString()}`,
      subLabel: "Total Paid Invoices",
      icon: "fa-dollar-sign",
      color: "var(--amber)",
      bgColor: "rgba(245, 158, 11, 0.1)",
      trend: "+8.5%",
      trendType: "up",
    },
    {
      label: "Active Automations",
      value: stats.automations.toLocaleString(),
      subLabel: "Workflows running",
      icon: "fa-bolt",
      color: "var(--purple)",
      bgColor: "rgba(139, 92, 246, 0.1)",
      trend: "Active",
      trendType: "up",
    },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-6 md:py-8">
        <div className="flex flex-col">
          <h1 className="text-[20px] md:text-[28px] font-space font-black text-t1 tracking-tighter leading-tight">
            HELLO,{" "}
            <span className="text-accent2">
              {user?.firstName?.toUpperCase() || "USER"}
            </span>{" "}
            👋
          </h1>
          <p className="text-[10px] md:text-[11px] text-t3 font-black uppercase tracking-[0.2em] mt-1">
            HERE IS WHAT IS HAPPENING WITH YOUR BUSINESS TODAY
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/5 rounded-xl text-[11px] font-bold text-t2 hover:text-t1 hover:bg-white/[0.08] transition-all whitespace-nowrap">
            <i className="fa-solid fa-calendar text-[10px]"></i> View Schedule
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-[11px] font-bold shadow-lg shadow-accent/20 hover:bg-accent2 transition-all whitespace-nowrap">
            <i className="fa-solid fa-plus text-[10px]"></i> New Opportunity
          </button>
        </div>
      </div>

      {/* Critical Alerts Zone */}
      {overdueTasks.length > 0 && (
        <div className="px-6 pb-6">
          <div className="relative overflow-hidden p-4 md:p-6 rounded-2xl bg-red/10 border border-red/20 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Pulsing Accent */}
            <div className="absolute top-0 left-0 w-1 h-full bg-red shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-red/20 flex items-center justify-center text-red border border-red/20">
                <Zap size={24} className="fill-current" />
              </div>
              <div>
                <h4 className="text-[15px] font-space font-black text-white uppercase tracking-tight">
                  CRITICAL:{" "}
                  <span className="text-red">
                    {overdueTasks.length} HIGH PRIORITY
                  </span>{" "}
                  OBJECTIVES ARE OVERDUE
                </h4>
                <p className="text-[11px] text-red/60 font-bold uppercase tracking-widest mt-0.5">
                  Strategic intervention required immediately to maintain
                  operational velocity.
                </p>
              </div>
            </div>

            <Link
              href="/tasks"
              className="px-6 py-2.5 bg-red text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red/90 transition-all text-center shadow-lg shadow-red/20"
            >
              TAKE COMMAND
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      <QuickActions />

      <div className="app__slide-wrapper p-6">
        <div className="grid grid-cols-12 gap-5">
          {/* Stats Cards Grid - 8 Cards */}
          <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-2">
            {cardsData.map((stat, index) => (
              <div
                key={index}
                className="stat-card"
                style={{ "--card-accent": stat.color } as React.CSSProperties}
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="stat-icon"
                    style={{ backgroundColor: stat.bgColor, color: stat.color }}
                  >
                    <i className={`fa-solid ${stat.icon}`}></i>
                  </div>
                  <div className={`stat-trend ${stat.trendType}`}>
                    <i
                      className={`fa-solid fa-arrow-${stat.trendType === "up" ? "up" : "down"} mr-1`}
                    ></i>
                    {stat.trend}
                  </div>
                </div>
                <div className="stat-value font-space">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-sublabel">{stat.subLabel}</div>
              </div>
            ))}
          </div>

          {/* Revenue Attribution & ROI Insights */}
          {attributionMetrics && (
            <div className="col-span-12">
              <div className="card__wrapper !p-6 border border-white/5 bg-[#080f28]/60 backdrop-blur-xl rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h5 className="text-[14px] font-bold text-t1 flex items-center gap-2 uppercase tracking-tight font-space">
                      <TrendingUp size={16} className="text-amber" /> ROI & REVENUE <span className="text-amber">ATTRIBUTION</span>
                    </h5>
                    <p className="text-[10px] text-t3 uppercase font-black tracking-widest mt-0.5">
                      Paid Invoice Tracking & Conversion Mapping (Last 30 Days Lookback)
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-t2 font-space">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> PayFast & Platform Processors Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Rand Value Gains */}
                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-t3 tracking-widest block mb-1">Total ZAR Value Gains</span>
                      <span className="text-2xl font-black text-white font-space">
                        R{attributionMetrics.totalRandRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-[#10b981] mt-2 block uppercase tracking-tight">
                      <i className="fa-solid fa-circle-check mr-1" /> Native Rand ROI
                    </span>
                  </div>

                  {/* CTOR */}
                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-t3 tracking-widest block mb-1">Click-Through-Open-Rate (CTOR)</span>
                      <span className="text-2xl font-black text-white font-space">
                        {attributionMetrics.ctor}%
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-accent2 mt-2 block uppercase tracking-tight">
                      <i className="fa-solid fa-arrow-pointer mr-1" /> Dynamic Email Engagement
                    </span>
                  </div>

                  {/* Sequence Revenue Contributions */}
                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col">
                    <span className="text-[9px] font-black uppercase text-t3 tracking-widest block mb-3">Sequence Revenue Generations</span>
                    <div className="space-y-2 overflow-y-auto max-h-[80px] common-scrollbar pr-1">
                      {Object.values(attributionMetrics.stepRevenue).length === 0 ? (
                        <span className="text-xs text-t3 font-medium block italic uppercase tracking-wider">No sequence step attribution recorded yet</span>
                      ) : (
                        Object.values(attributionMetrics.stepRevenue).map((step, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="font-bold text-white truncate block uppercase tracking-tight">{step.workflow_name}</span>
                              <span className="text-[10px] text-t3 block uppercase font-medium">{step.step_type === 'send_email' ? 'Email step' : step.step_type}</span>
                            </div>
                            <span className="font-black text-amber font-space shrink-0">R{step.revenue.toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Feed & Top Opportunities */}
          <div className="col-span-12 xxl:col-span-7">
            <div className="card__wrapper !p-0 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <div className="flex flex-col">
                  <h5 className="text-[14px] font-bold text-t1 flex items-center gap-2 uppercase tracking-tight">
                    <Activity size={16} className="text-accent2" /> LIVE
                    ACTIVITY <span className="text-accent2">FEED</span>
                  </h5>
                  <p className="text-[10px] text-t3 uppercase font-black tracking-widest mt-0.5">
                    Real-time business updates
                  </p>
                </div>
                <Link
                  href="/activities"
                  className="btn-ghost !px-4 !py-2 !text-[11px] !rounded-xl"
                >
                  View History
                </Link>
              </div>

              <div className="p-4 flex-1 max-h-[520px] overflow-y-auto common-scrollbar">
                {recentActivities.length === 0 ? (
                  <div className="empty-state py-20 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-5 rotate-3">
                      <Zap size={32} className="text-t3 opacity-20" />
                    </div>
                    <h6 className="text-t1 font-bold text-[16px] mb-2 font-space">
                      NO ACTIVITY YET
                    </h6>
                    <p className="text-t3 text-[12px] max-w-[260px] mb-6 leading-relaxed uppercase tracking-tight font-medium">
                      Your business feed is waiting for your first move. Capture
                      a lead to start.
                    </p>
                    <Link
                      href="/contacts/new"
                      className="btn-primary !rounded-xl !px-6"
                    >
                      + Create Contact
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentActivities.map((activity, index) => {
                      const desc = activity.description.toLowerCase();
                      let typeLabel = "SYSTEM";
                      let color = "var(--accent2)";
                      let tint = "rgba(59, 132, 246, 0.06)";
                      let icon = <Zap size={14} />;

                      if (desc.includes("won") || desc.includes("paid")) {
                        typeLabel = "DEAL WON";
                        color = "var(--green)";
                        tint = "rgba(16, 185, 129, 0.08)";
                        icon = <Target size={14} />;
                      } else if (
                        desc.includes("email") ||
                        desc.includes("sent")
                      ) {
                        typeLabel = "OUTREACH";
                        color = "var(--purple)";
                        tint = "rgba(139, 92, 246, 0.08)";
                        icon = <Layers size={14} />;
                      } else if (
                        desc.includes("created") ||
                        desc.includes("new")
                      ) {
                        typeLabel = "NEW LEAD";
                        color = "var(--cyan)";
                        tint = "rgba(6, 182, 212, 0.08)";
                        icon = <TrendingUp size={14} />;
                      }

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all relative overflow-hidden group"
                          style={{ borderLeft: `3px solid ${color}` }}
                        >
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{
                              background: `linear-gradient(90deg, ${tint} 0%, transparent 100%)`,
                            }}
                          ></div>

                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10"
                            style={{ backgroundColor: tint, color: color }}
                          >
                            {icon}
                          </div>

                          <div className="flex-1 min-w-0 relative z-10">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className="text-[9px] font-black tracking-[0.1em] px-1.5 py-0.5 rounded uppercase font-space"
                                style={{
                                  backgroundColor: color,
                                  color: "#fff",
                                }}
                              >
                                {typeLabel}
                              </span>
                              <span className="text-[10px] text-t3 font-bold uppercase tracking-widest opacity-60">
                                {formatDistanceToNow(
                                  new Date(activity.created_at),
                                  { addSuffix: true },
                                )}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <h6 className="text-[14px] font-bold text-t1 leading-tight mb-0.5">
                                {activity.contacts
                                  ? `${activity.contacts.first_name} ${activity.contacts.last_name}`
                                  : "System Action"}
                              </h6>
                              <p className="text-[12px] text-t2 leading-relaxed opacity-80 truncate">
                                {activity.description}
                              </p>
                            </div>
                          </div>

                          <div className="hidden sm:flex flex-shrink-0 relative z-10">
                            <Link
                              href={
                                activity.contacts?.id
                                  ? `/contacts/${activity.contacts.id}`
                                  : activity.contact_id
                                    ? `/contacts/${activity.contact_id}`
                                    : "#"
                              }
                              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-t3 hover:text-white hover:bg-accent transition-all"
                            >
                              <ArrowUpRight size={14} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-12 xxl:col-span-5">
            <div className="card__wrapper !p-0 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h5 className="text-[13px] font-bold text-t1 flex items-center gap-2 uppercase tracking-tight">
                  <Target size={16} className="text-green" /> High-Value{" "}
                  <span className="text-green">Deals</span>
                </h5>
                <Link
                  href="/opportunities"
                  className="text-[12px] font-bold text-accent2 hover:text-accent transition-colors"
                >
                  Pipeline{" "}
                  <i className="fa-solid fa-arrow-right ml-1 text-[10px]"></i>
                </Link>
              </div>

              <div className="p-5 flex-1 overflow-y-auto no-scrollbar">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-t3 border-b border-white/5">
                        <th className="pb-3 font-black">Deal Name</th>
                        <th className="pb-3 font-black text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="text-[13px]">
                      {topOpportunities.length === 0 ? (
                        <tr>
                          <td
                            colSpan={2}
                            className="py-12 flex flex-col items-center justify-center text-center"
                          >
                            <i className="fa-solid fa-folder-open text-t3 opacity-20 text-2xl mb-2"></i>
                            <p className="text-t3 uppercase text-[10px] font-bold tracking-widest">
                              No open opportunities
                            </p>
                          </td>
                        </tr>
                      ) : (
                        topOpportunities.map((opp, index) => (
                          <tr
                            key={index}
                            className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors group"
                          >
                            <td className="py-4">
                              <div className="font-space font-bold text-t1 text-[14px] group-hover:text-accent2 transition-colors">
                                {opp.title}
                              </div>
                              <div className="text-[11px] text-t3 font-medium uppercase tracking-tight mt-0.5">
                                <i className="fa-solid fa-user-circle mr-1 opacity-50"></i>
                                {opp.contacts
                                  ? `${opp.contacts.first_name} ${opp.contacts.last_name}`
                                  : "Unknown Contact"}
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <div className="font-space font-black text-amber text-[16px] leading-none">
                                ${Number(opp.value).toLocaleString()}
                              </div>
                              <div className="text-[9px] text-t3 uppercase font-bold mt-1 opacity-60">
                                Estimated
                              </div>
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
      </div>
    </>
  );
};

export default HomeDashboardClient;

"use client";
import React, { useState, useLayoutEffect } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  ArrowUpRight,
  Layers,
  Plus,
  FileText,
  Send,
  FileSignature,
  CalendarDays,
  CircleCheck,
  DollarSign,
  Percent,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import type { DashboardMetrics } from "@/types/analytics.types";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

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
  metrics?: DashboardMetrics;
}

const PIPELINE_TINTS = [
  "bg-dash-accent/5 text-dash-accent",
  "bg-dash-accent/10 text-dash-accent",
  "bg-dash-accent/15 text-dash-accent",
  "bg-dash-accent/20 text-dash-accent",
  "bg-dash-accent/25 text-dash-accent",
];

// Design token system for this page — one definition per card "weight" so every
// section pulls from the same place instead of re-deriving similar-looking
// classes. Leading sections (stat cards, the revenue chart) get CARD; quieter,
// supporting sections (Recent Activity, Tasks, ROI) get CARD_QUIET, which is
// identical except for a touch less padding — same radius/border/shadow either way.
const CARD =
  "bg-white border border-dash-border rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 motion-reduce:transition-none";
const CARD_STATIC = "bg-white border border-dash-border rounded-2xl shadow-sm";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function DeltaPill({ isPositive, changePercent, label }: { isPositive: boolean; changePercent: number; label?: string }) {
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${
        isPositive ? "bg-green/10 text-green" : "bg-red/10 text-red"
      }`}
    >
      <Icon size={12} />
      {changePercent}% {label}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const [isMounted, setIsMounted] = useState(false);
  useLayoutEffect(() => setIsMounted(true), []);

  if (!isMounted || data.length < 2) return <div className="h-10" />;

  const options: ApexOptions = {
    series: [{ data }],
    chart: { type: "line", sparkline: { enabled: true }, animations: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    colors: [color],
    tooltip: { enabled: false },
  };

  return <Chart options={options} series={options.series} type="line" height={40} />;
}

// One header shape for every "list-style" card on this page (icon + title on the
// left, an optional action link on the right) so it can't drift section to
// section. Chart cards keep their own richer KPI-style header — that's a
// deliberately different kind of header, not an oversight.
function SectionHeader({
  icon,
  iconColorClass = "text-dash-accent",
  title,
  actionLabel,
  actionHref,
  quiet = false,
}: {
  icon: React.ReactNode;
  iconColorClass?: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
  quiet?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between border-b border-dash-border ${quiet ? "px-4 py-3" : "px-5 py-4"}`}>
      <h5 className="text-[13px] font-bold !text-dash-text flex items-center gap-2">
        <span className={iconColorClass}>{icon}</span> {title}
      </h5>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="text-[12px] font-bold text-dash-accent hover:opacity-80 transition-opacity flex items-center gap-1">
          {actionLabel} <ArrowUpRight size={12} />
        </Link>
      )}
    </div>
  );
}

// One empty state for every section on this page. Copy is passed in per call
// site and is unchanged from before — this only unifies the container.
function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center gap-1 ${compact ? "py-6" : "py-10"}`}>
      <div className={`rounded-2xl bg-dash-surface flex items-center justify-center mb-3 ${compact ? "w-11 h-11" : "w-14 h-14"}`}>
        <span className="!text-dash-textMuted">{icon}</span>
      </div>
      <h6 className="!text-dash-text font-bold text-[13px]">{title}</h6>
      {description && <p className="!text-dash-textMuted text-[12px] max-w-[240px]">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="text-[12px] font-bold text-dash-accent hover:opacity-80 mt-1">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

const HomeDashboardClient = ({
  stats,
  recentActivities,
  topOpportunities,
  overdueTasks = [],
  attributionMetrics,
  metrics,
}: HomeDashboardClientProps) => {
  const { user } = useDashboardContext();
  const conversionRate = stats.leads > 0 ? ((stats.wonDeals / stats.leads) * 100).toFixed(1) : "0";
  const newLeadsPct = stats.newLeads > 0 ? ((stats.newLeads / (stats.leads || 1)) * 100).toFixed(1) : "0";

  const contactsSpark = (metrics?.contactsOverTime ?? []).map((p) => p.value);
  const revenueSpark = (metrics?.revenueByWeek ?? []).map((p) => p.value);

  const statCards = [
    {
      label: "Total Leads",
      value: stats.leads.toLocaleString(),
      subLabel: `${stats.newLeads} new this week`,
      icon: "fa-users",
      colorClass: "bg-blue-500/10 text-blue-600",
      sparkColor: "#1359FF",
      sparkData: contactsSpark,
      delta: { isPositive: true, changePercent: Number(newLeadsPct), label: "this week" },
    },
    {
      label: "Won Opportunities",
      value: stats.wonDeals.toLocaleString(),
      subLabel: `${conversionRate}% conversion rate`,
      icon: "fa-trophy",
      colorClass: "bg-green/10 text-green",
      sparkColor: "#10b981",
      sparkData: [] as number[],
      delta: null,
    },
    {
      label: "Total Revenue",
      value: `$${stats.revenue.toLocaleString()}`,
      subLabel: "Total paid invoices",
      icon: "fa-dollar-sign",
      colorClass: "bg-amber-500/10 text-amber-600",
      sparkColor: "#f59e0b",
      sparkData: revenueSpark,
      delta: metrics
        ? { isPositive: metrics.revenueThisPeriod.isPositive, changePercent: metrics.revenueThisPeriod.changePercent, label: "last 30 days" }
        : null,
    },
    {
      label: "Active Automations",
      value: stats.automations.toLocaleString(),
      subLabel: "Workflows running",
      icon: "fa-bolt",
      colorClass: "bg-purple-500/10 text-purple-600",
      sparkColor: "#8b5cf6",
      sparkData: [] as number[],
      delta: null,
    },
  ];

  const quickActions = [
    { label: "New Lead", icon: <Plus size={12} />, link: "/contacts/new", primary: true },
    { label: "New Invoice", icon: <FileText size={12} />, link: "/invoices/new" },
    { label: "Send Campaign", icon: <Send size={12} />, link: "/campaigns" },
    { label: "Book Appointment", icon: <CalendarDays size={12} />, link: "/calendar" },
    { label: "New Automation", icon: <Zap size={12} />, link: "/automations" },
    { label: "New Proposal", icon: <FileSignature size={12} />, link: "/proposals" },
  ];

  const revenueByWeek = metrics?.revenueByWeek ?? [];
  const contactsOverTime = metrics?.contactsOverTime ?? [];
  const pipelineFunnel = metrics?.pipelineFunnel ?? [];

  // Revenue is the page's signature moment — the one thing a business owner
  // opens this dashboard to check first — so it gets a taller chart, a richer
  // two-stop gradient, and a bolder headline number than everything else here.
  const revenueChartOptions: ApexOptions = {
    series: [{ name: "Revenue", data: revenueByWeek.map((p) => p.value) }],
    chart: { type: "area", height: 320, toolbar: { show: false }, zoom: { enabled: false } },
    colors: ["#1359FF"],
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.03, stops: [0, 90, 100] },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 0, hover: { size: 6 }, colors: ["#1359FF"], strokeColors: "#fff", strokeWidth: 2 },
    grid: { show: true, borderColor: "#E2E8F0", strokeDashArray: 4 },
    xaxis: {
      categories: revenueByWeek.map((p) => p.label),
      labels: { style: { colors: "#64748B", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#64748B", fontSize: "11px" }, formatter: (v) => `$${Math.round(v)}` } },
  };

  const leadsChartOptions: ApexOptions = {
    series: [{ name: "New Leads", data: contactsOverTime.map((p) => p.value) }],
    chart: { type: "bar", height: 320, toolbar: { show: false } },
    colors: ["#1359FF"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    dataLabels: { enabled: false },
    grid: { show: true, borderColor: "#E2E8F0", strokeDashArray: 4 },
    xaxis: {
      categories: contactsOverTime.map((p) => p.label.slice(5)),
      labels: { style: { colors: "#64748B", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#64748B", fontSize: "11px" } } },
  };

  const roiTiles = [
    {
      icon: <DollarSign size={14} />,
      label: "Total ZAR value gains",
      value: `R${attributionMetrics?.totalRandRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      icon: <Percent size={14} />,
      label: "Click-through-open rate",
      value: `${attributionMetrics?.ctor}%`,
    },
  ];

  return (
    <div className="bg-dash-bg min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-6 md:py-8">
        <div className="flex flex-col">
          <h1 className="text-[22px] md:text-[28px] font-black !text-dash-text tracking-tight leading-tight">
            {getGreeting()}, {user?.firstName || "there"} 👋
          </h1>
          <p className="text-[12px] md:text-[13px] !text-dash-textMuted mt-1">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-dash-border rounded-xl text-[12px] font-bold !text-dash-textMuted whitespace-nowrap">
            <CalendarDays size={14} /> Last 30 days
          </div>
          <Link
            href="/pipelines"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-dash-accent text-white rounded-xl text-[12px] font-bold shadow-lg shadow-dash-accent/20 hover:bg-dash-accent/90 transition-all whitespace-nowrap"
          >
            <Plus size={14} /> New Opportunity
          </Link>
        </div>
      </div>

      {/* Critical Alerts */}
      {overdueTasks.length > 0 && (
        <div className="px-6 pb-6">
          <div className="p-4 md:p-5 rounded-2xl bg-red/5 border border-red/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-red/10 flex items-center justify-center text-red flex-shrink-0">
                <Zap size={20} className="fill-current" />
              </div>
              <div>
                <h4 className="text-[14px] font-bold !text-dash-text">
                  {overdueTasks.length} high priority task{overdueTasks.length === 1 ? "" : "s"} overdue
                </h4>
                <p className="text-[12px] !text-dash-textMuted mt-0.5">Needs attention to stay on track.</p>
              </div>
            </div>
            <Link
              href="/tasks"
              className="px-5 py-2.5 bg-red text-white rounded-xl text-[12px] font-bold hover:bg-red/90 transition-all text-center"
            >
              Review tasks
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions — page-local light styling (shared QuickActions component
          stays dark for other still-dark dashboards, so it's not reused here) */}
      <div className="px-6 pb-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.link}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${
              action.primary
                ? "bg-dash-accent text-white shadow-md shadow-dash-accent/20"
                : "bg-white border border-dash-border !text-dash-textMuted hover:!text-dash-text hover:border-dash-accent/30"
            }`}
          >
            {action.icon} {action.label}
          </Link>
        ))}
      </div>

      <div className="px-6 pb-8 space-y-5">
        {/* Stat Cards — leads visually alongside the revenue chart below */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((stat) => (
            <div key={stat.label} className={`${CARD} p-5`}>
              <div className="flex justify-between items-start mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.colorClass}`}>
                  <i className={`fa-solid ${stat.icon} text-[16px]`}></i>
                </div>
                {stat.delta && (
                  <DeltaPill isPositive={stat.delta.isPositive} changePercent={stat.delta.changePercent} label={stat.delta.label} />
                )}
              </div>
              <div className="text-[26px] font-black !text-dash-text leading-tight">{stat.value}</div>
              <div className="text-[13px] font-bold !text-dash-text mt-0.5">{stat.label}</div>
              <div className="text-[11px] !text-dash-textMuted mt-0.5">{stat.subLabel}</div>
              {stat.sparkData.length >= 2 && (
                <div className="mt-3 -mx-1">
                  <Sparkline data={stat.sparkData} color={stat.sparkColor} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Revenue (signature moment, 2/3) / Leads (1/3) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className={`${CARD} xl:col-span-2 p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="text-[13px] font-bold !text-dash-text">Revenue Overview</h5>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[28px] font-black !text-dash-text leading-none">
                    ${(metrics?.revenueThisPeriod.value ?? 0).toLocaleString()}
                  </span>
                  {metrics && (
                    <DeltaPill
                      isPositive={metrics.revenueThisPeriod.isPositive}
                      changePercent={metrics.revenueThisPeriod.changePercent}
                      label="last 30 days"
                    />
                  )}
                </div>
              </div>
              <div className="px-3 py-1.5 bg-dash-surface border border-dash-border rounded-lg text-[11px] font-bold !text-dash-textMuted">
                This Month
              </div>
            </div>
            {revenueByWeek.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-[12px] !text-dash-textMuted">
                No paid invoices in the last 30 days yet.
              </div>
            ) : (
              <Chart options={revenueChartOptions} series={revenueChartOptions.series} type="area" height={320} />
            )}
          </div>

          <div className={`${CARD} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="text-[13px] font-bold !text-dash-text">Leads Overview</h5>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[20px] font-black !text-dash-text">
                    {(metrics?.totalContacts.value ?? 0).toLocaleString()}
                  </span>
                  {metrics && (
                    <DeltaPill
                      isPositive={metrics.totalContacts.isPositive}
                      changePercent={metrics.totalContacts.changePercent}
                      label="last 30 days"
                    />
                  )}
                </div>
              </div>
            </div>
            {contactsOverTime.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-[12px] !text-dash-textMuted">
                No new leads in the last 30 days yet.
              </div>
            ) : (
              <Chart options={leadsChartOptions} series={leadsChartOptions.series} type="bar" height={320} />
            )}
          </div>
        </div>

        {/* Sales Pipeline — full width, horizontal stage cards */}
        <div className={`${CARD_STATIC} overflow-hidden flex flex-col`}>
          <SectionHeader icon={<Layers size={15} />} title="Sales Pipeline" actionLabel="Manage pipeline" actionHref="/pipelines" />
          <div className="p-5">
            {pipelineFunnel.length === 0 ? (
              <EmptyState
                icon={<Layers size={22} />}
                title="No pipeline stages configured yet."
                actionLabel="Set up a pipeline"
                actionHref="/pipelines"
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {pipelineFunnel.map((stage, i) => (
                  <div
                    key={stage.label}
                    className={`rounded-xl p-4 ${PIPELINE_TINTS[i % PIPELINE_TINTS.length]}`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wide opacity-80 truncate">{stage.label}</div>
                    <div className="text-[22px] font-black mt-1">{stage.value}</div>
                    <div className="text-[11px] opacity-70">deal{stage.value === 1 ? "" : "s"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity (1/2) / Tasks (1/2) — supporting info, quieter weight */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className={`${CARD_STATIC} overflow-hidden flex flex-col`}>
            <SectionHeader icon={<Activity size={14} />} title="Recent Activity" actionLabel="View all" actionHref="/activities" quiet />
            <div className="p-3 flex-1 max-h-[380px] overflow-y-auto">
              {recentActivities.length === 0 ? (
                <EmptyState
                  icon={<Zap size={22} />}
                  title="No activity yet"
                  description="Your activity feed is waiting for its first move. Capture a lead to start."
                  compact
                />
              ) : (
                <div className="space-y-1">
                  {recentActivities.map((activity, index) => {
                    const desc = (activity.description || "").toLowerCase();
                    let typeLabel = "System";
                    let dotClass = "bg-blue-500";
                    if (desc.includes("won") || desc.includes("paid")) {
                      typeLabel = "Deal won";
                      dotClass = "bg-green";
                    } else if (desc.includes("email") || desc.includes("sent")) {
                      typeLabel = "Outreach";
                      dotClass = "bg-purple-500";
                    } else if (desc.includes("created") || desc.includes("new")) {
                      typeLabel = "New lead";
                      dotClass = "bg-cyan-500";
                    }

                    return (
                      <div key={index} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-dash-surface transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold !text-dash-text truncate">
                              {activity.contacts ? `${activity.contacts.first_name} ${activity.contacts.last_name}` : "System"}
                            </span>
                            <span className="text-[10px] !text-dash-textMuted">{typeLabel}</span>
                          </div>
                          <p className="text-[12px] !text-dash-textMuted truncate">{activity.description}</p>
                        </div>
                        <span className="text-[10px] !text-dash-textMuted flex-shrink-0">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className={`${CARD_STATIC} overflow-hidden flex flex-col`}>
            <SectionHeader icon={<CircleCheck size={14} />} title="Tasks" actionLabel="Open tasks" actionHref="/tasks" quiet />
            <div className="p-3 flex-1 max-h-[380px] overflow-y-auto">
              {overdueTasks.length === 0 ? (
                <EmptyState icon={<CircleCheck size={22} />} title="Nothing overdue right now." compact />
              ) : (
                <div className="space-y-1">
                  {overdueTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-dash-surface transition-colors">
                      <input
                        type="checkbox"
                        disabled
                        title="Mark complete from the Tasks module"
                        className="w-4 h-4 rounded border-dash-border text-dash-accent cursor-not-allowed flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-bold !text-dash-text truncate">{task.title}</div>
                        <div className="text-[10px] text-red">Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* High-Value Deals (2/3) / ROI & Revenue Attribution (1/3, condensed) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className={`${CARD_STATIC} xl:col-span-2 overflow-hidden flex flex-col`}>
            <SectionHeader icon={<Target size={14} />} iconColorClass="text-green" title="High-Value Deals" actionLabel="Pipeline" actionHref="/pipelines" quiet />
            <div className="p-3 flex-1">
              {topOpportunities.length === 0 ? (
                <EmptyState icon={<Target size={22} />} title="No open opportunities." compact />
              ) : (
                <div className="space-y-1">
                  {topOpportunities.map((opp, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-dash-surface transition-colors">
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold !text-dash-text truncate">{opp.title}</div>
                        <div className="text-[10px] !text-dash-textMuted truncate">
                          {opp.contacts ? `${opp.contacts.first_name} ${opp.contacts.last_name}` : "Unknown contact"}
                        </div>
                      </div>
                      <div className="text-[13px] font-black text-dash-accent flex-shrink-0">
                        ${Number(opp.value).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {attributionMetrics && (
            <div className={`${CARD_STATIC} overflow-hidden flex flex-col`}>
              <SectionHeader icon={<TrendingUp size={14} />} title="ROI & Attribution" quiet />
              <div className="p-3 flex-1 flex flex-col gap-1">
                {roiTiles.map((tile) => (
                  <div key={tile.label} className="flex items-center gap-3 p-2.5 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-dash-accent/10 text-dash-accent flex items-center justify-center flex-shrink-0">
                      {tile.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] !text-dash-textMuted truncate">{tile.label}</div>
                      <div className="text-[14px] font-black !text-dash-text truncate">{tile.value}</div>
                    </div>
                  </div>
                ))}
                <div className="px-2.5 pt-2 mt-1 border-t border-dash-border">
                  <div className="text-[11px] !text-dash-textMuted mb-1.5">Sequence revenue</div>
                  {Object.values(attributionMetrics.stepRevenue).length === 0 ? (
                    <p className="text-[11px] !text-dash-textMuted italic">No sequence attribution recorded yet</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
                      {Object.values(attributionMetrics.stepRevenue).map((step, idx) => (
                        <div key={idx} className="flex justify-between items-center gap-2 text-[11px]">
                          <span className="font-bold !text-dash-text truncate">{step.workflow_name}</span>
                          <span className="font-black text-dash-accent shrink-0">R{step.revenue.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeDashboardClient;

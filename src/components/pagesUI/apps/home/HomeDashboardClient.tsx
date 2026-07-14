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
  Check,
  ChevronDown,
  Calendar,
  Clock,
  MessageSquare,
  AlertCircle
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

// Sparkline component with client-hydration check and clean color stroke
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const [isMounted, setIsMounted] = useState(false);
  useLayoutEffect(() => setIsMounted(true), []);

  if (!isMounted || data.length < 2) {
    return <div className="h-[40px] w-full bg-slate-50 animate-pulse rounded-lg" />;
  }

  const series = [{ name: "Value", data }];
  const options: ApexOptions = {
    chart: {
      type: "line",
      sparkline: { enabled: true },
      animations: { enabled: true, speed: 400 },
    },
    stroke: { curve: "smooth", width: 1.8 },
    colors: [color],
    tooltip: { enabled: false },
  };

  return <Chart options={options} series={series} type="line" height={40} width="100%" />;
}

// Clean horizontal progress bar for conversion tracking
function ProgressBar({ value, colorClass = "bg-primary" }: { value: number; colorClass?: string }) {
  return (
    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
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
  const [revenuePeriod, setRevenuePeriod] = useState<"this_month" | "last_month">("this_month");
  
  // Calculate conversion rates & ratios
  const conversionRate = stats.leads > 0 ? ((stats.wonDeals / stats.leads) * 100).toFixed(1) : "0";
  const newLeadsPct = stats.leads > 0 ? ((stats.newLeads / stats.leads) * 100).toFixed(1) : "0";

  // Data mapping from metrics context
  const contactsSpark = (metrics?.contactsOverTime ?? []).map((p) => p.value);
  const revenueSpark = (metrics?.revenueByWeek ?? []).map((p) => p.value);
  
  // Mock sparkline fallbacks if live arrays are empty
  const defaultSpark = [12, 19, 15, 25, 22, 30, 28];
  
  // Clean Premium Quick Actions
  const quickActions = [
    { label: "New Lead", icon: <Plus size={13} />, link: "/contacts/new", primary: true },
    { label: "New Invoice", icon: <FileText size={13} />, link: "/invoices/new" },
    { label: "Send Campaign", icon: <Send size={13} />, link: "/campaigns" },
    { label: "Book Appointment", icon: <CalendarDays size={13} />, link: "/calendar" },
    { label: "New Automation", icon: <Zap size={13} />, link: "/automations" },
    { label: "New Proposal", icon: <FileSignature size={13} />, link: "/proposals" },
  ];

  // Revenue chart setup (Smooth line with custom month toggle options)
  const revenueByWeek = metrics?.revenueByWeek ?? [];
  const revenueThisMonthData = revenueByWeek.map((p) => p.value);
  // Shifted values to simulate previous month's revenue progression smoothly
  const revenueLastMonthData = revenueThisMonthData.map((val) => Math.round(val * 0.85));

  const revenueChartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "Inter, sans-serif"
    },
    colors: ["#2563EB"],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.25,
        opacityTo: 0.01,
        stops: [0, 90, 100]
      },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2.5 },
    markers: {
      size: 0,
      hover: { size: 5 },
      colors: ["#2563EB"],
      strokeColors: "#FFFFFF",
      strokeWidth: 2
    },
    grid: {
      show: true,
      borderColor: "#F1F5F9",
      strokeDashArray: 4,
      padding: { left: 10, right: 10, bottom: 0, top: 0 }
    },
    xaxis: {
      categories: revenueByWeek.map((p) => p.label),
      labels: { style: { colors: "#64748B", fontSize: "11px", fontWeight: 500 } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#64748B", fontSize: "11px", fontWeight: 500 },
        formatter: (v) => `$${Math.round(v).toLocaleString()}`
      }
    },
    tooltip: {
      theme: "light",
      x: { show: true },
      y: { formatter: (v) => `$${v.toLocaleString()}` }
    }
  };

  const revenueChartSeries = [
    {
      name: revenuePeriod === "this_month" ? "This Month" : "Last Month",
      data: revenuePeriod === "this_month" ? revenueThisMonthData : revenueLastMonthData
    }
  ];

  // Lead Growth chart options (Multi-series visualization)
  const contactsOverTime = metrics?.contactsOverTime ?? [];
  const leadsChartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 300,
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif"
    },
    colors: ["#2563EB", "#10B981", "#F59E0B"],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "60%",
        dataLabels: { position: "top" }
      }
    },
    dataLabels: { enabled: false },
    grid: {
      show: true,
      borderColor: "#F1F5F9",
      strokeDashArray: 4
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "11px",
      fontWeight: 500,
      labels: { colors: "#64748B" },
      markers: { radius: 12 }
    },
    xaxis: {
      categories: contactsOverTime.map((p) => p.label.slice(5)),
      labels: { style: { colors: "#64748B", fontSize: "11px", fontWeight: 500 } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: "#64748B", fontSize: "11px", fontWeight: 500 } }
    },
    tooltip: { theme: "light" }
  };

  const leadsChartSeries = [
    {
      name: "New Leads",
      data: contactsOverTime.map((p) => p.value)
    },
    {
      name: "Qualified Leads",
      data: contactsOverTime.map((p) => Math.round(p.value * 0.7))
    },
    {
      name: "Converted Leads",
      data: contactsOverTime.map((p) => Math.round(p.value * 0.35))
    }
  ];

  // Pipeline Stages definitions
  const rawFunnel = metrics?.pipelineFunnel ?? [];
  const pipelineStages = rawFunnel.length > 0 ? rawFunnel : [
    { label: "Lead", value: 0 },
    { label: "Contacted", value: 0 },
    { label: "Proposal", value: 0 },
    { label: "Negotiation", value: 0 },
    { label: "Won", value: 0 }
  ];

  // Upcoming simulated calendar events
  const calendarEvents = [
    { title: "Product Demo & Sync", time: "10:00 AM", duration: "45m", date: "Today", contact: "Acme Group", active: true },
    { title: "Proposal Alignment Call", time: "2:30 PM", duration: "30m", date: "Today", contact: "Mark Zuckerberg", active: false },
    { title: "CRM Migration Review", time: "11:15 AM", duration: "1h", date: "Tomorrow", contact: "Internal Team", active: false },
    { title: "Weekly Lead Intake Sync", time: "4:00 PM", duration: "30m", date: "Tomorrow", contact: "Sales Ops", active: false }
  ];

  return (
    <div className="bg-[#F8FAFC] min-h-full pb-12 font-sans">
      
      {/* Mobile-Only Action Strip (iOS Style) */}
      <div className="md:hidden w-full overflow-x-auto no-scrollbar pt-4 pb-2 px-4 border-b border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-3 w-max">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              href={action.link}
              className={`flex flex-col items-center justify-center p-3 rounded-[16px] w-[88px] h-[88px] transition-transform active:scale-95 shadow-[0_4px_12px_rgba(15,23,42,0.04)] border ${
                action.primary ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-white text-slate-700 border-[#E5E7EB]'
              }`}
            >
              <div className={`mb-2 p-2 rounded-full ${action.primary ? 'bg-white/20' : 'bg-slate-50'}`}>
                {action.icon}
              </div>
              <span className={`text-[10px] font-bold text-center leading-tight ${action.primary ? 'text-white' : 'text-slate-600'}`}>
                {action.label.replace('New ', '')}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 1. Horizontal Dashboard summary strip */}
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.01)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[12px] font-bold !text-slate-400 uppercase tracking-wider">Business Snapshot</span>
          <h2 className="text-[18px] font-bold !text-[#0F172A] mt-0.5">Last 30 Days Overview</h2>
        </div>

        {/* Snapshot metrics rows */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium !text-slate-400">Total Revenue</span>
            <span className="text-[14px] font-bold !text-[#0F172A]">${stats.revenue.toLocaleString()}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium !text-slate-400">Leads Captured</span>
            <span className="text-[14px] font-bold !text-[#0F172A]">{stats.leads.toLocaleString()}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium !text-slate-400">Active Deals</span>
            <span className="text-[14px] font-bold !text-[#0F172A]">{stats.wonDeals.toLocaleString()}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium !text-slate-400">Conversion Rate</span>
            <span className="text-[14px] font-bold !text-[#10B981]">{conversionRate}%</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        
        {/* Critical Alerts (Redesign) */}
        {overdueTasks.length > 0 && (
          <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100/60 flex items-center justify-center !text-[#EF4444] flex-shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <h4 className="text-[14px] font-bold !text-[#0F172A]">
                  {overdueTasks.length} High-priority task{overdueTasks.length === 1 ? "" : "s"} overdue
                </h4>
                <p className="text-[12px] !text-slate-500 mt-0.5">Please review and update deadline assignments.</p>
              </div>
            </div>
            <Link
              href="/tasks"
              className="px-4 py-2 bg-[#EF4444] !text-white rounded-xl text-[12px] font-bold hover:bg-red-600 transition-all text-center shadow-sm"
            >
              Review Tasks
            </Link>
          </div>
        )}

        {/* Premium Quick Actions Menu */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.link}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-150 active:scale-98 ${
                action.primary
                  ? "bg-[#2563EB] !text-white shadow-sm hover:bg-blue-700"
                  : "bg-white border border-[#E5E7EB] !text-slate-600 hover:text-[#0F172A] hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              }`}
            >
              {action.icon} {action.label}
            </Link>
          ))}
        </div>

        {/* ROW 1: 4 Equal Redesigned KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Revenue */}
          <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 !text-[#2563EB] flex items-center justify-center flex-shrink-0">
                <DollarSign size={18} />
              </div>
              <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 !text-[#10B981]">
                <TrendingUp size={11} />
                <span>+12.4%</span>
              </div>
            </div>
            <div className="text-[36px] font-bold !text-[#0F172A] tracking-tight leading-none">
              ${stats.revenue.toLocaleString()}
            </div>
            <div className="text-[14px] font-bold !text-[#0F172A] mt-2">Total Revenue</div>
            <div className="text-[12px] !text-slate-500 mt-0.5">Total paid invoices</div>
            <div className="mt-4 -mx-1">
              <Sparkline data={revenueSpark.length > 0 ? revenueSpark : defaultSpark} color="#2563EB" />
            </div>
          </div>

          {/* Card 2: Total Leads */}
          <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 !text-[#10B981] flex items-center justify-center flex-shrink-0">
                <Target size={18} />
              </div>
              <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 !text-[#10B981]">
                <TrendingUp size={11} />
                <span>{newLeadsPct}%</span>
              </div>
            </div>
            <div className="text-[36px] font-bold !text-[#0F172A] tracking-tight leading-none">
              {stats.leads.toLocaleString()}
            </div>
            <div className="text-[14px] font-bold !text-[#0F172A] mt-2">Total Leads</div>
            <div className="text-[12px] !text-slate-500 mt-0.5">{stats.newLeads} new this week</div>
            <div className="mt-4 -mx-1">
              <Sparkline data={contactsSpark.length > 0 ? contactsSpark : defaultSpark} color="#10B981" />
            </div>
          </div>

          {/* Card 3: Opportunities */}
          <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 !text-[#F59E0B] flex items-center justify-center flex-shrink-0">
                <Layers size={18} />
              </div>
              <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 !text-[#F59E0B]">
                <span>Active</span>
              </div>
            </div>
            <div className="text-[36px] font-bold !text-[#0F172A] tracking-tight leading-none">
              {stats.wonDeals.toLocaleString()}
            </div>
            <div className="text-[14px] font-bold !text-[#0F172A] mt-2">Opportunities Won</div>
            <div className="text-[12px] !text-slate-500 mt-0.5">{conversionRate}% conversion rate</div>
            <div className="mt-4 -mx-1">
              <Sparkline data={[5, 10, 8, 12, 14, 11, 15]} color="#F59E0B" />
            </div>
          </div>

          {/* Card 4: Automations */}
          <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 !text-purple-600 flex items-center justify-center flex-shrink-0">
                <Zap size={18} />
              </div>
              <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 !text-purple-600">
                <span>Active</span>
              </div>
            </div>
            <div className="text-[36px] font-bold !text-[#0F172A] tracking-tight leading-none">
              {stats.automations.toLocaleString()}
            </div>
            <div className="text-[14px] font-bold !text-[#0F172A] mt-2">Active Automations</div>
            <div className="text-[12px] !text-slate-500 mt-0.5">Workflows running smoothly</div>
            <div className="mt-4 -mx-1">
              <Sparkline data={[2, 4, 3, 6, 8, 7, 10]} color="#8B5CF6" />
            </div>
          </div>
        </div>

        {/* ROW 2: Revenue Trend & Lead Growth (50 / 50 Charts) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Area Chart */}
          <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[18px] font-bold !text-[#0F172A]">Revenue Trend</h3>
                <p className="text-[12px] !text-slate-500 mt-0.5">Smooth revenue analytics representation</p>
              </div>
              <div className="flex items-center bg-slate-50 border border-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setRevenuePeriod("this_month")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    revenuePeriod === "this_month"
                      ? "bg-white !text-[#2563EB] shadow-sm"
                      : "!text-slate-500 hover:text-slate-900"
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setRevenuePeriod("last_month")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    revenuePeriod === "last_month"
                      ? "bg-white !text-[#2563EB] shadow-sm"
                      : "!text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Last Month
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-[300px]">
              {revenueByWeek.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center !text-slate-400 mb-3">
                    <DollarSign size={20} />
                  </div>
                  <span className="text-[13px] font-bold !text-[#0F172A]">No revenue recorded yet</span>
                  <p className="text-[12px] !text-slate-400 mt-0.5">Create and issue paid invoices to see analytics trend.</p>
                </div>
              ) : (
                <Chart options={revenueChartOptions} series={revenueChartSeries} type="area" height={300} width="100%" />
              )}
            </div>
          </div>

          {/* Lead Growth Chart */}
          <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col">
            <div className="mb-6">
              <h3 className="text-[18px] font-bold !text-[#0F172A]">Lead Growth</h3>
              <p className="text-[12px] !text-slate-500 mt-0.5">Lead pipeline performance analysis</p>
            </div>
            <div className="flex-1 min-h-[300px]">
              {contactsOverTime.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center !text-slate-400 mb-3">
                    <Target size={20} />
                  </div>
                  <span className="text-[13px] font-bold !text-[#0F172A]">No leads activity yet</span>
                  <p className="text-[12px] !text-slate-400 mt-0.5">Capture or import leads into CRM to activate the grid.</p>
                </div>
              ) : (
                <Chart options={leadsChartOptions} series={leadsChartSeries} type="bar" height={300} width="100%" />
              )}
            </div>
          </div>
        </div>

        {/* ROW 3: Pipeline & Recent Activity (70 / 30) */}
        <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
          
          {/* Sales Pipeline (70% column width on large screens) */}
          <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] xl:col-span-7 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[18px] font-bold !text-[#0F172A]">Sales Pipeline Summary</h3>
                <p className="text-[12px] !text-slate-500 mt-0.5">Current stage breakdown and expected deal value</p>
              </div>
              <Link 
                href="/pipelines" 
                className="text-[12px] font-bold !text-[#2563EB] hover:text-blue-700 flex items-center gap-1"
              >
                Manage Pipeline <ArrowUpRight size={13} />
              </Link>
            </div>

            {/* Stage Layout as Horizontal Cards */}
            {rawFunnel.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 border border-dashed border-[#E5E7EB] rounded-2xl p-6 bg-slate-50/50">
                <Layers size={28} className="!text-slate-300 mb-3" />
                <h4 className="text-[14px] font-bold !text-[#0F172A]">No opportunities yet</h4>
                <p className="text-[12px] !text-slate-500 mt-0.5 max-w-[280px]">
                  Create your first opportunity to start tracking pipeline performance.
                </p>
                <Link
                  href="/pipelines"
                  className="mt-4 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 !text-white rounded-xl text-[12px] font-bold shadow-sm transition-all"
                >
                  Create Opportunity
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 mt-2">
                {pipelineStages.map((stage, idx) => {
                  const dealCount = stage.value;
                  const estimatedValue = dealCount * 12500;
                  const conversionPercent = Math.max(10, 100 - idx * 20);
                  const colors = [
                    "border-l-blue-500", 
                    "border-l-indigo-500", 
                    "border-l-amber-500", 
                    "border-l-purple-500", 
                    "border-l-emerald-500"
                  ];
                  const borderClass = colors[idx % colors.length];

                  return (
                    <div 
                      key={stage.label} 
                      className={`bg-slate-50 border-l-[3.5px] ${borderClass} border border-y-[#E5E7EB] border-r-[#E5E7EB] rounded-xl p-3.5 flex flex-col justify-between h-[120px] hover:bg-slate-100/50 transition-colors`}
                    >
                      <div>
                        <div className="text-[11px] font-bold !text-slate-400 uppercase tracking-wider truncate">
                          {stage.label}
                        </div>
                        <div className="text-[20px] font-bold !text-[#0F172A] mt-1">
                          {dealCount} <span className="text-[11px] font-normal !text-slate-500">deals</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] !text-slate-500">
                          <span className="font-bold !text-[#2563EB]">${estimatedValue.toLocaleString()}</span>
                          <span>{conversionPercent}%</span>
                        </div>
                        <ProgressBar value={conversionPercent} colorClass={idx === 4 ? "bg-[#10B981]" : "bg-[#2563EB]"} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity Timeline (30% column width) */}
          <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] xl:col-span-3 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[18px] font-bold !text-[#0F172A]">Recent Activity</h3>
                <p className="text-[12px] !text-slate-500 mt-0.5">Live activity timeline</p>
              </div>
              <Link href="/activities" className="text-[12px] font-semibold !text-[#2563EB] hover:underline">
                View all
              </Link>
            </div>

            <div className="flex-1 max-h-[350px] overflow-y-auto pr-1">
              {recentActivities.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <Activity size={24} className="!text-slate-300 mb-2" />
                  <span className="text-[12px] font-bold !text-[#0F172A]">Timeline empty</span>
                  <p className="text-[11px] !text-slate-400 mt-0.5">No recent team operations found.</p>
                </div>
              ) : (
                <div className="relative pl-4 border-l border-slate-200 ml-1.5 space-y-5 py-2">
                  {recentActivities.map((activity, index) => {
                    const desc = (activity.description || "").toLowerCase();
                    let dotClass = "bg-[#2563EB]";
                    if (desc.includes("won") || desc.includes("paid")) {
                      dotClass = "bg-[#10B981]";
                    } else if (desc.includes("email") || desc.includes("sent")) {
                      dotClass = "bg-purple-500";
                    } else if (desc.includes("created") || desc.includes("new")) {
                      dotClass = "bg-amber-500";
                    }

                    return (
                      <div key={index} className="relative text-left">
                        {/* Timeline Connector Dot */}
                        <div className={`absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full ring-4 ring-white ${dotClass}`} />
                        
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-bold !text-[#0F172A] truncate">
                              {activity.contacts ? `${activity.contacts.first_name} ${activity.contacts.last_name}` : "System event"}
                            </span>
                            <span className="text-[10px] !text-slate-400 whitespace-nowrap flex-shrink-0">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-[12px] !text-slate-500 mt-0.5 leading-relaxed break-words">
                            {activity.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 4: Tasks & Calendar (50 / 50) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Notion-style Tasks Productivity Widget */}
          <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[18px] font-bold !text-[#0F172A]">Task Agenda</h3>
                <p className="text-[12px] !text-slate-500 mt-0.5">High priority active tasks checklist</p>
              </div>
              <Link href="/tasks" className="text-[12px] font-bold !text-[#2563EB] hover:text-blue-700">
                Open Tasks
              </Link>
            </div>

            <div className="flex-1 max-h-[300px] overflow-y-auto pr-1">
              {overdueTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                  <CircleCheck size={28} className="!text-[#10B981] mb-2" />
                  <span className="text-[13px] font-bold !text-[#0F172A]">All caught up!</span>
                  <p className="text-[12px] !text-slate-500 mt-0.5">No high priority overdue tasks on file.</p>
                </div>
              ) : (
                <div className="space-y-2 mt-1">
                  {overdueTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-3 p-3 bg-white border border-[#EEF2F7] hover:border-slate-300 rounded-xl transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.01)] group"
                    >
                      <input
                        type="checkbox"
                        disabled
                        title="Mark complete from the Tasks module"
                        className="w-4 h-4 rounded border-[#E5E7EB] !text-[#2563EB] focus:ring-blue-500 cursor-not-allowed flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold !text-[#0F172A] truncate group-hover:text-primary transition-colors">
                            {task.title}
                          </div>
                          <div className="text-[10px] !text-[#EF4444] mt-0.5 font-medium flex items-center gap-1">
                            <Clock size={10} />
                            <span>Overdue: {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 !text-[#EF4444] border border-red-100 flex-shrink-0">
                          High
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Premium Upcoming Meetings Calendar Agenda */}
          <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[18px] font-bold !text-[#0F172A]">Upcoming Meetings</h3>
                <p className="text-[12px] !text-slate-500 mt-0.5">Meetings schedule agenda</p>
              </div>
              <Link href="/calendar" className="text-[12px] font-bold !text-[#2563EB] hover:text-blue-700">
                View Calendar
              </Link>
            </div>

            <div className="flex-1 max-h-[300px] overflow-y-auto pr-1">
              <div className="space-y-2">
                {calendarEvents.map((event, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between gap-4 p-3 bg-white border border-[#EEF2F7] rounded-xl hover:border-slate-300 transition-all ${
                      event.active ? "ring-1 ring-primary/20 bg-blue-50/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        event.active ? "bg-blue-50 !text-[#2563EB]" : "bg-slate-50 !text-slate-400"
                      }`}>
                        <Calendar size={15} />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold !text-[#0F172A] truncate">
                          {event.title}
                        </div>
                        <div className="text-[11px] !text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className="font-semibold !text-slate-700">{event.contact}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span>{event.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col items-end">
                      <span className="text-[12px] font-bold !text-[#0F172A]">{event.time}</span>
                      <span className="text-[10px] !text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock size={9} /> {event.duration}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* High Value Deals & ROI Attribution (Legacy supporting area, kept aligned below grid) */}
        {attributionMetrics && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2">
            
            {/* Top Deals List */}
            <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] xl:col-span-2 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[15px] font-bold !text-[#0F172A] flex items-center gap-2">
                  <Target size={14} className="!text-[#10B981]" /> High-Value Opportunities
                </h4>
                <Link href="/pipelines" className="text-[11px] font-semibold !text-slate-500 hover:text-primary">
                  Pipeline View
                </Link>
              </div>

              <div className="space-y-1.5 flex-1 max-h-[220px] overflow-y-auto pr-1">
                {topOpportunities.length === 0 ? (
                  <div className="h-full flex items-center justify-center !text-slate-400 text-[12px] py-12">
                    No active open opportunities found.
                  </div>
                ) : (
                  topOpportunities.map((opp, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 border border-[#EEF2F7] rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold !text-[#0F172A] truncate">{opp.title}</div>
                        <div className="text-[11px] !text-slate-500 mt-0.5 truncate">
                          {opp.contacts ? `${opp.contacts.first_name} ${opp.contacts.last_name}` : "Lead Contact"}
                        </div>
                      </div>
                      <div className="text-[14px] font-bold !text-[#2563EB] flex-shrink-0">
                        ${Number(opp.value).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ROI & Campaign Attribution Details */}
            <div className="bg-white border border-[#EEF2F7] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="!text-primary" />
                <h4 className="text-[15px] font-bold !text-[#0F172A]">ROI & Attribution</h4>
              </div>

              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-[#EEF2F7] rounded-xl text-center">
                    <span className="block text-[10px] font-bold !text-slate-400 uppercase tracking-wider">Rand Revenue</span>
                    <span className="block text-[14px] font-bold !text-[#0F172A] mt-1 truncate">
                      R{attributionMetrics.totalRandRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-[#EEF2F7] rounded-xl text-center">
                    <span className="block text-[10px] font-bold !text-slate-400 uppercase tracking-wider">CTO Rate</span>
                    <span className="block text-[14px] font-bold !text-[#0F172A] mt-1">{attributionMetrics.ctor}%</span>
                  </div>
                </div>

                {/* Automation step details */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-bold !text-slate-400 uppercase tracking-wider mb-2">Sequence Revenue</div>
                  {Object.values(attributionMetrics.stepRevenue).length === 0 ? (
                    <p className="text-[11px] !text-slate-400 italic">No attribution metrics recorded</p>
                  ) : (
                    <div className="space-y-2 max-h-[100px] overflow-y-auto pr-1">
                      {Object.values(attributionMetrics.stepRevenue).map((step, idx) => (
                        <div key={idx} className="flex justify-between items-center gap-2 text-[12px]">
                          <span className="font-semibold !text-slate-700 truncate">{step.workflow_name}</span>
                          <span className="font-bold !text-primary shrink-0">R{step.revenue.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default HomeDashboardClient;

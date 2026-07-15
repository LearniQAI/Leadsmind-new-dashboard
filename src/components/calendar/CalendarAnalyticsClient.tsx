'use client';

import React, { useState } from 'react';
import {
 BarChart3,
 Calendar as CalendarIcon,
 Clock,
 Target,
 TrendingUp,
 Zap,
 ArrowUpRight,
 Activity,
 ArrowDownRight,
 UserCheck,
 Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Wrapper from "@/components/layouts/DefaultWrapper";
import { cn } from '@/lib/utils';
import MetaData from "@/hooks/useMetaData";
import { BookingHeatmap } from '@/components/calendar/BookingHeatmap';
import { BookingTrendChart } from '@/components/dashboard/BookingTrendChart';
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import { Tab, Tabs } from '@mui/material';
import Link from 'next/link';

interface CalendarAnalyticsClientProps {
 data: any;
}

export default function CalendarAnalyticsClient({ data }: CalendarAnalyticsClientProps) {
 const [tabValue, setTabValue] = useState(0);

 const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
  setTabValue(newValue);
 };

 // Safe data access
 const monthBookings = data?.monthBookings ?? 0;
 const showUpRate = data?.showUpRate ?? 0;
 const slotAnalytics = data?.slotAnalytics ?? [];
 const dowDistribution = data?.dowDistribution ?? [0, 0, 0, 0, 0, 0, 0];

 return (
  <MetaData pageTitle="Calendar Analytics">
   <Wrapper>
    <div className="p-6">
     <div className="grid grid-cols-12 gap-5">
      {/* Header / Page Title */}
      <div className="col-span-12 mb-[25px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
            <h4 className="text-xl font-bold !text-dash-text mb-1">Scheduling dynamics</h4>
            <p className="text-[11px] font-medium !text-dash-textMuted">Neural intelligence & cross-node analysis</p>
           </div>
           <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold px-4 py-1.5 rounded-full">Live Engine</Badge>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Zap size={14} />
            </div>
           </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="col-span-12 mb-[20px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
         <KPICard
          title="Monthly Throughput"
          value={monthBookings}
          percentage="+14.5%"
          isIncrease={true}
          icon={CalendarIcon}
          description="Total sessions generated"
         />
         <KPICard
          title="Retention Matrix"
          value={`${showUpRate.toFixed(1)}%`}
          percentage="+2.1%"
          isIncrease={true}
          icon={UserCheck}
          description="Attendance consistency"
         />
         <KPICard
          title="Yield Efficiency"
          value="12.4%"
          percentage="+0.8%"
          isIncrease={true}
          icon={TrendingUp}
          description="Lead-to-deal conversion"
         />
         <KPICard
          title="Velocity Window"
          value="4.2d"
          percentage="-1.2d"
          isIncrease={false}
          icon={Clock}
          description="Avg. lead duration"
         />
      </div>

      {/* Performance Overview (Chart Section) */}
      <div className="col-span-12 lg:col-span-8 mb-[20px]">
        <div className="bg-white border border-dash-border rounded-2xl p-6 h-full shadow-sm">
           <div className="flex flex-wrap gap-[10px] items-center justify-between mb-[25px]">
            <h5 className="text-base font-bold !text-dash-text flex items-center gap-3">
              <Activity size={18} className="text-primary" /> Performance velocity
            </h5>
            <div>
              <Tabs value={tabValue} onChange={handleTabChange}>
               <Tab label="90D" />
               <Tab label="30D" />
               <Tab label="7D" />
              </Tabs>
            </div>
           </div>
           <div>
            <div className="flex justify-between items-end flex-wrap mb-10">
              <div className="flex flex-wrap gap-[30px]">
               <div>
                 <h4 className="text-2xl font-bold !text-dash-text mb-[5px]">{monthBookings}</h4>
                 <span className="text-[10px] font-bold !text-dash-textMuted">Total bookings <span className="text-green">12.4%</span></span>
               </div>
               <div>
                 <h4 className="text-2xl font-bold !text-dash-text mb-[5px]">{showUpRate.toFixed(1)}%</h4>
                 <span className="text-[10px] font-bold !text-dash-textMuted">Show-up rate <span className="text-green">2.1%</span></span>
               </div>
              </div>
              <div>
               <Link href="#" className="flex items-center !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"><Download size={12} /><span className="text-[10px] font-bold ms-2">Export data</span></Link>
              </div>
            </div>
            <div className="h-[300px]">
              <BookingTrendChart />
            </div>
           </div>
        </div>
      </div>

      {/* Daily Load Section */}
      <div className="col-span-12 lg:col-span-4 mb-[20px]">
        <div className="bg-white border border-dash-border rounded-2xl p-6 h-full shadow-sm">
         <div className="flex items-center justify-between mb-[25px]">
           <h5 className="text-base font-bold !text-dash-text">Daily load</h5>
           <CustomDropdown items={dropdownItems} />
         </div>
         <div className="space-y-6 mt-8">
           {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
            const count = dowDistribution[i] || 0;
            const max = Math.max(...dowDistribution, 1);
            const percent = (count / max) * 100;

            return (
             <div key={day} className="group cursor-default">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold !text-dash-textMuted opacity-70 group-hover:opacity-100 transition-opacity motion-reduce:transition-none">{day}</span>
                <div className="flex items-center gap-2">
                 <span className="text-base font-bold !text-dash-text">{count}</span>
                 <span className="text-[9px] font-bold !text-dash-textMuted">Events</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                <div
                 className="h-full bg-primary rounded-full transition-all motion-reduce:transition-none duration-1000"
                 style={{ width: `${percent}%` }}
                />
              </div>
             </div>
            )
           })}
         </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="col-span-12 xxl:col-span-8 mb-[20px]">
        <div className="bg-white border border-dash-border rounded-2xl p-6 h-full shadow-sm">
         <div className="flex items-center justify-between mb-[25px]">
           <h5 className="text-base font-bold !text-dash-text">Slot density heatmap</h5>
           <Badge className="bg-primary/10 text-primary border-none text-[9px] font-bold px-4 py-1.5 rounded-full">Neural Sync</Badge>
         </div>
         <div className="mt-8">
           <BookingHeatmap data={slotAnalytics} />
         </div>
        </div>
      </div>

      {/* Attribution Matrix */}
      <div className="col-span-12 xxl:col-span-4 mb-[20px]">
        <div className="bg-white border border-dash-border rounded-2xl p-6 h-full shadow-sm">
         <div className="flex items-center justify-between mb-[25px]">
           <h5 className="text-base font-bold !text-dash-text">Conversion matrix</h5>
           <CustomDropdown items={dropdownItems} />
         </div>
         <div className="space-y-4 mt-8">
           <SourceItem label="E-mail Campaign #4" value="45%" color="#1359FF" />
           <SourceItem label="SMS Follow-up" value="28%" color="#f59e0b" />
           <SourceItem label="Organic (Direct)" value="15%" color="#10b981" />
           <SourceItem label="Social/Referral" value="12%" color="#3b82f6" />
         </div>

         <div className="mt-10 p-6 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 text-primary/10 rotate-12 group-hover:rotate-0 motion-reduce:group-hover:rotate-12 transition-transform motion-reduce:transition-none duration-1000">
            <TrendingUp size={48} />
           </div>
           <div className="relative z-10">
            <h6 className="text-[11px] font-bold text-primary mb-2">Autonomous insight</h6>
            <p className="text-[12px] font-medium !text-dash-textMuted leading-relaxed">
              Neural engine detected <span className="text-primary font-bold">14.2% yield lift</span> by shifting Tuesday nodes.
            </p>
           </div>
         </div>
        </div>
      </div>
     </div>
    </div>
   </Wrapper>
  </MetaData>
 );
}

function KPICard({ title, value, percentage, isIncrease, icon: Icon, description }: any) {
 return (
  <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
    <div className="flex justify-between mb-[10px]">
     <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
       <Icon size={16} />
     </div>
     <CustomDropdown items={dropdownItems} />
    </div>
    <h6 className="text-[10px] font-bold !text-dash-textMuted mb-[10px]">{title}</h6>
    <h4 className="text-2xl font-bold !text-dash-text mb-[10px]">{value}</h4>
    <span className="text-xs flex items-center">
     <span className={cn("flex items-center gap-1 font-bold", isIncrease ? "text-green" : "text-red")}>
       {isIncrease ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {percentage}
     </span>
     <span className="ms-2 !text-dash-textMuted opacity-70">than last month</span>
    </span>
  </div>
 )
}

function SourceItem({ label, value, color = '#1359FF' }: any) {
 return (
  <div className="flex items-center justify-between p-4 rounded-xl bg-bgBody border border-border hover:border-primary/30 transition-all motion-reduce:transition-none group cursor-default">
    <div className="flex items-center gap-4">
     <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
     <span className="text-xs font-bold text-body opacity-70 group-hover:opacity-100 transition-opacity motion-reduce:transition-none">{label}</span>
    </div>
    <span className="text-sm font-bold text-heading">{value}</span>
  </div>
 )
}

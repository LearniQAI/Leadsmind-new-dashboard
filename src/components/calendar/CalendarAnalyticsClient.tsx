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
 ArrowDownRight
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
    <div className="app__slide-wrapper">
     <div className="grid grid-cols-12 gap-x-5">
      {/* Header / Page Title */}
      <div className="col-span-12 mb-[25px]">
        <div className="card__wrapper style_two !mb-0 !p-0">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
            <h4 className="card__title mb-1 uppercase tracking-tighter">Scheduling Dynamics</h4>
            <p className="text-[11px] font-medium text-body dark:text-body-dark opacity-50 uppercase tracking-widest">Neural Intelligence & Cross-Node Analysis</p>
           </div>
           <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">Live Engine</Badge>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Zap size={14} />
            </div>
           </div>
         </div>
        </div>
      </div>

      {/* KPI Section - Manez card__box style */}
      <div className="col-span-12 mb-[20px]">
        <div className="card__box">
         <KPICard 
          title="Monthly Throughput" 
          value={monthBookings} 
          percentage="+14.5%"
          isIncrease={true}
          iconClass="fa-light fa-calendar-star"
          description="Total sessions generated"
         />
         <KPICard 
          title="Retention Matrix" 
          value={`${showUpRate.toFixed(1)}%`} 
          percentage="+2.1%"
          isIncrease={true}
          iconClass="fa-light fa-user-check"
          description="Attendance consistency"
         />
         <KPICard 
          title="Yield Efficiency" 
          value="12.4%" 
          percentage="+0.8%"
          isIncrease={true}
          iconClass="fa-light fa-chart-line-up"
          description="Lead-to-deal conversion"
         />
         <KPICard 
          title="Velocity Window" 
          value="4.2d" 
          percentage="-1.2d"
          isIncrease={false}
          iconClass="fa-light fa-clock-three"
          description="Avg. lead duration"
         />
        </div>
      </div>

      {/* Performance Overview (Chart Section) */}
      <div className="col-span-12 lg:col-span-8 mb-[20px]">
        <div className="chart-common h-full">
         <div className="card__wrapper h-full">
           <div className="card__title-wrap flex flex-wrap gap-[10px] items-center justify-between mb-[25px]">
            <h5 className="card__heading-title flex items-center gap-3">
              <Activity size={18} className="text-primary" /> Performance Velocity
            </h5>
            <div className="card__tab">
              <Tabs value={tabValue} onChange={handleTabChange}>
               <Tab label="90D" />
               <Tab label="30D" />
               <Tab label="7D" />
              </Tabs>
            </div>
           </div>
           <div className="card__content">
            <div className="card__meta flex justify-between items-end flex-wrap mb-10">
              <div className="card__meta-box flex flex-wrap gap-[30px]">
               <div className="card__meta-single-box">
                 <h4 className="card__title mb-[5px]">{monthBookings}</h4>
                 <span className="card__desc dot uppercase text-[10px] font-black tracking-widest opacity-40">Total Bookings <span className="price-up">12.4%</span></span>
               </div>
               <div className="card__meta-single-box">
                 <h4 className="card__title mb-[5px]">{showUpRate.toFixed(1)}%</h4>
                 <span className="card__desc dot uppercase text-[10px] font-black tracking-widest opacity-40">Show-up Rate <span className="price-up">2.1%</span></span>
               </div>
              </div>
              <div className="card__link">
               <Link href="#"><i className="fa-light fa-circle-arrow-down"></i><span className="text-[10px] font-black uppercase tracking-widest ms-2">Export Data</span></Link>
              </div>
            </div>
            <div className="card__line-chart h-[300px]">
              <BookingTrendChart />
            </div>
           </div>
         </div>
        </div>
      </div>

      {/* Daily Load Section */}
      <div className="col-span-12 lg:col-span-4 mb-[20px]">
        <div className="card__wrapper h-full">
         <div className="card__title-wrap flex items-center justify-between mb-[25px]">
           <h5 className="card__heading-title">Daily Load</h5>
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
                <span className="text-[10px] font-black text-body dark:text-body-dark opacity-40 uppercase tracking-[0.2em] group-hover:opacity-100 transition-opacity">{day}</span>
                <div className="flex items-center gap-2">
                 <span className="text-base font-black text-heading dark:text-heading-dark tracking-tighter">{count}</span>
                 <span className="text-[9px] font-bold text-placeholder dark:text-placeholder-dark uppercase">Events</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                <div 
                 className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(19,89,255,0.4)]"
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
        <div className="card__wrapper h-full">
         <div className="card__title-wrap flex items-center justify-between mb-[25px]">
           <h5 className="card__heading-title">Slot Density Heatmap</h5>
           <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">Neural Sync</Badge>
         </div>
         <div className="mt-8">
           <BookingHeatmap data={slotAnalytics} />
         </div>
        </div>
      </div>

      {/* Attribution Matrix */}
      <div className="col-span-12 xxl:col-span-4 mb-[20px]">
        <div className="card__wrapper h-full">
         <div className="card__title-wrap flex items-center justify-between mb-[25px]">
           <h5 className="card__heading-title">Conversion Matrix</h5>
           <CustomDropdown items={dropdownItems} />
         </div>
         <div className="space-y-4 mt-8">
           <SourceItem label="E-mail Campaign #4" value="45%" color="var(--primary)" />
           <SourceItem label="SMS Follow-up" value="28%" color="#fdab3d" />
           <SourceItem label="Organic (Direct)" value="#10b981" />
           <SourceItem label="Social/Referral" value="12%" color="#3b82f6" />
         </div>
         
         <div className="mt-10 p-6 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 text-primary/10 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
            <TrendingUp size={48} />
           </div>
           <div className="relative z-10">
            <h6 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-2">Autonomous Insight</h6>
            <p className="text-[12px] font-medium text-body dark:text-body-dark leading-relaxed">
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

function KPICard({ title, value, percentage, isIncrease, iconClass, description }: any) {
 return (
  <div className="card__wrapper">
    <div className="card__icon-box flex justify-between mb-[10px]">
     <div className="card__icon">
       <span><i className={iconClass}></i></span>
     </div>
     <CustomDropdown items={dropdownItems} />
    </div>
    <h6 className="card__sub-title mb-[10px] uppercase text-[10px] font-black tracking-widest opacity-60">{title}</h6>
    <h4 className="card__title mb-[10px] font-black tracking-tighter">{value}</h4>
    <span className="card__desc style_two">
     <span className={isIncrease ? "price-increase" : "price-decrease"}>
       <i className={`fa-light ${isIncrease ? "fa-arrow-up" : "fa-arrow-down"}`}></i> {percentage}
     </span>
     <span className="ms-2 opacity-30">than last month</span>
    </span>
  </div>
 )
}

function SourceItem({ label, value, color = 'var(--primary)' }: any) {
 return (
  <div className="flex items-center justify-between p-4 rounded-xl bg-bgBody dark:bg-bgBody-dark border border-border dark:border-border-dark hover:border-primary/30 transition-all group cursor-default">
    <div className="flex items-center gap-4">
     <div className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: color, color }} />
     <span className="text-xs font-black text-body dark:text-body-dark opacity-60 uppercase tracking-tight group-hover:opacity-100 transition-opacity">{label}</span>
    </div>
    <span className="text-sm font-black text-heading dark:text-heading-dark tracking-tighter">{value}</span>
  </div>
 )
}

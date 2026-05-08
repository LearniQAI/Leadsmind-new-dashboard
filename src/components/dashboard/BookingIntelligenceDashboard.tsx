'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, AlertTriangle, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingTrendChart } from '@/components/dashboard/BookingTrendChart';
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';

interface BookingAnalytic {
  slot_day_of_week: number;
  slot_hour: number;
  total_bookings: number;
  show_up_count: number;
  no_show_count: number;
  converted_to_deal_count: number;
  show_up_rate: number;
  conversion_rate: number;
}

interface BookingIntelligenceDashboardProps {
  analytics: BookingAnalytic[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function BookingIntelligenceDashboard({ analytics }: BookingIntelligenceDashboardProps) {
  
  const stats = useMemo(() => {
    if (!analytics.length) return null;

    // Best Day by Show-up Rate
    const dayStats = analytics.reduce((acc, curr) => {
      acc[curr.slot_day_of_week] = acc[curr.slot_day_of_week] || { total: 0, shows: 0 };
      acc[curr.slot_day_of_week].total += curr.total_bookings;
      acc[curr.slot_day_of_week].shows += curr.show_up_count;
      return acc;
    }, {} as Record<number, { total: number, shows: number }>);

    let bestDay = 0;
    let maxShowRate = -1;
    Object.entries(dayStats).forEach(([day, stat]) => {
      const rate = stat.total > 0 ? stat.shows / stat.total : 0;
      if (rate > maxShowRate) {
        maxShowRate = rate;
        bestDay = parseInt(day);
      }
    });

    // Best Hour by Conversion Rate
    const hourStats = analytics.reduce((acc, curr) => {
      acc[curr.slot_hour] = acc[curr.slot_hour] || { total: 0, conversions: 0 };
      acc[curr.slot_hour].total += curr.total_bookings;
      acc[curr.slot_hour].conversions += curr.converted_to_deal_count;
      return acc;
    }, {} as Record<number, { total: number, conversions: number }>);

    let bestHour = 0;
    let maxConvRate = -1;
    Object.entries(hourStats).forEach(([hour, stat]) => {
      const rate = stat.total > 0 ? stat.conversions / stat.total : 0;
      if (rate > maxConvRate) {
        maxConvRate = rate;
        bestHour = parseInt(hour);
      }
    });

    // High No-Show Risk (Top 3 slots)
    const riskSlots = [...analytics]
      .filter(a => a.total_bookings >= 3) 
      .sort((a, b) => {
          const aRate = a.total_bookings > 0 ? a.no_show_count / a.total_bookings : 0;
          const bRate = b.total_bookings > 0 ? b.no_show_count / b.total_bookings : 0;
          return bRate - aRate;
      })
      .slice(0, 3);

    return {
      bestDay: DAYS[bestDay],
      bestDayRate: Math.round(maxShowRate * 100),
      bestHour: `${bestHour % 12 || 12}:00 ${bestHour >= 12 ? 'PM' : 'AM'}`,
      bestHourRate: Math.round(maxConvRate * 100),
      riskSlots: riskSlots.map(s => ({
          day: DAYS[s.slot_day_of_week],
          hour: `${s.slot_hour % 12 || 12}:00 ${s.slot_hour >= 12 ? 'PM' : 'AM'}`,
          rate: Math.round((s.no_show_count / s.total_bookings) * 100)
      }))
    };
  }, [analytics]);

  if (!stats) {
    return (
      <div className="card__wrapper py-16 text-center border border-dashed border-border dark:border-border-dark">
        <TrendingUp className="h-12 w-12 text-placeholder dark:text-placeholder-dark mx-auto mb-6 opacity-30" />
        <h5 className="card__heading-title uppercase italic mb-2">Insufficient Data Stream</h5>
        <p className="text-placeholder dark:text-placeholder-dark text-xs italic max-w-xs mx-auto">Initialize booking nodes and collect session data to enable neural intelligence tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card__box">
        {/* Best Day Card */}
        <div className="card__wrapper group overflow-hidden">
          <div className="card__icon-box flex justify-between mb-[10px]">
             <div className="card__icon">
                <span><i className="fa-light fa-calendar-check"></i></span>
             </div>
             <CustomDropdown items={dropdownItems} />
          </div>
          <h6 className="card__sub-title mb-[10px] uppercase text-[10px] font-black tracking-widest opacity-60">Peak Attendance Node</h6>
          <h4 className="card__title mb-[10px] italic font-black tracking-tighter">{stats.bestDay}</h4>
          <span className="card__desc style_two">
             <span className="price-increase"><i className="fa-light fa-arrow-up"></i> {stats.bestDayRate}%</span> Return Rate
          </span>
        </div>

        {/* Best Hour Card */}
        <div className="card__wrapper group overflow-hidden">
          <div className="card__icon-box flex justify-between mb-[10px]">
             <div className="card__icon">
                <span><i className="fa-light fa-clock-three"></i></span>
             </div>
             <CustomDropdown items={dropdownItems} />
          </div>
          <h6 className="card__sub-title mb-[10px] uppercase text-[10px] font-black tracking-widest opacity-60">High-Yield Window</h6>
          <h4 className="card__title mb-[10px] italic font-black tracking-tighter">{stats.bestHour}</h4>
          <span className="card__desc style_two">
             <span className="price-increase"><i className="fa-light fa-arrow-up"></i> {stats.bestHourRate}%</span> Conversion
          </span>
        </div>

        {/* No-Show Risk Card */}
        <div className="card__wrapper group overflow-hidden">
          <div className="card__icon-box flex justify-between mb-[10px]">
             <div className="card__icon">
                <span><i className="fa-light fa-triangle-exclamation text-rose-500"></i></span>
             </div>
             <CustomDropdown items={dropdownItems} />
          </div>
          <h6 className="card__sub-title mb-[10px] uppercase text-[10px] font-black tracking-widest opacity-60">Entropy Risk Factor</h6>
          <div className="space-y-2 mt-4">
              {stats.riskSlots.map((slot, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-bgBody dark:bg-bgBody-dark border border-border dark:border-border-dark group/slot hover:bg-rose-500/5 transition-all">
                   <span className="text-[9px] font-black text-body dark:text-body-dark opacity-60 uppercase italic tracking-tight group-hover/slot:opacity-100 transition-opacity">{slot.day} {slot.hour}</span>
                   <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-rose-500" />
                      <span className="text-[10px] font-black text-rose-500 italic">{slot.rate}%</span>
                   </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 90 Day Trend Comparison - Matching SalesOverview pattern */}
      <div className="chart-common">
         <div className="card__wrapper style_two card-tab-wrapper !p-0 !bg-transparent !border-none !shadow-none">
            <div className="card__title-wrap flex flex-wrap gap-[10px] items-center justify-between mb-[25px]">
               <h5 className="card__heading-title flex items-center gap-3">
                  <TrendingUp size={18} className="text-primary" /> Throughput Velocity
               </h5>
               <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">Live Optimization</span>
               </div>
            </div>
            <div className="card__content">
               <div className="card__line-chart h-[250px]">
                  <BookingTrendChart />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

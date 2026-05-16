'use client';

import React from 'react';
import { Calendar, Clock, TrendingUp, DollarSign } from 'lucide-react';
import { differenceInMinutes, parseISO } from 'date-fns';

interface CalendarStatsProps {
  appointments: any[];
}

export default function CalendarStats({ appointments }: CalendarStatsProps) {
  // 1. Total Bookings
  const totalBookings = appointments.length;

  // 2. Completion Rate (Count scheduled vs completed/showed_up)
  const completedCount = appointments.filter(a => a.status === 'showed_up' || a.status === 'completed').length;
  const completionRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 100;

  // 3. Average Duration
  const totalDuration = appointments.reduce((acc, appt) => {
    const start = parseISO(appt.start_time);
    const end = parseISO(appt.end_time);
    return acc + differenceInMinutes(end, start);
  }, 0);
  const avgDuration = totalBookings > 0 ? Math.round(totalDuration / totalBookings) : 0;

  // 4. Revenue Generated
  const totalRevenue = appointments.reduce((acc, appt) => {
    const price = appt.calendar?.price || 0;
    return acc + Number(price);
  }, 0);

  const stats = [
    { 
      label: 'Total Bookings', 
      value: totalBookings.toString(), 
      trend: '+0%', 
      icon: Calendar, 
      color: 'var(--accent)' 
    },
    { 
      label: 'Completion Rate', 
      value: `${completionRate}%`, 
      trend: 'Neutral', 
      icon: TrendingUp, 
      color: 'var(--green)' 
    },
    { 
      label: 'Avg. Duration', 
      value: `${avgDuration}m`, 
      trend: 'Neutral', 
      icon: Clock, 
      color: 'var(--purple)' 
    },
    { 
      label: 'Revenue Generated', 
      value: `$${totalRevenue.toLocaleString()}`, 
      trend: '+0%', 
      icon: DollarSign, 
      color: 'var(--amber)' 
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[20px]">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div 
            key={stat.label}
            className="relative bg-[var(--card)] border border-[var(--bdr)] rounded-[var(--r12)] p-5 overflow-hidden group hover:bg-[var(--card-hover)] hover:border-[var(--bdrh)] transition-all"
          >
            {/* Top Accent Bar */}
            <div 
              className="absolute top-0 left-0 right-0 h-[2px]" 
              style={{ backgroundColor: stat.color }}
            />
            
            <div className="flex items-start justify-between mb-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `rgba(${stat.color === 'var(--accent)' ? '37, 99, 235' : stat.color === 'var(--green)' ? '16, 185, 129' : stat.color === 'var(--purple)' ? '139, 92, 246' : '245, 158, 11'}, 0.14)` }}
              >
                <Icon size={18} style={{ color: stat.color }} />
              </div>
              <div className={cn(
                "text-[11px] font-bold flex items-center gap-1",
                stat.trend.startsWith('+') ? "text-[var(--green)]" : "text-[var(--t4)]"
              )}>
                {stat.trend}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[26px] font-bold font-['Space_Grotesk'] text-[var(--t1)]">
                {stat.value}
              </div>
              <div className="text-[12px] font-medium text-[var(--t3)] uppercase tracking-wider font-['DM_Sans']">
                {stat.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

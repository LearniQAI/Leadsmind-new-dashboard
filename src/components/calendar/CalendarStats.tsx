'use client';

import React from 'react';
import { Calendar, Clock, TrendingUp, DollarSign } from 'lucide-react';
import { differenceInMinutes, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

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
    { label: 'Total bookings', value: totalBookings.toString(), icon: Calendar, color: '#1359FF', rgb: '19, 89, 255' },
    { label: 'Completion rate', value: `${completionRate}%`, icon: TrendingUp, color: '#10b981', rgb: '16, 185, 129' },
    { label: 'Avg. duration', value: `${avgDuration}m`, icon: Clock, color: '#8b5cf6', rgb: '139, 92, 246' },
    { label: 'Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: '#f59e0b', rgb: '245, 158, 11' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              'relative bg-white border border-dash-border rounded-xl p-5 overflow-hidden shadow-sm',
              'hover:shadow-md transition-shadow duration-200 motion-reduce:transition-none'
            )}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `rgba(${stat.rgb}, 0.12)` }}>
              <Icon size={18} strokeWidth={2} style={{ color: stat.color }} />
            </div>
            <div className="text-[26px] font-bold font-space !text-dash-text leading-none mb-1.5">{stat.value}</div>
            <div className="text-[12px] font-medium !text-dash-textMuted">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}

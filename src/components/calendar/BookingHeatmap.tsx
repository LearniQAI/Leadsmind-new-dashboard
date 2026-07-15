'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapProps {
 data: any[]; // booking_slot_analytics data
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function BookingHeatmap({ data }: HeatmapProps) {
 // Map data to 7x24 matrix
 const matrix = Array(7).fill(0).map(() => Array(24).fill(0));
 
 data.forEach((item: any) => {
  if (item.slot_day_of_week < 7 && item.slot_hour < 24) {
   matrix[item.slot_day_of_week][item.slot_hour] = item.total_bookings;
  }
 });

 const maxDensity = Math.max(...matrix.flat(), 1);

 return (
  <TooltipProvider delayDuration={0}>
   <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
    <div className="min-w-[800px]">
     <div className="flex">
      {/* Hour Labels Column */}
      <div className="w-12 flex-shrink-0" />
      <div className="flex flex-1 justify-between mb-4 px-2">
       {HOURS.map(h => (
        <span key={h} className="text-[8px] font-black text-body dark:text-body-dark opacity-10 uppercase tracking-tighter w-full text-center">
         {h % 6 === 0 ? `${h}h` : ''}
        </span>
       ))}
      </div>
     </div>

     {DAYS.map((day, dIdx) => (
      <div key={day} className="flex items-center gap-2 mb-1">
        <span className="w-12 text-[10px] font-black text-body dark:text-body-dark opacity-20 uppercase tracking-widest">{day}</span>
        <div className="flex flex-1 gap-1">
         {HOURS.map((h) => {
           const intensity = matrix[dIdx][h] / maxDensity;
           const count = matrix[dIdx][h];
           
           return (
            <Tooltip key={h}>
             <TooltipTrigger asChild>
                <div 
                 className={cn(
                  "flex-1 h-6 rounded-md transition-all duration-300 border border-border/10 dark:border-white/5",
                  count === 0 ? "bg-bgBody dark:bg-white/[0.04]" : "ring-1 ring-primary/10"
                 )}
                 style={{ 
                  backgroundColor: count > 0 ? `rgba(19, 89, 255, ${0.15 + intensity * 0.85})` : undefined,
                  boxShadow: count > 0 ? `0 0 10px rgba(19, 89, 255, ${intensity * 0.4})` : 'none'
                 }}
                />
             </TooltipTrigger>
             <TooltipContent className="bg-dash-text text-white border-none text-[10px] font-bold py-1 px-2">
               {day} at {h}:00 — {count} Bookings
             </TooltipContent>
            </Tooltip>
           )
         })}
        </div>
      </div>
     ))}

     <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border dark:border-white/5">
       <span className="text-[10px] font-black text-body dark:text-body-dark opacity-10 uppercase tracking-widest">Quiet</span>
       <div className="flex gap-1">
        {[0.1, 0.3, 0.5, 0.7, 1].map(v => (
          <div key={v} className="h-2 w-4 rounded-sm" style={{ backgroundColor: `rgba(19, 89, 255, ${v})` }} />
        ))}
       </div>
       <span className="text-[10px] font-black text-primary uppercase tracking-widest">Peak Intensity</span>
     </div>
    </div>
   </div>
  </TooltipProvider>
 );
}

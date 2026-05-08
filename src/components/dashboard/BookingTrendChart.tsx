'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function BookingTrendChart() {
  // Mock trend data for 90 days representation
  const data = [45, 52, 48, 70, 65, 85, 78, 92, 88];
  
  return (
    <div className="w-full h-full flex flex-col justify-end">
      <div className="flex items-end justify-between h-[120px] gap-2 px-2">
        {data.map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center group relative">
            {/* Tooltip */}
            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#6c47ff] text-white text-[10px] font-bold px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-30">
               {val}% Conversion
            </div>
            {/* Bar */}
            <div 
              className={cn(
                "w-full rounded-t-lg transition-all duration-700 relative",
                i === data.length - 1 ? "bg-linear-to-t from-[#6c47ff] to-[#8b5cf6] shadow-[0_0_20px_rgba(108,71,255,0.4)]" : "bg-white/5 group-hover:bg-white/10"
              )}
              style={{ height: `${val}%` }}
            >
               {i === data.length - 1 && (
                 <div className="absolute inset-x-0 -top-2 h-1 bg-white/40 rounded-full blur-[2px]" />
               )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Labels */}
      <div className="flex justify-between mt-4 px-2">
         <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">90 Days Ago</span>
         <span className="text-[9px] font-black text-[#6c47ff] uppercase tracking-[0.2em]">Current Peak</span>
      </div>
    </div>
  );
}

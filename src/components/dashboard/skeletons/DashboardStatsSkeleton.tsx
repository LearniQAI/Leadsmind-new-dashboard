'use client';

import React from 'react';

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-2">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="stat-card !border-white/5 bg-[#080f28]/40 select-none">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] animate-pulse shrink-0 shadow-none border border-transparent" />
            <div className="h-4 w-12 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          </div>
          <div className="h-7 w-24 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent mb-2" />
          <div className="h-4 w-32 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent mb-2" />
          <div className="h-3 w-40 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
        </div>
      ))}
    </div>
  );
}

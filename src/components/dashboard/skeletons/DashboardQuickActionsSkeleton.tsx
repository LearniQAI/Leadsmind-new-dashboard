'use client';

import React from 'react';

export function DashboardQuickActionsSkeleton() {
  return (
    <div className="px-6 mb-6">
      <div className="p-5 rounded-2xl bg-[#080f28]/40 border border-white/5">
        <div className="h-4 w-28 rounded bg-white/[0.04] animate-pulse mb-4 shadow-none border border-transparent" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-10 rounded-xl bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          ))}
        </div>
      </div>
    </div>
  );
}

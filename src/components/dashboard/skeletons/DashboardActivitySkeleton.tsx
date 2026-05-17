'use client';

import React from 'react';

export function DashboardActivitySkeleton() {
  return (
    <div className="card__wrapper !p-0 overflow-hidden flex flex-col bg-[#080f28]/40 border border-white/5">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-32 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          <div className="h-3 w-44 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
        </div>
        <div className="h-8 w-24 rounded-xl bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
      </div>
      <div className="p-4 flex-1 space-y-2.5">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-white/[0.04] animate-pulse shrink-0 shadow-none border border-transparent" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                <div className="h-3 w-20 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              </div>
              <div className="h-4 w-40 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              <div className="h-3.5 w-60 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] animate-pulse shrink-0 hidden sm:block shadow-none border border-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import React from 'react';

export function DashboardDealsSkeleton() {
  return (
    <div className="card__wrapper !p-0 overflow-hidden flex flex-col bg-dash-surface border border-dash-border">
      <div className="flex items-center justify-between px-5 py-4 border-b border-dash-border">
        <div className="h-4 w-28 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
        <div className="h-3 w-16 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
      </div>

      <div className="p-5 flex-1 space-y-5">
        {/* Deal rows */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b border-dash-border">
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
                <div className="h-3 w-24 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
              </div>
              <div className="space-y-1.5 text-right flex flex-col items-end">
                <div className="h-4.5 w-16 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
                <div className="h-3 w-10 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
              </div>
            </div>
          ))}
        </div>

        {/* Goal skeleton */}
        <div className="mt-8 p-5 rounded-2xl bg-dash-bg border border-dash-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
              <div className="h-4.5 w-20 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
            </div>
            <div className="space-y-1.5 text-right flex flex-col items-end">
              <div className="h-3 w-16 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
              <div className="h-4.5 w-12 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
            </div>
          </div>
          <div className="h-2.5 w-full bg-dash-border rounded-full overflow-hidden p-[2px] border border-dash-border animate-pulse shadow-none" />
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-32 rounded bg-dash-border animate-pulse shadow-none border border-transparent" />
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full bg-dash-border border border-dash-bg animate-pulse shadow-none" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

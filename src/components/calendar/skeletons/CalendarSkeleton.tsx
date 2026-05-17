'use client';

import React from 'react';

export function CalendarSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 select-none space-y-6">
      {/* 1. Header Section Skeleton */}
      <div className="flex justify-between items-center py-4">
        <div className="space-y-2">
          <div className="h-9 w-48 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          <div className="h-3.5 w-64 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
        </div>
        <div className="h-11 w-36 rounded-xl bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
      </div>

      {/* 2. Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 shadow-none">
            <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-8 w-24 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-2.5 w-32 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>

      {/* 3. Toolbar Section Skeleton */}
      <div className="flex justify-between items-center py-4 bg-white/[0.01] border-y border-white/5 px-4 rounded-xl">
        <div className="h-9 w-40 rounded-lg bg-white/[0.04] animate-pulse shadow-none" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-9 w-16 rounded-lg bg-white/[0.04] animate-pulse shadow-none" />
          ))}
        </div>
      </div>

      {/* 4. Month Day Grid Skeleton */}
      <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden shadow-none">
        {/* Days of Week Header */}
        {Array.from({ length: 7 }).map((_, dIdx) => (
          <div key={dIdx} className="h-10 bg-white/[0.03] flex items-center justify-center border-b border-white/5">
            <div className="h-3.5 w-10 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}

        {/* 35 Calendar Cells */}
        {Array.from({ length: 35 }).map((_, cIdx) => (
          <div key={cIdx} className="h-28 bg-[#0B132C]/60 p-3 flex flex-col justify-between border-r border-b border-white/[0.03]">
            <div className="flex justify-end">
              <div className="h-4.5 w-4.5 rounded bg-white/[0.04] animate-pulse" />
            </div>
            {/* Mock event labels */}
            {cIdx % 3 === 0 && (
              <div className="space-y-1.5 w-full mt-2">
                <div className="h-5 w-11/12 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                {cIdx % 6 === 0 && (
                  <div className="h-5 w-4/5 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                )}
              </div>
            )}
            <div className="h-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

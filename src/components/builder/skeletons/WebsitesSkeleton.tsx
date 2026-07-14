'use client';

import React from 'react';

export function WebsitesSkeleton() {
  return (
    <div className="flex flex-col gap-y-6 px-6 py-5 select-none">
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="h-7 w-52 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-dash-border" />
          <div className="h-3.5 w-96 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-dash-border" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-40 rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-dash-border" />
          <div className="h-9 w-24 rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-dash-border" />
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex items-center justify-between border-y border-dash-border py-3 px-4 rounded-xl">
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-8 w-24 rounded-full bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none" />
          <div className="h-8 w-8 rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none" />
        </div>
      </div>

      {/* Websites Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="relative bg-white border border-dash-border rounded-xl p-[18px] flex flex-col gap-6 shadow-sm"
          >
            {/* Header info */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-dash-surface animate-pulse motion-reduce:animate-none" />
                <div className="h-10 w-10 rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="h-6 w-16 rounded-full bg-dash-surface animate-pulse motion-reduce:animate-none" />
            </div>

            {/* Title / Domain */}
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-dash-surface animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-56 rounded bg-dash-surface animate-pulse motion-reduce:animate-none" />
            </div>

            {/* Footer details */}
            <div className="flex items-center justify-between pt-4 border-t border-dash-border">
              <div className="flex flex-col gap-1">
                <div className="h-2.5 w-14 rounded bg-dash-surface animate-pulse motion-reduce:animate-none" />
                <div className="h-4 w-16 rounded bg-dash-surface animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="flex gap-2">
                <div className="h-8.5 w-8.5 rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none" />
                <div className="h-8.5 w-24 rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

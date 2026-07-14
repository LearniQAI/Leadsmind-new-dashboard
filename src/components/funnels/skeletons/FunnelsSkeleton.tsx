'use client';

import React from 'react';

export function FunnelsSkeleton() {
  return (
    <div className="space-y-8 select-none">
      {/* Header Area Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-56 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-dash-border" />
          <div className="h-3.5 w-64 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-dash-border" />
        </div>
        <div className="h-11 w-32 rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-dash-border" />
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white border border-dash-border rounded-2xl p-6 flex flex-col justify-between min-h-[300px] shadow-sm"
          >
            <div className="space-y-6">
              {/* Header icons / Badges */}
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-dash-surface animate-pulse motion-reduce:animate-none" />
                <div className="flex items-center gap-2">
                  <div className="h-6 w-14 rounded-full bg-dash-surface animate-pulse motion-reduce:animate-none" />
                  <div className="h-8 w-8 rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none" />
                </div>
              </div>

              {/* Title & Domain */}
              <div className="space-y-2">
                <div className="h-6 w-40 rounded bg-dash-surface animate-pulse motion-reduce:animate-none" />
                <div className="h-3.5 w-24 rounded bg-dash-surface animate-pulse motion-reduce:animate-none" />
              </div>

              {/* Stats Block */}
              <div className="grid grid-cols-3 gap-2 py-3 bg-dash-surface rounded-xl border border-dash-border text-center">
                {Array.from({ length: 3 }).map((_, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <div className="h-2 w-8 rounded bg-white animate-pulse motion-reduce:animate-none mx-auto" />
                    <div className="h-4.5 w-12 rounded bg-white animate-pulse motion-reduce:animate-none mx-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t border-dash-border mt-6">
              <div className="h-9 flex-1 rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none" />
              <div className="h-9 w-9 rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import React from 'react';

export function PipelinesSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#04091a] select-none">
      {/* Header Area Skeleton */}
      <div className="shrink-0 flex flex-col border-b border-white/[0.05]">
        <div className="h-[72px] px-8 flex items-center justify-between bg-[#04091a]">
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-24 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              <div className="h-5 w-40 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <div className="h-10 w-32 rounded-[12px] bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-11 w-36 rounded-[12px] bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            <div className="h-11 w-32 rounded-[12px] bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          </div>
        </div>

        {/* Stats Strip Skeleton */}
        <div className="h-20 border-b border-white/[0.03] bg-white/[0.01] px-8 flex items-center justify-start gap-12">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              <div className="h-5 w-24 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid Board Area Skeleton */}
      <div className="flex-1 overflow-x-auto p-8 flex items-start gap-8 min-h-full">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="w-[320px] shrink-0 flex flex-col gap-4 p-5 rounded-[24px] bg-white/[0.02] border border-white/5 shadow-none">
            {/* Column Header Skeleton */}
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div className="flex flex-col gap-1">
                <div className="h-4.5 w-24 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                <div className="h-3 w-12 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              </div>
              <div className="h-7 w-12 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            </div>

            {/* Deal Cards */}
            <div className="flex flex-col gap-3">
              {Array.from({ length: idx === 0 ? 3 : 2 }).map((_, cIdx) => (
                <div key={cIdx} className="p-5 rounded-[18px] bg-[#0b0f1a] border border-white/5 flex flex-col gap-3 shadow-none">
                  <div className="flex justify-between items-center">
                    <div className="h-4.5 w-32 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                    <div className="h-3.5 w-8 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                  </div>
                  <div className="h-4 w-40 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                    <div className="w-6 h-6 rounded-full bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

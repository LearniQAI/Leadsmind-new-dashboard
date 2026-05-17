'use client';

import React from 'react';

export function TasksBoardSkeleton() {
  const columns = [
    { id: 'todo', title: 'To Do', color: 'border-l-amber/40 bg-amber/5' },
    { id: 'in_progress', title: 'In Progress', color: 'border-l-accent/40 bg-accent/5' },
    { id: 'in_review', title: 'In Review', color: 'border-l-purple/40 bg-purple/5' },
    { id: 'done', title: 'Done', color: 'border-l-green/40 bg-green/5' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full px-6 pb-40 select-none">
      {columns.map((col) => (
        <div key={col.id} className="flex flex-col w-full rounded-2xl border border-white/5 overflow-hidden bg-white/[0.02]">
          {/* Header Accordion Skeleton */}
          <div className={`flex items-center justify-between py-4 px-6 border-l-4 ${col.color.split(' ')[0]} bg-white/[0.03]`}>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-20 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                <div className="h-3 w-12 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: col.id === 'todo' ? 3 : 2 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-3 p-4 bg-[#0B132C]/95 border border-white/5 rounded-xl border-t-[3px] border-t-white/10 shadow-none"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-12 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                    <div className="h-4.5 w-3 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                  </div>

                  {/* Card Title */}
                  <div className="h-4 w-full rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />

                  {/* Card Description */}
                  <div className="space-y-1.5">
                    <div className="h-3 w-11/12 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                    <div className="h-3 w-4/5 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-14 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                      <div className="h-3 w-10 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                    </div>
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-white/[0.04] border-2 border-[#0B132C] animate-pulse shadow-none" />
                      <div className="w-6 h-6 rounded-full bg-white/[0.04] border-2 border-[#0B132C] animate-pulse shadow-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

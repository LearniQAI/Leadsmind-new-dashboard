'use client';

import React from 'react';

export function ProposalsSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-280px)] gap-6 select-none">
      {/* Left Sidebar Skeleton */}
      <div className="w-full lg:w-[380px] flex flex-col gap-4">
        <div className="bg-white border border-dash-border rounded-2xl p-4 h-full flex flex-col shadow-sm space-y-4">
          {/* Search Box */}
          <div className="p-2">
            <div className="h-10 w-full rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-transparent" />
          </div>

          {/* Proposal Items List */}
          <div className="flex-1 space-y-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-transparent bg-dash-surface flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <div className="h-3.5 w-16 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none" />
                  <div className="h-4 w-12 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none" />
                </div>
                <div className="h-4 w-28 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none" />
                <div className="flex justify-between items-center mt-1">
                  <div className="h-3 w-20 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none" />
                  <div className="h-5 w-14 rounded-full bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Content Sheet Skeleton */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Actions Header */}
        <div className="bg-white border border-dash-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-transparent" />
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-24 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-transparent" />
              <div className="h-3.5 w-16 rounded bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-transparent" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-transparent" />
            <div className="h-10 w-10 rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none shadow-none border border-transparent" />
          </div>
        </div>

        {/* Estimate Page sheet */}
        <div className="flex-1 overflow-hidden">
          <div className="bg-white border border-dash-border rounded-2xl p-8 md:p-16 shadow-sm min-h-full flex flex-col justify-between">
            {/* Top items */}
            <div className="space-y-16">
              {/* Logo block */}
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <div className="h-10 w-40 rounded-xl bg-slate-200 animate-pulse motion-reduce:animate-none" />
                  <div className="space-y-1">
                    <div className="h-3.5 w-32 rounded bg-slate-100 animate-pulse motion-reduce:animate-none" />
                    <div className="h-3.5 w-40 rounded bg-slate-100 animate-pulse motion-reduce:animate-none" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-12 w-32 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-20 rounded bg-slate-100 animate-pulse motion-reduce:animate-none inline-block" />
                </div>
              </div>

              {/* Billed To / Dates block */}
              <div className="grid grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="h-3 w-16 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-6 w-36 rounded bg-slate-300 animate-pulse motion-reduce:animate-none" />
                  <div className="h-3.5 w-24 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <div className="h-3 w-16 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                    <div className="h-4 w-20 rounded bg-slate-300 animate-pulse motion-reduce:animate-none" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-16 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                    <div className="h-4 w-20 rounded bg-slate-300 animate-pulse motion-reduce:animate-none" />
                  </div>
                </div>
              </div>

              {/* Table items */}
              <div className="space-y-4">
                <div className="flex justify-between border-b-2 border-slate-100 pb-3">
                  <div className="h-3.5 w-20 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-3.5 w-8 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-3.5 w-12 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-3.5 w-14 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="flex justify-between py-4 border-b border-slate-50">
                  <div className="h-5 w-48 rounded bg-slate-100 animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-6 rounded bg-slate-100 animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-12 rounded bg-slate-100 animate-pulse motion-reduce:animate-none" />
                  <div className="h-5 w-16 rounded bg-slate-100 animate-pulse motion-reduce:animate-none" />
                </div>
              </div>
            </div>

            {/* Total items */}
            <div className="flex justify-end pt-8 border-t-2 border-slate-100">
              <div className="w-72 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-3.5 w-16 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-14 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div className="h-3.5 w-14 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-10 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-4.5 w-20 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-8 w-32 rounded bg-slate-300 animate-pulse motion-reduce:animate-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

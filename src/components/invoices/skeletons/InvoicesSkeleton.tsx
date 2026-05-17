'use client';

import React from 'react';

export function InvoicesSkeleton() {
  return (
    <div className="flex w-full select-none">
      {/* LEFT PANEL: 300px List Skeleton */}
      <div className="w-[300px] shrink-0 flex flex-col border-r border-[var(--bdr)] bg-[var(--n800)] min-h-screen">
        <div className="p-4 border-b border-[var(--bdr)] space-y-4">
          {/* Search Box */}
          <div className="h-9 w-full rounded-lg bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          
          {/* Quick Buttons */}
          <div className="flex gap-2">
            <div className="h-10 flex-1 rounded-xl bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            <div className="h-10 flex-1 rounded-xl bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          </div>

          {/* Status Pills */}
          <div className="flex gap-2 overflow-hidden pb-1">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-7 w-14 rounded-full bg-white/[0.04] animate-pulse shrink-0 shadow-none border border-transparent" />
            ))}
          </div>

          {/* Sort Select */}
          <div className="h-9 w-full rounded-lg bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
        </div>

        {/* Invoice Item List */}
        <div className="flex-1 divide-y divide-[var(--bdr)] overflow-hidden">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="p-4 flex flex-col gap-2 bg-transparent">
              <div className="flex justify-between items-center">
                <div className="h-4 w-16 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                <div className="h-4 w-12 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              </div>
              <div className="h-4.5 w-32 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              <div className="flex justify-between items-center">
                <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                <div className="h-5 w-14 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA Skeleton */}
      <div className="flex-1 flex flex-col bg-[var(--n900)] overflow-hidden min-h-screen">
        {/* Document Action Header */}
        <div className="p-4 border-b border-[var(--bdr)] flex items-center justify-between bg-[var(--n800)]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-28 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded-lg bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            <div className="h-9 w-9 rounded-lg bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            <div className="h-9 w-9 rounded-lg bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          </div>
        </div>

        {/* Invoice Page Sheet Wrapper */}
        <div className="flex-1 p-8 bg-[rgba(0,0,0,0.2)] overflow-hidden">
          <div className="max-w-[800px] mx-auto bg-white p-12 md:p-16 rounded-2xl shadow-none min-h-[1000px] flex flex-col justify-between">
            {/* Top Sheet */}
            <div className="space-y-16 w-full">
              {/* Logo block */}
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <div className="h-8 w-32 rounded bg-slate-200 animate-pulse shadow-none border border-transparent" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-40 rounded bg-slate-100 animate-pulse shadow-none border border-transparent" />
                    <div className="h-3.5 w-32 rounded bg-slate-100 animate-pulse shadow-none border border-transparent" />
                  </div>
                </div>
                <div className="h-10 w-24 rounded bg-slate-200 animate-pulse shadow-none border border-transparent" />
              </div>

              {/* Billed To / Dates block */}
              <div className="grid grid-cols-2 gap-16">
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-3">
                  <div className="h-3 w-14 rounded bg-slate-200 animate-pulse shadow-none" />
                  <div className="h-6 w-40 rounded bg-slate-300 animate-pulse shadow-none" />
                  <div className="h-4 w-32 rounded bg-slate-200 animate-pulse shadow-none" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="h-3.5 w-16 rounded bg-slate-200 animate-pulse shadow-none" />
                    <div className="h-4.5 w-24 rounded bg-slate-300 animate-pulse shadow-none" />
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="h-3.5 w-16 rounded bg-slate-200 animate-pulse shadow-none" />
                    <div className="h-4.5 w-24 rounded bg-slate-300 animate-pulse shadow-none" />
                  </div>
                </div>
              </div>

              {/* Line Items Table Skeleton */}
              <div className="space-y-4 w-full">
                <div className="flex justify-between border-b-2 border-slate-100 pb-3">
                  <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
                </div>
                {Array.from({ length: 2 }).map((_, rIdx) => (
                  <div key={rIdx} className="flex justify-between py-4 border-b border-slate-50">
                    <div className="h-5 w-40 rounded bg-slate-100 animate-pulse" />
                    <div className="h-4 w-8 rounded bg-slate-100 animate-pulse" />
                    <div className="h-4 w-12 rounded bg-slate-100 animate-pulse" />
                    <div className="h-5 w-16 rounded bg-slate-100 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Calculations */}
            <div className="flex justify-end pt-8 border-t-2 border-slate-100">
              <div className="w-64 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-3.5 w-14 rounded bg-slate-200 animate-pulse" />
                  <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div className="h-3.5 w-10 rounded bg-slate-200 animate-pulse" />
                  <div className="h-4 w-12 rounded bg-slate-200 animate-pulse" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-3.5 w-20 rounded bg-slate-200 animate-pulse" />
                  <div className="h-8 w-28 rounded bg-slate-300 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

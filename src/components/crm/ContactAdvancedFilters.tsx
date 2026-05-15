'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface ContactAdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  onFilterChange: (filters: any) => void;
  onReset: () => void;
}

export function ContactAdvancedFilters({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset
}: ContactAdvancedFiltersProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] bg-[#080f28] border-l border-white/5 p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-8 border-b border-white/5 bg-[#04091a]/40">
            <div className="w-12 h-12 rounded-2xl bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb] mb-4">
              <i className="fa-solid fa-filter-list text-[20px]"></i>
            </div>
            <SheetTitle className="text-[22px] font-bold text-[#eef2ff] font-space-grotesk uppercase tracking-tight">
              Advanced <span className="text-[#3b82f6]">Filters</span>
            </SheetTitle>
            <SheetDescription className="text-[12px] text-[#4a5a82] font-dm-sans uppercase tracking-widest mt-1">
              Refine your tactical lead interrogation
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 common-scrollbar">
            {/* Lead Source */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-[#eef2ff] uppercase tracking-[1.5px] font-space-grotesk">Lead Source</h4>
              <div className="grid grid-cols-2 gap-2">
                {['Direct Entry', 'Web Form', 'Referral', 'Paid Ads'].map(source => (
                  <button
                    key={source}
                    onClick={() => onFilterChange({ ...filters, source: filters.source === source ? null : source })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-[12px] font-dm-sans border transition-all text-left",
                      filters.source === source 
                        ? "bg-[#2563eb]/10 border-[#2563eb] text-[#3b82f6] font-bold" 
                        : "bg-white/5 border-white/5 text-[#4a5a82] hover:border-white/10"
                    )}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Placeholder */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-[#eef2ff] uppercase tracking-[1.5px] font-space-grotesk">Creation Period</h4>
              <div className="space-y-2">
                {['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'All Time'].map(range => (
                  <button
                    key={range}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/5 text-[13px] text-[#94a3c8] font-dm-sans text-left hover:border-white/10 transition-all flex items-center justify-between group"
                  >
                    {range}
                    <i className="fa-solid fa-chevron-right text-[10px] text-[#4a5a82] group-hover:text-[#3b82f6]"></i>
                  </button>
                ))}
              </div>
            </div>

            {/* Strategic Tags Placeholder */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-[#eef2ff] uppercase tracking-[1.5px] font-space-grotesk">Relationship Status</h4>
              <div className="flex flex-wrap gap-2">
                {['Hot Lead', 'Customer', 'Lost', 'Qualified'].map(tag => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[11px] font-bold text-[#4a5a82] cursor-pointer hover:border-[#2563eb]/40 hover:text-[#eef2ff] transition-all">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-white/5 bg-[#04091a]/40 grid grid-cols-2 gap-4">
            <button
              onClick={onReset}
              className="h-11 rounded-xl bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[13px] font-bold font-dm-sans transition-all"
            >
              Reset Filters
            </button>
            <button
              onClick={onClose}
              className="h-11 rounded-xl bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[13px] font-bold font-dm-sans transition-all shadow-lg shadow-[#2563eb]/20"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

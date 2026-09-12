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
      <SheetContent className="w-[400px] bg-dash-surface border-l border-dash-border p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-8 border-b border-dash-border bg-dash-bg">
            <div className="w-12 h-12 rounded-2xl bg-dash-accent/10 flex items-center justify-center text-dash-accent mb-4">
              <i className="fa-solid fa-filter-list text-[20px]"></i>
            </div>
            <SheetTitle className="text-[22px] font-bold text-dash-text font-space-grotesk uppercase tracking-tight">
              Advanced <span className="text-dash-accent">Filters</span>
            </SheetTitle>
            <SheetDescription className="text-[12px] text-dash-textMuted font-dm-sans uppercase tracking-widest mt-1">
              Refine your tactical lead interrogation
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 common-scrollbar">
            {/* Lead Source */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-dash-text uppercase tracking-[1.5px] font-space-grotesk">Lead Source</h4>
              <div className="grid grid-cols-2 gap-2">
                {['Direct Entry', 'Web Form', 'Referral', 'Paid Ads'].map(source => (
                  <button
                    key={source}
                    onClick={() => onFilterChange({ ...filters, source: filters.source === source ? null : source })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-[12px] font-dm-sans border transition-all text-left",
                      filters.source === source
                        ? "bg-dash-accent/10 border-dash-accent text-dash-accent font-bold"
                        : "bg-dash-bg border-dash-border text-dash-textMuted hover:border-dash-accent/30"
                    )}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Placeholder */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-dash-text uppercase tracking-[1.5px] font-space-grotesk">Creation Period</h4>
              <div className="space-y-2">
                {['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'All Time'].map(range => (
                  <button
                    key={range}
                    className="w-full px-4 py-2.5 rounded-lg bg-dash-bg border border-dash-border text-[13px] text-dash-textMuted font-dm-sans text-left hover:border-dash-accent/30 transition-all flex items-center justify-between group"
                  >
                    {range}
                    <i className="fa-solid fa-chevron-right text-[10px] text-dash-textMuted group-hover:text-dash-accent"></i>
                  </button>
                ))}
              </div>
            </div>

            {/* Strategic Tags Placeholder */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-dash-text uppercase tracking-[1.5px] font-space-grotesk">Relationship Status</h4>
              <div className="flex flex-wrap gap-2">
                {['Hot Lead', 'Customer', 'Lost', 'Qualified'].map(tag => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-dash-bg border border-dash-border text-[11px] font-bold text-dash-textMuted cursor-pointer hover:border-dash-accent/40 hover:text-dash-text transition-all">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-dash-border bg-dash-bg grid grid-cols-2 gap-4">
            <button
              onClick={onReset}
              className="h-11 rounded-xl bg-dash-surface border border-dash-border text-dash-text hover:bg-dash-border/40 text-[13px] font-bold font-dm-sans transition-all"
            >
              Reset Filters
            </button>
            <button
              onClick={onClose}
              className="h-11 rounded-xl bg-dash-accent text-white hover:bg-dash-accent/90 text-[13px] font-bold font-dm-sans transition-all shadow-lg shadow-dash-accent/20"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

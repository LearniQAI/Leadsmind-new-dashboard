'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ContactFiltersProps {
  tags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  owners: { id: string, name: string }[];
  selectedOwner: string | null;
  onOwnerChange: (id: string | null) => void;
}

export function ContactFilters({
  tags,
  selectedTags,
  onTagToggle,
  owners,
  selectedOwner,
  onOwnerChange
}: ContactFiltersProps) {
  return (
    <div className="w-[240px] shrink-0 space-y-8 bg-[#080f28] p-6 border-r border-white/5 h-full overflow-y-auto no-scrollbar">
      {/* Filter Section: Search - Handled globally usually, but for filters we focus on specific facets */}

      {/* Owners */}
      <div>
        <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-4 font-dm-sans">
          Database Owner
        </h4>
        <div className="space-y-1.5">
          <button
            onClick={() => onOwnerChange(null)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-[13px] font-dm-sans transition-all",
              !selectedOwner ? "bg-[#2563eb]/10 text-[#3b82f6] font-semibold" : "text-[#94a3c8] hover:bg-white/5"
            )}
          >
            All Personnel
          </button>
          {owners.map(owner => (
            <button
              key={owner.id}
              onClick={() => onOwnerChange(owner.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-[13px] font-dm-sans transition-all",
                selectedOwner === owner.id ? "bg-[#2563eb]/10 text-[#3b82f6] font-semibold" : "text-[#94a3c8] hover:bg-white/5"
              )}
            >
              {owner.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] font-dm-sans">
            Strategic Tags
          </h4>
          <button className="text-[10px] font-bold text-[#2563eb] hover:underline uppercase tracking-widest">Manage</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all border",
                  isSelected
                    ? "bg-[#2563eb] border-[#2563eb] text-white shadow-lg shadow-[#2563eb]/20"
                    : "bg-white/5 border-white/5 text-[#4a5a82] hover:border-white/10 hover:text-[#eef2ff]"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filters Placeholder */}
      {/* <div className="pt-6 border-t border-white/5">
        <button className="w-full flex items-center justify-between text-[11px] font-bold text-[#4a5a82] uppercase tracking-widest hover:text-[#eef2ff] transition-colors">
          <span>Advanced Filters</span>
          <i className="fa-solid fa-chevron-down text-[10px]"></i>
        </button>
      </div> */}
    </div>
  );
}

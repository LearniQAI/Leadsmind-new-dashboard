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
  onManageTags?: () => void;
}

export function ContactFilters({
  tags,
  selectedTags,
  onTagToggle,
  owners,
  selectedOwner,
  onOwnerChange,
  onManageTags
}: ContactFiltersProps) {
  return (
    <div className="w-full md:w-[240px] shrink-0 space-y-8 bg-dash-surface p-6 border-b md:border-b-0 md:border-r border-dash-border md:h-full overflow-y-auto no-scrollbar">
      {/* Filter Section: Search - Handled globally usually, but for filters we focus on specific facets */}

      {/* Owners */}
      <div>
        <h4 className="text-[12px] font-bold !text-dash-text mb-4">
          Database owner
        </h4>
        <div className="space-y-1.5">
          <button
            onClick={() => onOwnerChange(null)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors motion-reduce:transition-none",
              !selectedOwner ? "bg-dash-accent/10 text-dash-accent font-semibold" : "!text-dash-textMuted hover:bg-white"
            )}
          >
            All personnel
          </button>
          {owners.map(owner => (
            <button
              key={owner.id}
              onClick={() => onOwnerChange(owner.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors motion-reduce:transition-none",
                selectedOwner === owner.id ? "bg-dash-accent/10 text-dash-accent font-semibold" : "!text-dash-textMuted hover:bg-white"
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
          <h4 className="text-[12px] font-bold !text-dash-text">
            Strategic tags
          </h4>
          <button
            onClick={onManageTags}
            className="text-[12px] font-bold text-dash-accent hover:opacity-80 transition-opacity"
          >
            Manage
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors motion-reduce:transition-none border",
                  isSelected
                    ? "bg-dash-accent border-dash-accent text-white shadow-[0_4px_12px_rgba(19,89,255,0.2)]"
                    : "bg-white border-dash-border !text-dash-textMuted hover:border-dash-text/20 hover:!text-dash-text"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

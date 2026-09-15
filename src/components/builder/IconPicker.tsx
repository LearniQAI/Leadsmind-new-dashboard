"use client";

import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
}

export const IconPicker = ({ value, onChange }: IconPickerProps) => {
  const [search, setSearch] = useState('');

  // Get all icon names from Lucide
  const allIconNames = useMemo(() => {
    return Object.keys(LucideIcons).filter(key =>
      typeof (LucideIcons as any)[key] === 'function' ||
      (typeof (LucideIcons as any)[key] === 'object' && (LucideIcons as any)[key].render)
    );
  }, []);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return allIconNames
      .filter(name => name.toLowerCase().includes(lowerSearch))
      .slice(0, 100); // Limit to 100 icons for performance
  }, [allIconNames, search]);

  // Current selected icon component
  const CurrentIcon = (LucideIcons as any)[value] || LucideIcons.HelpCircle;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 transition-all motion-reduce:transition-none w-full group">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-700">
            <CurrentIcon size={18} />
          </div>
          <span className="text-[12px] font-medium text-slate-700 group-hover:text-slate-900 transition-colors motion-reduce:transition-none">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-white border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-100">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs bg-white border-slate-200 rounded-xl text-slate-700 focus-visible:border-slate-300"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px] p-2">
          <div className="grid grid-cols-5 gap-1">
            {filteredIcons.map((iconName) => {
              const IconComponent = (LucideIcons as any)[iconName];
              return (
                <button
                  key={iconName}
                  onClick={() => onChange(iconName)}
                  className={`p-2 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-all motion-reduce:transition-none flex items-center justify-center ${value === iconName ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
                  title={iconName}
                >
                  <IconComponent size={20} />
                </button>
              );
            })}
          </div>
          {filteredIcons.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              No icons found for "{search}"
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t border-slate-200 bg-slate-100 text-[9px] text-center text-slate-500">
          {allIconNames.length} professional icons
        </div>
      </PopoverContent>
    </Popover>
  );
};

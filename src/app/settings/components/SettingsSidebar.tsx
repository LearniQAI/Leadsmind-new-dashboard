"use client";
import React, { useMemo, useState } from 'react';
import { Search, ChevronRight, ExternalLink, LucideIcon } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  href?: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

interface SettingsSidebarProps {
  groups: MenuGroup[];
  activeTab: string;
  onSelect: (item: MenuItem) => void;
}

export default function SettingsSidebar({ groups, activeTab, onSelect }: SettingsSidebarProps) {
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  return (
    <div className="w-full lg:w-[320px] flex-shrink-0 border-r border-dash-border bg-dash-surface/50 flex flex-col">
      <div className="p-6 border-b border-dash-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={14} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter settings..."
            className="w-full bg-white border border-dash-border rounded-xl py-2 pl-9 pr-4 text-[12px] !text-dash-text outline-none focus:border-dash-accent/30 transition-all motion-reduce:transition-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {filteredGroups.length === 0 && (
          <p className="text-[12px] !text-dash-textMuted text-center py-8">No settings match "{query}"</p>
        )}
        {filteredGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted opacity-70">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = !item.href && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 motion-reduce:transition-none group ${isActive
                    ? "bg-dash-accent/10 text-dash-accent shadow-sm ring-1 ring-dash-border"
                    : "!text-dash-textMuted hover:bg-dash-surface hover:!text-dash-text"
                    }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors motion-reduce:transition-none ${isActive ? "bg-dash-accent/20 text-dash-accent" : "bg-dash-surface !text-dash-textMuted group-hover:!text-dash-text"
                    }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[13px] font-bold truncate leading-tight">{item.label}</span>
                    <span className="text-[10px] !text-dash-textMuted font-medium truncate opacity-60">{item.description}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="ml-auto text-dash-accent flex-shrink-0" />}
                  {item.href && <ExternalLink size={12} className="ml-auto !text-dash-textMuted opacity-50 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

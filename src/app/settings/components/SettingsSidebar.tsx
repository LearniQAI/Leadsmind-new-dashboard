"use client";
import React, { useMemo, useState } from 'react';
import { Search, ExternalLink, LucideIcon } from 'lucide-react';

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
    <div className="w-full lg:w-[280px] flex-shrink-0 border-r border-dash-border bg-dash-bg flex flex-col">
      <div className="px-6 py-5 border-b border-dash-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={14} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter settings..."
            className="w-full bg-dash-surface border border-dash-border rounded-lg py-2 pl-9 pr-4 text-[13px] !text-dash-text outline-none focus:border-dash-accent/40 transition-colors motion-reduce:transition-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {filteredGroups.length === 0 && (
          <p className="text-[13px] !text-dash-textMuted text-center py-8">No settings match "{query}"</p>
        )}
        {filteredGroups.map((group) => (
          <div key={group.label} className="mb-2">
            <div className="px-6 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wide !text-dash-textMuted opacity-60">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = !item.href && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={`w-full flex items-center gap-3 pl-[22px] pr-6 py-[13px] border-l-2 transition-colors duration-150 motion-reduce:transition-none ${isActive
                    ? "border-dash-accent bg-dash-accent/5 !text-dash-accent"
                    : "border-transparent !text-dash-text hover:bg-dash-surface"
                    }`}
                >
                  <Icon size={15} strokeWidth={2} className={isActive ? "text-dash-accent flex-shrink-0" : "!text-dash-textMuted flex-shrink-0"} />
                  <span className="text-[15px] font-medium truncate leading-tight">{item.label}</span>
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

"use client";
import React from 'react';
import { Search, ChevronRight, LucideIcon } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface SettingsSidebarProps {
  menuItems: MenuItem[];
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export default function SettingsSidebar({ menuItems, activeTab, setActiveTab }: SettingsSidebarProps) {
  return (
    <div className="w-full lg:w-[320px] flex-shrink-0 border-r border-dash-border bg-dash-surface/50 flex flex-col">
      <div className="p-6 border-b border-dash-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted" size={14} />
          <input
            type="text"
            placeholder="Filter settings..."
            className="w-full bg-white border border-dash-border rounded-xl py-2 pl-9 pr-4 text-[12px] !text-dash-text outline-none focus:border-dash-accent/30 transition-all motion-reduce:transition-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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
              {isActive && <ChevronRight size={14} className="ml-auto text-dash-accent" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

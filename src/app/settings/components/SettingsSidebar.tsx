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
    <div className="w-full lg:w-[320px] flex-shrink-0 border-r border-white/5 bg-n800/50 flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" size={14} />
          <input
            type="text"
            placeholder="Filter settings..."
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-[12px] text-t1 outline-none focus:border-accent/30 transition-all"
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
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${isActive
                ? "bg-accent/10 text-accent2 shadow-sm ring-1 ring-white/10"
                : "text-t2 hover:bg-white/[0.03] hover:text-t1"
                }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? "bg-accent/20 text-accent" : "bg-white/[0.03] text-t3 group-hover:text-t2"
                }`}>
                <Icon size={16} />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[13px] font-bold truncate leading-tight">{item.label}</span>
                <span className="text-[10px] text-t3 font-medium truncate opacity-60">{item.description}</span>
              </div>
              {isActive && <ChevronRight size={14} className="ml-auto text-accent2" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

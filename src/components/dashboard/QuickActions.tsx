"use client";
import React from 'react';
import Link from 'next/link';
import useGlobalContext from '@/hooks/use-context';
import { Plus, FileText, Send, Calendar, Zap, FileSignature, Search, Command } from 'lucide-react';

const QuickActions = () => {
  const { setSearchOpen } = useGlobalContext();
  const actions = [
    { label: 'New Lead', icon: <Plus size={12} />, link: '/contacts/new', primary: true },
    { label: 'New Invoice', icon: <FileText size={12} />, link: '/invoices/new' },
    { label: 'Send Campaign', icon: <Send size={12} />, link: '/campaigns' },
    { label: 'Book Appointment', icon: <Calendar size={12} />, link: '/calendar' },
    { label: 'New Automation', icon: <Zap size={12} />, link: '/automations' },
    { label: 'New Proposal', icon: <FileSignature size={12} />, link: '/proposals' },
  ];

  return (
    <div className="px-6 py-5 flex flex-col gap-4 border-b border-dash-border bg-dash-surface">
      {/* Label Area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-dash-textMuted opacity-80 font-space">Quick System Actions</span>
        </div>

        {/* Global Search Shortcut */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg border border-dash-border bg-dash-bg hover:bg-dash-border/40 hover:border-dash-border transition-all group"
        >
          <div className="flex items-center gap-2 text-dash-textMuted group-hover:text-dash-text transition-colors">
            <Search size={12} />
            <span className="text-[9px] font-black uppercase tracking-widest">Global Search</span>
          </div>
          <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
            <div className="text-[8px] font-bold px-1.5 py-0.5 border border-dash-border rounded bg-dash-bg text-dash-textMuted">
              <Command size={8} className="inline mr-0.5" /> K
            </div>
          </div>
        </button>
      </div>

      {/* Actions Grid/Row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-3">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.link}
            className={`flex items-center gap-2.5 whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 group ${action.primary
              ? 'bg-accent text-white px-4 py-2 rounded-xl text-[12px] font-bold shadow-lg shadow-accent/10 hover:shadow-accent/25 ring-1 ring-white/20'
              : 'text-dash-textMuted hover:text-dash-text px-4 py-2 rounded-xl text-[12px] font-bold bg-dash-bg border border-dash-border hover:border-dash-border hover:bg-dash-border/40'
              }`}
          >
            <span className={`${action.primary ? 'text-white' : 'text-dash-accent group-hover:scale-110 transition-transform'}`}>
              {action.icon}
            </span>
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
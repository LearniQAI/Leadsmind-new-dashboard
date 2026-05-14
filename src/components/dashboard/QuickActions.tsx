"use client";
import React from 'react';
import Link from 'next/link';
import useGlobalContext from '@/hooks/use-context';

const QuickActions = () => {
  const { setSearchOpen } = useGlobalContext();
  const actions = [
    { label: 'New Lead', icon: 'fa-plus', link: '/contacts/new', primary: true },
    { label: 'New Invoice', icon: 'fa-file-invoice-dollar', link: '/invoices/new' },
    { label: 'Send Campaign', icon: 'fa-paper-plane', link: '/campaigns' },
    { label: 'Book Appointment', icon: 'fa-calendar-check', link: '/calendar' },
    { label: 'New Automation', icon: 'fa-bolt', link: '/automations' },
    { label: 'New Proposal', icon: 'fa-file-signature', link: '/proposals' },
  ];

  return (
    <div className="px-6 py-3 flex items-center justify-between border-b border-white/[0.05] bg-transparent">
      <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 pr-5 border-r border-white/5 whitespace-nowrap">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-t3 opacity-80">Quick Actions</span>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <Link
              key={index}
              href={action.link}
              className={`flex items-center gap-2 whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                action.primary 
                ? 'bg-accent text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-md shadow-accent/10 hover:shadow-accent/20' 
                : 'text-t2 hover:text-t1 px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-white/[0.04]'
              }`}
            >
              <i className={`fa-solid ${action.icon} ${action.primary ? '' : 'text-t3'} text-[10px]`}></i>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
      
      <div className="hidden xl:flex items-center gap-4 pl-5 border-l border-white/5">
        <div 
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 text-t3 text-[10px] font-black uppercase tracking-widest hover:text-t1 transition-colors cursor-pointer group"
        >
          <i className="fa-solid fa-magnifying-glass text-[9px]"></i>
          <span>Global Search</span>
          <div className="flex gap-1 ml-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] border border-white/10 px-1 rounded">⌘</span>
            <span className="text-[8px] border border-white/10 px-1 rounded">K</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
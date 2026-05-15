'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Contact } from '@/types/crm';
import { format } from 'date-fns';

interface ContactListProps {
  contacts: Contact[];
  activeId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ContactList({
  contacts,
  activeId,
  onSelect,
  searchQuery,
  onSearchChange
}: ContactListProps) {
  return (
    <div className="w-[280px] border-r border-white/5 flex flex-col bg-[#080f28] h-full shrink-0">
      {/* Header & Search */}
      <div className="p-5 border-b border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-[#eef2ff] font-space-grotesk uppercase tracking-tight">
            Contacts
          </h1>
          <span className="bg-[#2563eb] text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-dm-sans">
            {contacts.length}
          </span>
        </div>

        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[#4a5a82]"></i>
          <input
            type="text"
            placeholder="Filter database..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-[12px] pl-9 pr-4 py-2 text-[13px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb]/40 transition-all font-dm-sans"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto common-scrollbar">
        {contacts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[11px] text-[#4a5a82] uppercase font-bold tracking-widest">No contacts found</p>
          </div>
        ) : (
          contacts.map(contact => {
            const isActive = activeId === contact.id;
            return (
              <div
                key={contact.id}
                onClick={() => onSelect(contact.id)}
                className={cn(
                  "p-4 border-b border-white/5 cursor-pointer transition-all relative group",
                  isActive 
                    ? "bg-[#2563eb]/10 border-l-[3px] border-l-[#2563eb]" 
                    : "hover:bg-white/[0.03] border-l-[3px] border-l-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#eef2ff] font-bold text-[13px] shrink-0 font-space-grotesk overflow-hidden">
                    {contact.first_name[0]}{contact.last_name[0]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className="text-[13px] font-semibold text-[#eef2ff] truncate font-dm-sans">
                        {contact.first_name} {contact.last_name}
                      </h4>
                    </div>
                    
                    <p className="text-[11px] text-[#4a5a82] truncate font-dm-sans mb-1 uppercase tracking-widest">
                      {contact.email || 'NO EMAIL'}
                    </p>
                    
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {contact.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[8px] bg-[#2563eb]/10 text-[#3b82f6] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
                            {tag}
                          </span>
                        ))}
                        {contact.tags.length > 2 && (
                          <span className="text-[8px] text-[#4a5a82] font-bold">+{contact.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

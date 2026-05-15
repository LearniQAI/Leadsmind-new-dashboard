'use client';

import React from 'react';
import { Contact } from '@/types/crm';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ProfileSidebarProps {
  contact: Contact;
}

export function ProfileSidebar({ contact }: ProfileSidebarProps) {
  return (
    <div className="w-[280px] shrink-0 space-y-6">
      {/* Identity Card */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#2563eb]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#eef2ff] font-bold text-2xl mb-4 font-space-grotesk overflow-hidden shadow-2xl relative z-10">
            {contact.first_name[0]}{contact.last_name[0]}
          </div>
          <h2 className="text-[18px] font-bold text-[#eef2ff] font-space-grotesk tracking-tight relative z-10">
            {contact.first_name} {contact.last_name}
          </h2>
          <p className="text-[12px] text-[#4a5a82] font-dm-sans relative z-10">{contact.email || 'No email provided'}</p>
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">Status</span>
            <span className="bg-[#10b981]/15 text-[#10b981] text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter border border-[#10b981]/20">Active</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">Source</span>
            <span className="text-[12px] font-semibold text-[#eef2ff] font-dm-sans">{contact.source || 'Direct'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">Created</span>
            <span className="text-[11px] font-medium text-[#4a5a82] font-dm-sans">{format(new Date(contact.created_at), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Tactical Info */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl">
        <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] mb-5 font-dm-sans">Tactical Channels</h4>
        <div className="space-y-4">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-[#4a5a82] group-hover:text-[#3b82f6] group-hover:border-[#3b82f6]/40 transition-all">
              <i className="fa-solid fa-phone text-[12px]"></i>
            </div>
            <span className="text-[13px] text-[#94a3c8] font-dm-sans group-hover:text-[#eef2ff] transition-colors">{contact.phone || 'Not available'}</span>
          </div>
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-[#4a5a82] group-hover:text-[#3b82f6] group-hover:border-[#3b82f6]/40 transition-all">
              <i className="fa-solid fa-envelope text-[12px]"></i>
            </div>
            <span className="text-[13px] text-[#94a3c8] font-dm-sans group-hover:text-[#eef2ff] transition-colors truncate">{contact.email || 'Not available'}</span>
          </div>
        </div>
      </div>

      {/* Strategic Tags */}
      <div className="bg-[#080f28] border border-white/5 rounded-[24px] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans">Strategic Tags</h4>
          <i className="fa-solid fa-tag text-[10px] text-[#2563eb]"></i>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {contact.tags && contact.tags.length > 0 ? contact.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded bg-[#2563eb]/10 text-[#3b82f6] text-[9px] font-bold uppercase tracking-tight border border-[#2563eb]/10">
              {tag}
            </span>
          )) : (
            <span className="text-[11px] text-[#4a5a82] italic font-dm-sans">No tags assigned</span>
          )}
        </div>
      </div>
    </div>
  );
}

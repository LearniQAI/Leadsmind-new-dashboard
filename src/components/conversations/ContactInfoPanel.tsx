'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ContactInfoPanelProps {
  contact: any;
}

export function ContactInfoPanel({ contact }: ContactInfoPanelProps) {
  if (!contact) return null;

  return (
    <div className="w-[240px] border-l border-white/5 flex flex-col bg-[#080f28] h-full shrink-0 overflow-y-auto no-scrollbar">
      {/* Profile Section */}
      <div className="p-6 flex flex-col items-center text-center border-b border-white/5">
        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#eef2ff] font-bold text-2xl mb-4 font-space-grotesk overflow-hidden shadow-2xl">
          {contact.avatar_url ? (
            <img src={contact.avatar_url} className="w-full h-full object-cover" />
          ) : (
            contact.first_name?.[0] || 'U'
          )}
        </div>
        <h3 className="text-[15px] font-bold text-[#eef2ff] font-space-grotesk mb-1">
          {contact.first_name} {contact.last_name}
        </h3>
        <p className="text-[12px] text-[#4a5a82] font-dm-sans mb-4">{contact.email || 'No email provided'}</p>
        
        <div className="flex flex-wrap justify-center gap-1.5">
          <div className="bg-[#2563eb]/15 text-[#3b82f6] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-dm-sans">
            Lead
          </div>
          <div className="bg-[#10b981]/15 text-[#10b981] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-dm-sans">
            Active
          </div>
        </div>
      </div>

      {/* Strategic Info */}
      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-3 font-dm-sans">
            Pipeline Stage
          </h4>
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-[12px] p-3">
            <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
            <span className="text-[13px] font-semibold text-[#eef2ff] font-dm-sans">Proposal Stage</span>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-3 font-dm-sans">
            Quick Actions
          </h4>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[12px] font-semibold font-dm-sans rounded-[8px]">
              <i className="fa-solid fa-file-contract text-[#3b82f6] text-[13px]"></i>
              Send Proposal
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[12px] font-semibold font-dm-sans rounded-[8px]">
              <i className="fa-solid fa-calendar-check text-[#3b82f6] text-[13px]"></i>
              Book Meeting
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[12px] font-semibold font-dm-sans rounded-[8px]">
              <i className="fa-solid fa-circle-plus text-[#3b82f6] text-[13px]"></i>
              Add Task
            </Button>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-3 font-dm-sans">
            Contact Details
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-phone text-[#4a5a82] text-[12px]"></i>
              <span className="text-[12.5px] text-[#94a3c8] font-dm-sans">{contact.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-location-dot text-[#4a5a82] text-[12px]"></i>
              <span className="text-[12.5px] text-[#94a3c8] font-dm-sans">Dubai, UAE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

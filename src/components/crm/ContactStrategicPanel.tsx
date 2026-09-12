'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Contact } from '@/types/crm';

interface ContactStrategicPanelProps {
  contact: Contact | null;
}

export function ContactStrategicPanel({ contact }: ContactStrategicPanelProps) {
  if (!contact) return null;

  return (
    <div className="w-[240px] border-l border-dash-border flex flex-col bg-dash-surface h-full shrink-0 overflow-y-auto no-scrollbar">
      {/* Profile Section */}
      <div className="p-6 flex flex-col items-center text-center border-b border-dash-border">
        <div className="w-20 h-20 rounded-2xl bg-dash-bg border border-dash-border flex items-center justify-center text-dash-text font-bold text-2xl mb-4 font-space-grotesk overflow-hidden shadow-sm">
          {contact.first_name[0]}{contact.last_name[0]}
        </div>
        <h3 className="text-[15px] font-bold text-dash-text font-space-grotesk mb-1">
          {contact.first_name} {contact.last_name}
        </h3>
        <p className="text-[12px] text-dash-textMuted font-dm-sans mb-4">{contact.email || 'No email'}</p>

        <div className="flex flex-wrap justify-center gap-1.5">
          <div className="bg-dash-accent/15 text-dash-accent text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-dm-sans">
            Contact
          </div>
          {contact.tags && contact.tags.slice(0, 1).map(tag => (
            <div key={tag} className="bg-emerald-500/15 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-dm-sans">
              {tag}
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Info */}
      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-[10px] font-bold text-dash-textMuted uppercase tracking-[1.2px] mb-3 font-dm-sans">
            Lead Source
          </h4>
          <div className="flex items-center gap-3 bg-dash-bg border border-dash-border rounded-[12px] p-3">
            <i className="fa-solid fa-earth-americas text-dash-accent text-[12px]"></i>
            <span className="text-[13px] font-semibold text-dash-text font-dm-sans capitalize">{contact.source || 'Direct Entry'}</span>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-dash-textMuted uppercase tracking-[1.2px] mb-3 font-dm-sans">
            Quick Actions
          </h4>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 bg-dash-bg border border-dash-border text-dash-text hover:bg-dash-border/40 text-[12px] font-semibold font-dm-sans rounded-[8px]">
              <i className="fa-solid fa-file-contract text-dash-accent text-[13px]"></i>
              Send Proposal
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 bg-dash-bg border border-dash-border text-dash-text hover:bg-dash-border/40 text-[12px] font-semibold font-dm-sans rounded-[8px]">
              <i className="fa-solid fa-calendar-check text-dash-accent text-[13px]"></i>
              Book Meeting
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 bg-dash-bg border border-dash-border text-dash-text hover:bg-dash-border/40 text-[12px] font-semibold font-dm-sans rounded-[8px]">
              <i className="fa-solid fa-circle-plus text-dash-accent text-[13px]"></i>
              Add Note
            </Button>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-dash-textMuted uppercase tracking-[1.2px] mb-3 font-dm-sans">
            Contact Details
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-phone text-dash-textMuted text-[12px]"></i>
              <span className="text-[12.5px] text-dash-textMuted font-dm-sans">{contact.phone || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarHeaderProps {
  workspaceName?: string;
  onNewAppointment?: () => void;
}

export default function CalendarHeader({ workspaceName, onNewAppointment }: CalendarHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div className="space-y-1">
        <h1 className="text-[22px] font-bold font-['Space_Grotesk'] leading-tight">
          APPOINTMENT <span className="text-[var(--accent2)]">CALENDAR</span>
        </h1>
        <p className="text-[11.5px] font-medium text-[var(--t3)] uppercase tracking-[0.8px] font-['DM_Sans']">
          Manage your scheduling engines, team availability, and booking links
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          className="bg-[rgba(255,255,255,0.06)] border-[var(--bdr)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.1)] px-[18px] py-2 h-auto text-[13px] font-semibold font-['DM_Sans']"
        >
          View Public Pages
        </Button>
        <Button 
          onClick={onNewAppointment}
          className="bg-[var(--accent)] hover:bg-[#1d4ed8] text-white border-none px-[18px] py-2 h-auto text-[13px] font-semibold font-['DM_Sans'] shadow-lg shadow-blue-500/10"
        >
          <Plus className="w-4 h-4 mr-2" /> New Appointment
        </Button>
      </div>
    </div>
  );
}

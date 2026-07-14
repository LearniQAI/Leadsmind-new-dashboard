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
        <h1 className="text-[22px] font-bold leading-tight !text-dash-text">
          Appointment <span className="text-dash-accent">calendar</span>
        </h1>
        <p className="text-[11.5px] font-medium !text-dash-textMuted">
          Manage your scheduling engines, team availability, and booking links
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          className="bg-dash-surface border border-dash-border !text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/40 px-[18px] py-2 h-auto text-[13px] font-semibold transition-colors motion-reduce:transition-none"
        >
          View public pages
        </Button>
        <Button
          onClick={onNewAppointment}
          className="bg-dash-accent hover:bg-dash-accent/90 text-white border-none px-[18px] py-2 h-auto text-[13px] font-semibold shadow-lg shadow-dash-accent/10"
        >
          <Plus className="w-4 h-4 mr-2" /> New appointment
        </Button>
      </div>
    </div>
  );
}

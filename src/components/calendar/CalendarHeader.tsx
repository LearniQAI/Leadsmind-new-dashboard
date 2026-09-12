'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui';
import { toast } from 'sonner';

interface CalendarHeaderProps {
  workspaceName?: string;
  onNewAppointment?: () => void;
  calendars?: { slug: string }[];
  onViewPublicPages?: () => void;
}

export default function CalendarHeader({ workspaceName, onNewAppointment, calendars = [], onViewPublicPages }: CalendarHeaderProps) {
  const handleViewPublicPages = () => {
    if (calendars.length === 0) {
      toast.error('No public booking pages yet — create a booking engine first');
      return;
    }
    if (calendars.length === 1) {
      window.open(`${window.location.origin}/book/${calendars[0].slug}`, '_blank');
      return;
    }
    onViewPublicPages?.();
  };

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
        <DashButton variant="secondary" size="default" onClick={handleViewPublicPages}>
          View public pages
        </DashButton>
        <DashButton variant="primary" size="default" onClick={onNewAppointment}>
          <Plus className="w-4 h-4" /> New appointment
        </DashButton>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarEmptyStateProps {
  onCreateClick: () => void;
}

export default function CalendarEmptyState({ onCreateClick }: CalendarEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 bg-white border border-dashed border-dash-border rounded-2xl text-center">
      <div className="w-16 h-16 rounded-2xl bg-dash-surface flex items-center justify-center mb-6 border border-dash-border">
        <Calendar className="w-8 h-8 !text-dash-textMuted opacity-50" />
      </div>

      <h3 className="text-[15px] font-bold !text-dash-text mb-2">
        No calendars configured yet
      </h3>

      <p className="text-[13.5px] !text-dash-textMuted max-w-[320px] mb-8 leading-relaxed">
        Set up your first booking engine to start accepting appointments and growing your business.
      </p>

      <Button
        onClick={onCreateClick}
        className="bg-dash-accent hover:bg-dash-accent/90 text-white border-none px-6 py-2.5 h-auto text-[13.5px] font-semibold transition-colors motion-reduce:transition-none"
      >
        <Plus className="w-4 h-4 mr-2" /> Create first calendar
      </Button>
    </div>
  );
}

'use client';

import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CalendarEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 bg-[var(--card)] border border-dashed border-[var(--bdr)] rounded-[var(--r16)] text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--n700)] flex items-center justify-center mb-6 border border-[var(--bdr)]">
        <Calendar className="w-8 h-8 text-[var(--t3)] opacity-50" />
      </div>
      
      <h3 className="text-[15px] font-bold font-['Space_Grotesk'] text-[var(--t1)] mb-2">
        No calendars configured yet
      </h3>
      
      <p className="text-[13.5px] text-[var(--t3)] max-w-[320px] mb-8 font-['DM_Sans'] leading-relaxed">
        Set up your first booking engine to start accepting appointments and growing your business.
      </p>
      
      <Button 
        className="bg-[var(--accent)] hover:bg-[#1d4ed8] text-white border-none px-6 py-2.5 h-auto text-[13.5px] font-semibold font-['DM_Sans']"
      >
        <Plus className="w-4 h-4 mr-2" /> Create First Calendar
      </Button>
    </div>
  );
}

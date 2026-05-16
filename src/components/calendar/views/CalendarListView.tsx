'use client';

import React from 'react';
import { format } from 'date-fns';
import { Clock, User, MapPin, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarListViewProps {
  appointments: any[];
}

export default function CalendarListView({ appointments }: CalendarListViewProps) {
  // Sort by start time
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <div className="bg-[var(--card)] border border-[var(--bdr)] rounded-[var(--r16)] overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--n900)] border-b border-[var(--bdr)]">
            <tr>
              <th className="px-6 py-4 text-[11px] font-black text-[var(--t4)] uppercase tracking-widest">Appointment</th>
              <th className="px-6 py-4 text-[11px] font-black text-[var(--t4)] uppercase tracking-widest">Date & Time</th>
              <th className="px-6 py-4 text-[11px] font-black text-[var(--t4)] uppercase tracking-widest">Contact</th>
              <th className="px-6 py-4 text-[11px] font-black text-[var(--t4)] uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[11px] font-black text-[var(--t4)] uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--bdr)]">
            {sortedAppointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[var(--t3)] italic font-medium">
                  No scheduled appointments found.
                </td>
              </tr>
            ) : (
              sortedAppointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-[var(--t1)] font-['Space_Grotesk']">{appt.title}</span>
                      <span className="text-[11px] text-[var(--t3)] flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> Google Meet
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-[var(--t2)]">
                        {format(new Date(appt.start_time), 'MMM d, yyyy')}
                      </span>
                      <span className="text-[11px] text-[var(--t3)] flex items-center gap-1 mt-0.5 font-medium">
                        <Clock size={10} /> {format(new Date(appt.start_time), 'h:mm a')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {appt.contact ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--n700)] flex items-center justify-center text-[var(--accent2)] font-bold text-[12px] border border-[var(--bdr)]">
                          {appt.contact.first_name[0]}{appt.contact.last_name[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-[var(--t1)]">{appt.contact.first_name} {appt.contact.last_name}</span>
                          <span className="text-[11px] text-[var(--t4)]">{appt.contact.email}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[12px] text-[var(--t4)] italic">No contact assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      appt.status === 'scheduled' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                      appt.status === 'showed_up' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                      "bg-red-500/10 text-red-400 border border-red-500/20"
                    )}>
                      {appt.status || 'scheduled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-[var(--t4)] hover:text-[var(--t1)] hover:bg-[var(--n700)] rounded-[var(--r8)] transition-all">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
    <div className="bg-white border border-dash-border rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-dash-surface border-b border-dash-border">
            <tr>
              <th className="px-6 py-4 text-[11px] font-bold !text-dash-textMuted">Appointment</th>
              <th className="px-6 py-4 text-[11px] font-bold !text-dash-textMuted">Date & Time</th>
              <th className="px-6 py-4 text-[11px] font-bold !text-dash-textMuted">Contact</th>
              <th className="px-6 py-4 text-[11px] font-bold !text-dash-textMuted">Status</th>
              <th className="px-6 py-4 text-[11px] font-bold !text-dash-textMuted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dash-border">
            {sortedAppointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center !text-dash-textMuted italic font-medium">
                  No scheduled appointments found.
                </td>
              </tr>
            ) : (
              sortedAppointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-dash-surface transition-colors motion-reduce:transition-none group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold !text-dash-text">{appt.title}</span>
                      <span className="text-[11px] !text-dash-textMuted flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> Google Meet
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold !text-dash-text">
                        {format(new Date(appt.start_time), 'MMM d, yyyy')}
                      </span>
                      <span className="text-[11px] !text-dash-textMuted flex items-center gap-1 mt-0.5 font-medium">
                        <Clock size={10} /> {format(new Date(appt.start_time), 'h:mm a')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {appt.contact ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-dash-surface flex items-center justify-center text-dash-accent font-bold text-[12px] border border-dash-border">
                          {appt.contact.first_name[0]}{appt.contact.last_name[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold !text-dash-text">{appt.contact.first_name} {appt.contact.last_name}</span>
                          <span className="text-[11px] !text-dash-textMuted">{appt.contact.email}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[12px] !text-dash-textMuted italic">No contact assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold",
                      appt.status === 'scheduled' ? "bg-dash-accent/10 text-dash-accent border border-dash-accent/20" :
                      appt.status === 'showed_up' ? "bg-green/10 text-green border border-green/20" :
                      "bg-red/10 text-red border border-red/20"
                    )}>
                      {appt.status || 'scheduled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg transition-all motion-reduce:transition-none">
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

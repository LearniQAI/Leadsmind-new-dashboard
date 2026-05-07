'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Calendar as CalendarIcon, Users, Plus, List } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CalendarClient({ initialAppointments }: { initialAppointments: any[] }) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-primary bg-primary/10 border-primary/20';
      case 'showed_up': return 'text-success bg-success/10 border-success/20';
      case 'cancelled': return 'text-danger bg-danger/10 border-danger/20';
      case 'no_show': return 'text-warning bg-warning/10 border-warning/20';
      default: return 'text-white/50 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Calendar Main Area */}
      <div className="lg:col-span-2 bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-primary" /> Upcoming Sessions
          </h2>
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-xs border-none shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Book Appt
          </Button>
        </div>

        <div className="space-y-4">
          {initialAppointments.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
              <CalendarIcon className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-1">No appointments found</h3>
              <p className="text-white/40 text-sm">Your calendar is clear. Time to book some meetings!</p>
            </div>
          ) : (
            initialAppointments.map(appt => (
              <div key={appt.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors group">
                <div className="flex flex-col items-center justify-center min-w-[80px] p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <span className="text-sm font-black uppercase">{new Date(appt.start_time).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-2xl font-black">{new Date(appt.start_time).getDate()}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-white font-bold text-lg leading-tight">{appt.title}</h3>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(appt.status)}`}>
                      {appt.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-white/40 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-white/30" />
                      {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {appt.contacts && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-white/30" />
                        {appt.contacts.first_name} {appt.contacts.last_name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 mt-4 sm:mt-0">
                   {appt.waitlist_enabled && (
                     <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs font-bold">
                       <List className="w-3.5 h-3.5" /> Waitlist Active
                     </div>
                   )}
                   <Button variant="ghost" className="text-white/50 hover:text-white hover:bg-white/5 h-8 px-3 text-xs">
                     Manage
                   </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mini Sidebar (Waitlist / Stats) */}
      <div className="space-y-6">
        <div className="bg-[#0b0b1a] border border-white/10 rounded-3xl p-6 shadow-2xl">
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs opacity-70">Calendar Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
              <div className="text-3xl font-black text-white mb-1 tabular-nums">{initialAppointments.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total Appts</div>
            </div>
            <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20 text-center">
              <div className="text-3xl font-black text-primary mb-1 tabular-nums">
                {initialAppointments.filter(a => a.waitlist_enabled).length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Waitlisted</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1359FF] to-[#FF3CAC] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-150" />
           <h3 className="font-black uppercase tracking-wider text-lg mb-2 relative z-10">Waitlist Manager</h3>
           <p className="text-white/80 text-sm mb-4 relative z-10 font-medium">Automatically promote contacts when a spot opens up.</p>
           <Button className="w-full bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest text-xs h-10 relative z-10">
             View Waitlists <Clock className="w-4 h-4 ml-2" />
           </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { updateAppointmentStatus } from '@/app/actions/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  title: string;
  start_time: string;
  status: 'scheduled' | 'showed_up' | 'no_show' | 'cancelled';
  contact: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AppointmentsListProps {
  initialAppointments: Appointment[];
}

export function AppointmentsList({ initialAppointments }: AppointmentsListProps) {
  const [appointments, setAppointments] = React.useState(initialAppointments);

  const handleStatusUpdate = async (id: string, newStatus: 'showed_up' | 'no_show') => {
    const result = await updateAppointmentStatus(id, newStatus);
    if (result.success) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      toast.success(`Marked as ${newStatus === 'showed_up' ? 'Showed Up' : 'No Show'}`);
    } else {
      toast.error(result.error);
    }
  };

  if (!appointments.length) return (
    <div className="p-12 border border-dashed border-white/5 rounded-3xl text-center bg-white/[0.01] mt-8">
       <Clock className="h-8 w-8 text-white/5 mx-auto mb-4" />
       <p className="text-sm font-bold text-white/20 uppercase tracking-widest italic">No sessions found in history</p>
    </div>
  );

  return (
    <div className="bg-[#0b0b14] border border-white/5 rounded-3xl overflow-hidden mt-8">
      <Table>
        <TableHeader className="bg-white/[0.02]">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest px-6 py-4">Participant</TableHead>
            <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest py-4">Title</TableHead>
            <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest py-4">Time</TableHead>
            <TableHead className="text-white/40 font-bold uppercase text-[10px] tracking-widest py-4">Status</TableHead>
            <TableHead className="text-right text-white/40 font-bold uppercase text-[10px] tracking-widest px-6 py-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((apt) => (
            <TableRow key={apt.id} className="border-white/5 hover:bg-white/[0.01] transition-colors group">
              <TableCell className="px-6 py-6">
                 <div className="flex flex-col">
                   <span className="font-bold text-white tracking-tight group-hover:text-[#6c47ff] transition-colors">{apt.contact?.first_name || 'Unknown'} {apt.contact?.last_name || ''}</span>
                   <span className="text-xs text-white/30 uppercase tracking-tighter">{apt.contact?.email}</span>
                 </div>
              </TableCell>
              <TableCell className="py-6">
                 <span className="text-sm font-medium text-white/70 italic">"{apt.title}"</span>
              </TableCell>
              <TableCell className="py-6">
                 <div className="flex items-center gap-2 text-xs font-bold text-white/40">
                   <Clock className="h-3.5 w-3.5 text-[#6c47ff]" />
                   {new Date(apt.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                 </div>
              </TableCell>
              <TableCell className="py-6">
                 <Badge 
                   variant="outline" 
                   className={cn(
                     "text-[10px] font-black uppercase tracking-tighter border-none px-3 py-1",
                     apt.status === 'scheduled' && "bg-blue-500/10 text-blue-500",
                     apt.status === 'showed_up' && "bg-emerald-500/10 text-emerald-500",
                     apt.status === 'no_show' && "bg-rose-500/10 text-rose-500",
                     apt.status === 'cancelled' && "bg-white/10 text-white/40"
                   )}
                 >
                   {apt.status === 'showed_up' ? 'Showed Up' : apt.status.replace('_', ' ')}
                 </Badge>
              </TableCell>
              <TableCell className="text-right px-6 py-6">
                 {apt.status === 'scheduled' && (
                   <div className="flex items-center justify-end gap-2">
                      <Button 
                        size="icon"
                        variant="ghost" 
                        className="h-10 w-10 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/20 text-emerald-500/50 hover:text-emerald-500 border border-emerald-500/10"
                        onClick={() => handleStatusUpdate(apt.id, 'showed_up')}
                      >
                         <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon"
                        variant="ghost" 
                        className="h-10 w-10 rounded-xl bg-rose-500/5 hover:bg-rose-500/20 text-rose-500/50 hover:text-rose-500 border border-rose-500/10"
                        onClick={() => handleStatusUpdate(apt.id, 'no_show')}
                      >
                         <XCircle className="h-4 w-4" />
                      </Button>
                   </div>
                 )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

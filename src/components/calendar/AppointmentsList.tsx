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
  <div className="p-12 border border-dashed border-dash-border rounded-3xl text-center bg-dash-surface mt-8">
    <Clock className="h-8 w-8 !text-dash-textMuted opacity-40 mx-auto mb-4" />
    <p className="text-sm font-bold !text-dash-textMuted">No sessions found in history</p>
  </div>
 );

 return (
  <div className="bg-white border border-dash-border rounded-3xl overflow-hidden mt-8 shadow-sm">
   <Table>
    <TableHeader className="bg-dash-surface">
     <TableRow className="border-dash-border hover:bg-transparent">
      <TableHead className="!text-dash-textMuted font-bold text-[10px] px-6 py-4">Participant</TableHead>
      <TableHead className="!text-dash-textMuted font-bold text-[10px] py-4">Title</TableHead>
      <TableHead className="!text-dash-textMuted font-bold text-[10px] py-4">Time</TableHead>
      <TableHead className="!text-dash-textMuted font-bold text-[10px] py-4">Status</TableHead>
      <TableHead className="text-right !text-dash-textMuted font-bold text-[10px] px-6 py-4">Actions</TableHead>
     </TableRow>
    </TableHeader>
    <TableBody>
     {appointments.map((apt) => (
      <TableRow key={apt.id} className="border-dash-border hover:bg-dash-surface transition-colors motion-reduce:transition-none group">
       <TableCell className="px-6 py-6">
         <div className="flex flex-col">
          <span className="font-bold !text-dash-text group-hover:text-dash-accent transition-colors motion-reduce:transition-none">{apt.contact?.first_name || 'Unknown'} {apt.contact?.last_name || ''}</span>
          <span className="text-xs !text-dash-textMuted">{apt.contact?.email}</span>
         </div>
       </TableCell>
       <TableCell className="py-6">
         <span className="text-sm font-medium !text-dash-textMuted">"{apt.title}"</span>
       </TableCell>
       <TableCell className="py-6">
         <div className="flex items-center gap-2 text-xs font-bold !text-dash-textMuted">
          <Clock className="h-3.5 w-3.5 text-dash-accent" />
          {new Date(apt.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
         </div>
       </TableCell>
       <TableCell className="py-6">
         <Badge
          variant="outline"
          className={cn(
           "text-[10px] font-bold border-none px-3 py-1",
           apt.status === 'scheduled' && "bg-dash-accent/10 text-dash-accent",
           apt.status === 'showed_up' && "bg-green/10 text-green",
           apt.status === 'no_show' && "bg-red/10 text-red",
           apt.status === 'cancelled' && "bg-dash-surface !text-dash-textMuted"
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
            className="h-10 w-10 rounded-xl bg-green/5 hover:bg-green/20 text-green/60 hover:text-green border border-green/10 transition-colors motion-reduce:transition-none"
            onClick={() => handleStatusUpdate(apt.id, 'showed_up')}
           >
             <CheckCircle2 className="h-4 w-4" />
           </Button>
           <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-xl bg-red/5 hover:bg-red/20 text-red/60 hover:text-red border border-red/10 transition-colors motion-reduce:transition-none"
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

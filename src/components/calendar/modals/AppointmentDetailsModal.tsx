'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Calendar as CalendarIcon,
  User,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Video,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onCancel?: (id: string) => void;
  onEdit?: (appointment: any) => void;
  onReschedule?: (appointment: any) => void;
}

export default function AppointmentDetailsModal({ 
  isOpen, 
  onClose, 
  appointment,
  onCancel,
  onEdit,
  onReschedule
}: AppointmentDetailsModalProps) {
  if (!appointment) return null;

  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] z-[1002] bg-[var(--n800)] border-[var(--bdr)] text-[var(--t1)]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent)] bg-opacity-10 text-[var(--accent2)] text-[10px] font-black uppercase tracking-widest border border-[var(--accent)] border-opacity-20">
              {appointment.calendar?.calendar_type || 'Booking'}
            </span>
          </div>
          <DialogTitle className="text-[22px] font-bold font-['Space_Grotesk'] text-[var(--t1)] leading-tight">
            {appointment.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time & Date */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--n900)] flex items-center justify-center text-[var(--t3)] border border-[var(--bdr)]">
              <CalendarIcon size={20} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[var(--t1)]">{format(startTime, 'EEEE, MMMM do, yyyy')}</p>
              <p className="text-[12px] font-medium text-[var(--t3)] flex items-center gap-1.5 mt-0.5">
                <Clock size={14} className="text-[var(--accent2)]" />
                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          {appointment.contact && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--n900)] flex items-center justify-center text-[var(--t3)] border border-[var(--bdr)]">
                <User size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-[var(--t1)]">{appointment.contact.first_name} {appointment.contact.last_name}</p>
                <p className="text-[12px] font-medium text-[var(--t3)] flex items-center gap-1.5 mt-0.5">
                  <Mail size={14} className="text-[var(--accent2)]" />
                  {appointment.contact.email}
                </p>
              </div>
            </div>
          )}

          {/* Location / Meeting Link */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--n900)] flex items-center justify-center text-[var(--t3)] border border-[var(--bdr)]">
              <Video size={20} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[var(--t1)]">
                {appointment.metadata?.meeting_mode?.replace('_', ' ') || 'Meeting Link'}
              </p>
              {appointment.meeting_link ? (
                <a 
                  href={appointment.meeting_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium text-[var(--accent2)] hover:underline mt-0.5 block truncate max-w-[280px]"
                >
                  {appointment.meeting_link}
                </a>
              ) : (
                <p className="text-[12px] text-[var(--t4)] italic mt-0.5">No meeting link generated</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[var(--bdr)] pt-4 mt-2 gap-2 sm:gap-0">
          <div className="flex-1 flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => onCancel?.(appointment.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[11px] font-bold uppercase tracking-widest"
            >
              <Trash2 size={16} className="mr-2" /> Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => onEdit?.(appointment)}
              className="text-[var(--t3)] hover:text-[var(--t1)] text-[11px] font-bold uppercase tracking-widest"
            >
              <Edit size={16} className="mr-2" /> Edit
            </Button>
            <Button 
              onClick={() => onReschedule?.(appointment)}
              className="bg-[var(--accent)] hover:bg-[var(--accent2)] text-white text-[11px] font-bold uppercase tracking-widest px-6"
            >
              Reschedule
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

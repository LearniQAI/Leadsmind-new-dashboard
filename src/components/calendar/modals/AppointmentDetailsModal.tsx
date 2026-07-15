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
      <DialogContent className="sm:max-w-[450px] z-[1002] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-dash-accent/10 text-dash-accent text-[10px] font-bold border border-dash-accent/20">
              {appointment.calendar?.calendar_type || 'Booking'}
            </span>
          </div>
          <DialogTitle className="text-[22px] font-bold !text-dash-text leading-tight">
            {appointment.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time & Date */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-dash-surface flex items-center justify-center !text-dash-textMuted border border-dash-border">
              <CalendarIcon size={20} />
            </div>
            <div>
              <p className="text-[14px] font-bold !text-dash-text">{format(startTime, 'EEEE, MMMM do, yyyy')}</p>
              <p className="text-[12px] font-medium !text-dash-textMuted flex items-center gap-1.5 mt-0.5">
                <Clock size={14} className="text-dash-accent" />
                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          {appointment.contact && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-dash-surface flex items-center justify-center !text-dash-textMuted border border-dash-border">
                <User size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold !text-dash-text">{appointment.contact.first_name} {appointment.contact.last_name}</p>
                <p className="text-[12px] font-medium !text-dash-textMuted flex items-center gap-1.5 mt-0.5">
                  <Mail size={14} className="text-dash-accent" />
                  {appointment.contact.email}
                </p>
              </div>
            </div>
          )}

          {/* Location / Meeting Link */}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-dash-surface flex items-center justify-center !text-dash-textMuted border border-dash-border">
              <Video size={20} />
            </div>
            <div>
              <p className="text-[14px] font-bold !text-dash-text">
                {appointment.metadata?.meeting_mode?.replace('_', ' ') || 'Meeting Link'}
              </p>
              {appointment.meeting_link ? (
                <a
                  href={appointment.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium text-dash-accent hover:underline mt-0.5 block truncate max-w-[280px]"
                >
                  {appointment.meeting_link}
                </a>
              ) : (
                <p className="text-[12px] !text-dash-textMuted italic mt-0.5">No meeting link generated</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-dash-border pt-4 mt-2 gap-2 sm:gap-0">
          <div className="flex-1 flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onCancel?.(appointment.id)}
              className="text-red hover:text-red/80 hover:bg-red/10 text-[11px] font-bold"
            >
              <Trash2 size={16} className="mr-2" /> Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onEdit?.(appointment)}
              className="!text-dash-textMuted hover:!text-dash-text text-[11px] font-bold"
            >
              <Edit size={16} className="mr-2" /> Edit
            </Button>
            <Button
              onClick={() => onReschedule?.(appointment)}
              className="bg-dash-accent hover:bg-dash-accent/90 text-white text-[11px] font-bold px-6 transition-colors motion-reduce:transition-none"
            >
              Reschedule
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Video, Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getManageAvailableSlots,
  cancelAppointmentByToken,
  rescheduleAppointmentByToken,
} from '@/app/actions/calendar/manage';

interface AppointmentSummary {
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  meetingLink: string | null;
  meetingLinkNote?: string | null;
  calendarName: string | null;
  timezone: string;
  bookerFirstName: string | null;
  cancellationWindowHours: number;
  withinLockout: boolean;
  calendarId: string | null;
}

interface ManageBookingClientProps {
  token: string;
  appointment: AppointmentSummary;
}

type View = 'details' | 'confirm-cancel' | 'reschedule' | 'cancelled' | 'rescheduled';

function Terminal({ tone, title, line }: { tone: 'success' | 'danger'; title: string; line: string }) {
  return (
    <div className="p-8 text-center">
      <div
        className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5',
          tone === 'success' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
        )}
      >
        {tone === 'success' ? <CheckCircle2 size={24} strokeWidth={2} /> : <XCircle size={24} strokeWidth={2} />}
      </div>
      <h2 className="text-lg font-bold font-space text-dash-text mb-1.5">{title}</h2>
      <p className="text-[14px] leading-relaxed text-dash-textMuted">{line}</p>
    </div>
  );
}

const primaryBtn =
  'w-full h-12 rounded-xl bg-gradient-to-b from-dash-accent to-[#0F47CC] text-white text-[14px] font-bold shadow-[0_4px_16px_rgba(19,89,255,0.3)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 transition-all duration-200 motion-reduce:transition-none disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2';

export default function ManageBookingClient({ token, appointment }: ManageBookingClientProps) {
  const [view, setView] = useState<View>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<{ start: string; timeLabel: string }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [newTime, setNewTime] = useState<string | null>(null);

  useEffect(() => {
    if (view !== 'reschedule') return;
    let cancelled = false;
    setIsLoadingSlots(true);
    getManageAvailableSlots(token, selectedDate).then((res) => {
      if (cancelled) return;
      if (res.success) setSlots(res.data as any);
      else setError(res.error || 'Failed to load availability');
      setIsLoadingSlots(false);
    });
    return () => { cancelled = true; };
  }, [view, selectedDate, token]);

  const handleCancel = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await cancelAppointmentByToken(token);
    setIsSubmitting(false);
    if (res.success) setView('cancelled');
    else setError(res.error || 'Failed to cancel this booking.');
  };

  const handleReschedule = async () => {
    if (!newTime) return;
    setIsSubmitting(true);
    setError(null);
    const res = await rescheduleAppointmentByToken(token, newTime);
    setIsSubmitting(false);
    if (res.success) setView('rescheduled');
    else setError(res.error || 'Failed to reschedule this booking.');
  };

  if (view === 'cancelled') {
    return <Terminal tone="success" title="Booking cancelled" line="You'll receive a cancellation confirmation by email. The team has been notified." />;
  }
  if (view === 'rescheduled') {
    return <Terminal tone="success" title="Booking rescheduled" line="You'll receive a confirmation of the new time by email. The team has been notified." />;
  }

  if (view === 'reschedule') {
    return (
      <div className="p-6 sm:p-8">
        <button onClick={() => setView('details')} className="flex items-center gap-1.5 text-[13px] font-semibold text-dash-textMuted hover:text-dash-text mb-5">
          <ArrowLeft size={14} strokeWidth={2} /> Back
        </button>
        <h2 className="text-lg font-bold font-space text-dash-text mb-1">Pick a new time</h2>
        <p className="text-[13px] text-dash-textMuted mb-5">
          Current: {format(new Date(appointment.startTime), 'EEEE, MMMM d')} · {appointment.timezone}
        </p>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dateStr = format(d, 'yyyy-MM-dd');
            const active = selectedDate === dateStr;
            return (
              <button
                key={i}
                onClick={() => { setSelectedDate(dateStr); setNewTime(null); }}
                className={cn(
                  'w-11 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-colors motion-reduce:transition-none',
                  active ? 'bg-dash-accent text-white border-dash-accent' : 'bg-white border-dash-border text-dash-textMuted hover:border-dash-accent/40'
                )}
              >
                <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">{format(d, 'EEE')}</span>
                <span className="text-[14px] font-bold">{format(d, 'd')}</span>
              </button>
            );
          })}
        </div>

        {isLoadingSlots ? (
          <div className="flex items-center justify-center py-10 text-dash-textMuted text-[13px]">
            <Loader2 className="animate-spin motion-reduce:hidden mr-2" size={16} /> Loading availability…
          </div>
        ) : slots.length === 0 ? (
          <p className="text-dash-textMuted text-[13px] py-8 text-center">No available times on this day.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto mb-5">
            {slots.map((s) => (
              <button
                key={s.start}
                onClick={() => setNewTime(s.start)}
                className={cn(
                  'h-10 rounded-lg text-[13px] font-semibold border transition-colors motion-reduce:transition-none',
                  newTime === s.start ? 'bg-dash-accent text-white border-dash-accent' : 'bg-white border-dash-border text-dash-text hover:border-dash-accent/40'
                )}
              >
                {s.timeLabel}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-red text-[13px] mb-4">{error}</p>}

        <button onClick={handleReschedule} disabled={!newTime || isSubmitting} className={primaryBtn}>
          {isSubmitting ? <Loader2 className="animate-spin motion-reduce:hidden" size={16} /> : 'Confirm new time'}
        </button>
      </div>
    );
  }

  if (view === 'confirm-cancel') {
    return (
      <div className="p-6 sm:p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red/10 text-red flex items-center justify-center mx-auto mb-5">
          <XCircle size={24} strokeWidth={2} />
        </div>
        <h2 className="text-lg font-bold font-space text-dash-text mb-1.5">Cancel this booking?</h2>
        <p className="text-[14px] text-dash-textMuted mb-5">This can't be undone. The slot will be released.</p>
        {error && <p className="text-red text-[13px] mb-4">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => setView('details')} className="flex-1 h-11 rounded-xl border border-dash-border bg-white text-dash-text font-semibold text-[13px] hover:bg-dash-surface transition-colors motion-reduce:transition-none">
            Keep booking
          </button>
          <button onClick={handleCancel} disabled={isSubmitting} className="flex-1 h-11 rounded-xl bg-red text-white font-semibold text-[13px] hover:bg-red/90 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors motion-reduce:transition-none">
            {isSubmitting ? <Loader2 className="animate-spin motion-reduce:hidden" size={16} /> : 'Yes, cancel'}
          </button>
        </div>
      </div>
    );
  }

  // details view
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-xl font-bold font-space text-dash-text mb-0.5">{appointment.title}</h1>
      {appointment.calendarName && <p className="text-[13px] text-dash-textMuted mb-5">{appointment.calendarName}</p>}

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <Calendar size={16} strokeWidth={2} className="text-dash-accent shrink-0" />
          <span className="text-[14px] font-medium text-dash-text">{format(new Date(appointment.startTime), 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={16} strokeWidth={2} className="text-dash-accent shrink-0" />
          <span className="text-[14px] font-medium text-dash-text">
            {format(new Date(appointment.startTime), 'HH:mm')}–{format(new Date(appointment.endTime), 'HH:mm')} ({appointment.timezone})
          </span>
        </div>
        {appointment.meetingLink && (
          <div className="flex items-center gap-3">
            <Video size={16} strokeWidth={2} className="text-dash-accent shrink-0" />
            <a href={appointment.meetingLink} className="text-[14px] font-medium text-dash-accent hover:underline break-all">
              {appointment.meetingLink}
            </a>
          </div>
        )}
        {!appointment.meetingLink && appointment.meetingLinkNote && (
          <div className="flex items-start gap-3">
            <Video size={16} strokeWidth={2} className="text-dash-textMuted mt-0.5 shrink-0" />
            <span className="text-[14px] text-dash-textMuted">{appointment.meetingLinkNote}</span>
          </div>
        )}
      </div>

      {appointment.withinLockout ? (
        <div className="p-3.5 rounded-xl bg-amber/5 border border-amber/20 text-[13px] leading-relaxed text-amber">
          This booking is within the {appointment.cancellationWindowHours}-hour change window and can no longer be cancelled or rescheduled online. Please contact us directly.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => setView('reschedule')} className="flex-1 h-11 rounded-xl border border-dash-border bg-white text-dash-text font-semibold text-[13px] hover:border-dash-accent/40 transition-colors motion-reduce:transition-none">
            Reschedule
          </button>
          <button onClick={() => setView('confirm-cancel')} className="flex-1 h-11 rounded-xl border border-red/30 text-red font-semibold text-[13px] hover:bg-red/5 transition-colors motion-reduce:transition-none">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

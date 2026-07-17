'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Video, Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
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
    return (
      <div className="p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={28} />
        </div>
        <h2 className="text-xl font-bold mb-2">Booking cancelled</h2>
        <p className="text-[var(--t3)] text-sm">You'll receive a cancellation confirmation by email. The team has been notified.</p>
      </div>
    );
  }

  if (view === 'rescheduled') {
    return (
      <div className="p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={28} />
        </div>
        <h2 className="text-xl font-bold mb-2">Booking rescheduled</h2>
        <p className="text-[var(--t3)] text-sm">You'll receive a confirmation of the new time by email. The team has been notified.</p>
      </div>
    );
  }

  if (view === 'reschedule') {
    return (
      <div className="p-8">
        <button onClick={() => setView('details')} className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--t4)] hover:text-[var(--t2)] mb-6">
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="text-lg font-bold mb-1">Pick a new time</h2>
        <p className="text-[var(--t3)] text-xs mb-6">Current: {format(new Date(appointment.startTime), 'EEEE, MMMM d')} · {appointment.timezone}</p>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dateStr = format(d, 'yyyy-MM-dd');
            return (
              <button
                key={i}
                onClick={() => { setSelectedDate(dateStr); setNewTime(null); }}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                  selectedDate === dateStr ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--n900)] border-[var(--bdr)] text-[var(--t4)]'
                }`}
              >
                <span className="text-[8px] font-black uppercase">{format(d, 'EEE')}</span>
                <span className="text-[13px] font-bold">{format(d, 'd')}</span>
              </button>
            );
          })}
        </div>

        {isLoadingSlots ? (
          <div className="flex items-center justify-center py-12 text-[var(--t4)]">
            <Loader2 className="animate-spin mr-2" size={18} /> Loading availability...
          </div>
        ) : slots.length === 0 ? (
          <p className="text-[var(--t4)] text-sm py-8 text-center">No available slots on this day.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto mb-6">
            {slots.map((s) => (
              <button
                key={s.start}
                onClick={() => setNewTime(s.start)}
                className={`h-10 rounded-lg text-[12px] font-bold border transition-all ${
                  newTime === s.start ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--n900)] border-[var(--bdr)] text-[var(--t2)] hover:border-[var(--accent)]'
                }`}
              >
                {s.timeLabel}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          onClick={handleReschedule}
          disabled={!newTime || isSubmitting}
          className="w-full h-12 rounded-xl bg-[var(--accent)] text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Confirm new time'}
        </button>
      </div>
    );
  }

  if (view === 'confirm-cancel') {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
          <XCircle size={28} />
        </div>
        <h2 className="text-lg font-bold mb-2">Cancel this booking?</h2>
        <p className="text-[var(--t3)] text-sm mb-6">This can't be undone. The slot will be released.</p>
        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
        <div className="flex gap-3">
          <button onClick={() => setView('details')} className="flex-1 h-11 rounded-xl border border-[var(--bdr)] text-[var(--t2)] font-bold text-sm">
            Keep booking
          </button>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Yes, cancel'}
          </button>
        </div>
      </div>
    );
  }

  // details view
  return (
    <div className="p-8">
      <h1 className="text-2xl font-black mb-1">{appointment.title}</h1>
      {appointment.calendarName && <p className="text-[var(--t4)] text-xs font-bold uppercase tracking-widest mb-6">{appointment.calendarName}</p>}

      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-[var(--accent2)]" />
          <span className="text-sm font-semibold">{format(new Date(appointment.startTime), 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-[var(--accent2)]" />
          <span className="text-sm font-semibold">
            {format(new Date(appointment.startTime), 'HH:mm')}–{format(new Date(appointment.endTime), 'HH:mm')} ({appointment.timezone})
          </span>
        </div>
        {appointment.meetingLink && (
          <div className="flex items-center gap-3">
            <Video size={16} className="text-[var(--accent2)]" />
            <a href={appointment.meetingLink} className="text-sm font-semibold text-[var(--accent2)] hover:underline break-all">
              {appointment.meetingLink}
            </a>
          </div>
        )}
      </div>

      {appointment.withinLockout ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
          This booking is within the {appointment.cancellationWindowHours}-hour change window and can no longer be cancelled or rescheduled online. Please contact us directly.
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={() => setView('reschedule')}
            className="flex-1 h-11 rounded-xl border border-[var(--bdr)] text-[var(--t2)] font-bold text-sm hover:border-[var(--accent)]"
          >
            Reschedule
          </button>
          <button
            onClick={() => setView('confirm-cancel')}
            className="flex-1 h-11 rounded-xl border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/10"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

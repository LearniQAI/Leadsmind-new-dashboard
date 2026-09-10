'use client';

import React, { useState } from 'react';
import { CheckCircle2, Calendar, Video, Loader2, XCircle } from 'lucide-react';
import { cancelAttendeeByToken } from '@/app/actions/calendar/waitlistAccept';

interface AttendeeBooking {
  title: string | null;
  sessionName: string | null;
  when: string | null;
  meetingLink: string | null;
  firstName: string | null;
  sessionCancelled: boolean;
  cancellable: boolean;
  cancelWindowHours: number;
}

export default function AttendeeManageClient({ token, booking }: { token: string; booking: AttendeeBooking }) {
  const [view, setView] = useState<'booking' | 'cancelled'>('booking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    if (!window.confirm('Cancel your spot for this session? The session itself will still go ahead.')) return;
    setBusy(true);
    setError(null);
    const res = await cancelAttendeeByToken(token);
    setBusy(false);
    if (res.success) setView('cancelled');
    else setError(res.error);
  };

  if (view === 'cancelled') {
    return (
      <div className="p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-5">
          <XCircle size={30} />
        </div>
        <h1 className="text-xl font-bold mb-2">Your spot is cancelled</h1>
        <p className="text-[var(--t3)] text-sm leading-relaxed">
          We&apos;ve released your spot for <span className="font-semibold text-[var(--t1)]">{booking.title}</span>. A
          confirmation email is on its way.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="inline-flex items-center gap-2 mb-5 text-[var(--green)]">
        <CheckCircle2 size={18} />
        <span className="text-[11px] font-black uppercase tracking-widest">Your spot is confirmed</span>
      </div>

      <h1 className="text-[22px] font-bold mb-1">{booking.title ?? 'Your session'}</h1>
      {booking.sessionName && <p className="text-[var(--t4)] text-sm mb-6">{booking.sessionName}</p>}

      <div className="space-y-3 mb-6">
        {booking.when && (
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={16} className="text-[var(--accent2)]" />
            <span className="font-semibold">{booking.when}</span>
          </div>
        )}
        {booking.meetingLink && !booking.sessionCancelled && (
          <div className="flex items-center gap-3 text-sm">
            <Video size={16} className="text-[var(--accent2)]" />
            <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="text-[var(--accent2)] underline break-all">
              {booking.meetingLink}
            </a>
          </div>
        )}
      </div>

      {booking.sessionCancelled ? (
        <p className="text-red-400 text-[13px] leading-relaxed">
          This session has been cancelled by the host. You don&apos;t need to do anything.
        </p>
      ) : (
        <>
          {error && <p className="text-red-400 text-[13px] mb-4">{error}</p>}
          {booking.cancellable ? (
            <button
              onClick={cancel}
              disabled={busy}
              className="h-11 px-5 rounded-xl border border-red-500/30 text-red-400 text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-red-500/10 transition-colors"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : null}
              Cancel my spot
            </button>
          ) : (
            <p className="text-[var(--t3)] text-[13px] leading-relaxed">
              Cancellations close {booking.cancelWindowHours} hours before the session starts, so this spot can no longer
              be cancelled online. Contact the organiser if you can&apos;t attend.
            </p>
          )}
        </>
      )}
    </div>
  );
}

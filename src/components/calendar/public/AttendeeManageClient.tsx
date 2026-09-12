'use client';

import React, { useState } from 'react';
import { CheckCircle2, Calendar, Video, Loader2, XCircle } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui';
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
      <div className="p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red/10 text-red flex items-center justify-center mx-auto mb-5">
          <XCircle size={26} strokeWidth={2} />
        </div>
        <h1 className="text-lg font-bold font-space text-dash-text mb-1.5">Your spot is cancelled</h1>
        <p className="text-[14px] leading-relaxed text-dash-textMuted">
          We&apos;ve released your spot for <span className="font-semibold text-dash-text">{booking.title}</span>. A
          confirmation email is on its way.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green/10 px-2.5 py-1 text-[11px] font-semibold text-green mb-4">
        <CheckCircle2 size={13} strokeWidth={2} /> Your spot is confirmed
      </span>

      <h1 className="text-xl font-bold font-space text-dash-text mb-0.5">{booking.title ?? 'Your session'}</h1>
      {booking.sessionName && <p className="text-[13px] text-dash-textMuted mb-5">{booking.sessionName}</p>}

      <div className="space-y-3 mb-5">
        {booking.when && (
          <div className="flex items-center gap-3 text-[14px]">
            <Calendar size={16} strokeWidth={2} className="text-dash-accent shrink-0" />
            <span className="font-medium text-dash-text">{booking.when}</span>
          </div>
        )}
        {booking.meetingLink && !booking.sessionCancelled && (
          <div className="flex items-center gap-3 text-[14px]">
            <Video size={16} strokeWidth={2} className="text-dash-accent shrink-0" />
            <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="text-dash-accent hover:underline break-all">
              {booking.meetingLink}
            </a>
          </div>
        )}
      </div>

      {booking.sessionCancelled ? (
        <div className="p-3.5 rounded-xl bg-red/5 border border-red/20 text-[13px] leading-relaxed text-red">
          This session has been cancelled by the host. You don&apos;t need to do anything.
        </div>
      ) : (
        <>
          {error && <p className="text-red text-[13px] mb-4">{error}</p>}
          {booking.cancellable ? (
            <DashButton onClick={cancel} disabled={busy} variant="destructive">
              {busy ? <Loader2 size={15} className="animate-spin motion-reduce:hidden" /> : null}
              Cancel my spot
            </DashButton>
          ) : (
            <p className="text-[13px] leading-relaxed text-dash-textMuted">
              Cancellations close {booking.cancelWindowHours} hours before the session starts, so this spot can no longer
              be cancelled online. Contact the organiser if you can&apos;t attend.
            </p>
          )}
        </>
      )}
    </div>
  );
}

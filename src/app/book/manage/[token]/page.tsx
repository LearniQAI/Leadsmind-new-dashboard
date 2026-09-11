import React from 'react';
import { getAppointmentByToken } from '@/app/actions/calendar/manage';
import ManageBookingClient from '@/components/calendar/public/ManageBookingClient';
import { CalendarCog, XCircle } from 'lucide-react';

export default async function ManageBookingPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = await params;
  // Server-side verification on the very first render — the token is
  // re-verified again inside every cancel/reschedule server action too (see
  // manage.ts's resolveVerifiedAppointment), so this page render is not the
  // only gate, just the first one.
  const result = await getAppointmentByToken(token);

  if (!result.success || !result.data) {
    return (
      <main className="min-h-screen bg-dash-bg text-dash-text flex items-center justify-center px-5">
        <div className="max-w-md w-full rounded-2xl border border-dash-border bg-white p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red/10 text-red flex items-center justify-center mx-auto mb-5">
            <XCircle size={24} strokeWidth={2} />
          </div>
          <h1 className="text-lg font-bold font-space text-dash-text mb-1.5">Link unavailable</h1>
          <p className="text-[14px] leading-relaxed text-dash-textMuted">{result.error || 'This management link is invalid.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dash-bg text-dash-text">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-dash-surface to-dash-bg pointer-events-none" />
      <div className="relative max-w-[540px] mx-auto px-5 sm:px-6 py-10 lg:py-16">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-dash-accent/10 px-2.5 py-1 text-[11px] font-semibold text-dash-accent mb-5">
          <CalendarCog size={13} strokeWidth={2} /> Manage your booking
        </span>

        <div className="rounded-2xl border border-dash-border bg-white shadow-sm overflow-hidden">
          <ManageBookingClient token={token} appointment={result.data} />
        </div>
      </div>
    </main>
  );
}

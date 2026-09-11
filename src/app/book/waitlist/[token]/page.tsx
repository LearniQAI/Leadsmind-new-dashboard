import React from 'react';
import { getWaitlistOffer, getAttendeeBooking } from '@/app/actions/calendar/waitlistAccept';
import WaitlistAcceptClient from '@/components/calendar/public/WaitlistAcceptClient';
import AttendeeManageClient from '@/components/calendar/public/AttendeeManageClient';
import { Sparkles, XCircle, CalendarCheck2 } from 'lucide-react';

function Shell({ eyebrow, icon, children }: { eyebrow: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-dash-bg text-dash-text">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-dash-surface to-dash-bg pointer-events-none" />
      <div className="relative max-w-[540px] mx-auto px-5 sm:px-6 py-10 lg:py-16">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-dash-accent/10 px-2.5 py-1 text-[11px] font-semibold text-dash-accent mb-5">
          {icon} {eyebrow}
        </span>
        <div className="rounded-2xl border border-dash-border bg-white shadow-sm overflow-hidden">{children}</div>
      </div>
    </main>
  );
}

export default async function WaitlistOfferPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = await params;

  // Once someone holds a confirmed spot, this same link is their permanent
  // "manage my booking" page (the token is scoped to their attendee record).
  const attendee = await getAttendeeBooking(token);
  if (attendee.success) {
    return (
      <Shell eyebrow="Your session" icon={<CalendarCheck2 size={13} strokeWidth={2} />}>
        <AttendeeManageClient token={token} booking={attendee.data} />
      </Shell>
    );
  }

  // Re-verified again inside acceptWaitlistOffer / declineWaitlistOffer — this
  // render is just the first gate.
  const result = await getWaitlistOffer(token);

  if (!result.success) {
    return (
      <main className="min-h-screen bg-dash-bg text-dash-text flex items-center justify-center px-5">
        <div className="max-w-md w-full rounded-2xl border border-dash-border bg-white p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red/10 text-red flex items-center justify-center mx-auto mb-5">
            <XCircle size={24} strokeWidth={2} />
          </div>
          <h1 className="text-lg font-bold font-space text-dash-text mb-1.5">Offer unavailable</h1>
          <p className="text-[14px] leading-relaxed text-dash-textMuted">{result.error}</p>
        </div>
      </main>
    );
  }

  return (
    <Shell eyebrow="A spot opened up" icon={<Sparkles size={13} strokeWidth={2} />}>
      <WaitlistAcceptClient token={token} offer={result.data} />
    </Shell>
  );
}

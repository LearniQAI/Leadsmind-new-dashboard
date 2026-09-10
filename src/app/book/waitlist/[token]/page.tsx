import React from 'react';
import { getWaitlistOffer, getAttendeeBooking } from '@/app/actions/calendar/waitlistAccept';
import WaitlistAcceptClient from '@/components/calendar/public/WaitlistAcceptClient';
import AttendeeManageClient from '@/components/calendar/public/AttendeeManageClient';
import { Sparkles, XCircle } from 'lucide-react';

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
      <main className="min-h-screen bg-[var(--n900)] text-[var(--t1)] selection:bg-[var(--accent)] selection:text-white">
        <div className="relative max-w-[520px] mx-auto px-6 py-12 lg:py-24">
          <div className="bg-[var(--n800)] rounded-[var(--r32)] border border-[var(--bdr)] shadow-2xl overflow-hidden">
            <AttendeeManageClient token={token} booking={attendee.data} />
          </div>
        </div>
      </main>
    );
  }

  // Re-verified again inside acceptWaitlistOffer / declineWaitlistOffer — this
  // render is just the first gate.
  const result = await getWaitlistOffer(token);

  if (!result.success) {
    return (
      <main className="min-h-screen bg-[var(--n900)] text-[var(--t1)] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r24)] p-10 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6">
            <XCircle size={28} />
          </div>
          <h1 className="text-xl font-bold mb-2">Offer unavailable</h1>
          <p className="text-[var(--t3)] text-sm leading-relaxed">{result.error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--n900)] text-[var(--t1)] selection:bg-[var(--accent)] selection:text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)] opacity-[0.03] blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-[520px] mx-auto px-6 py-12 lg:py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)] bg-opacity-10 border border-[var(--accent)] border-opacity-20 mb-6">
          <Sparkles size={14} className="text-[var(--accent2)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent2)]">A spot opened up</span>
        </div>

        <div className="bg-[var(--n800)] rounded-[var(--r32)] border border-[var(--bdr)] shadow-2xl overflow-hidden">
          <WaitlistAcceptClient token={token} offer={result.data} />
        </div>
      </div>
    </main>
  );
}

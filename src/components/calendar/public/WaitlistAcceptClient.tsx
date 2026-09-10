'use client';

import React, { useState } from 'react';
import { CheckCircle2, Calendar, Clock, Loader2 } from 'lucide-react';
import { acceptWaitlistOffer, declineWaitlistOffer } from '@/app/actions/calendar/waitlistAccept';

interface OfferSummary {
  title: string | null;
  sessionName: string | null;
  when: string | null;
  offerExpiresAt: string | null;
  firstName: string | null;
}

type View = 'offer' | 'accepted' | 'declined';

export default function WaitlistAcceptClient({ token, offer }: { token: string; offer: OfferSummary }) {
  const [view, setView] = useState<View>('offer');
  const [busy, setBusy] = useState<null | 'accept' | 'decline'>(null);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy('accept');
    setError(null);
    const res = await acceptWaitlistOffer(token);
    setBusy(null);
    if (res.success) setView('accepted');
    else setError(res.error);
  };

  const decline = async () => {
    setBusy('decline');
    setError(null);
    const res = await declineWaitlistOffer(token);
    setBusy(null);
    if (res.success) setView('declined');
    else setError(res.error);
  };

  if (view === 'accepted') {
    return (
      <div className="p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--green)]/10 border border-[var(--green)]/20 text-[var(--green)] flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={30} />
        </div>
        <h1 className="text-xl font-bold mb-2">You&apos;re in!</h1>
        <p className="text-[var(--t3)] text-sm leading-relaxed">
          Your spot for <span className="font-semibold text-[var(--t1)]">{offer.title}</span> is confirmed. A confirmation
          email is on its way.
        </p>
      </div>
    );
  }

  if (view === 'declined') {
    return (
      <div className="p-10 text-center">
        <h1 className="text-lg font-bold mb-2">No problem</h1>
        <p className="text-[var(--t3)] text-sm leading-relaxed">
          We&apos;ve passed the spot to the next person on the waitlist.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-[22px] font-bold mb-1">{offer.title ?? 'Your waitlisted session'}</h1>
      {offer.sessionName && <p className="text-[var(--t4)] text-sm mb-6">{offer.sessionName}</p>}

      <div className="space-y-3 mb-6">
        {offer.when && (
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={16} className="text-[var(--accent2)]" />
            <span className="font-semibold">{offer.when}</span>
          </div>
        )}
        {offer.offerExpiresAt && (
          <div className="flex items-center gap-3 text-sm text-[var(--t3)]">
            <Clock size={16} className="text-[var(--t4)]" />
            <span>
              Offer expires {new Date(offer.offerExpiresAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      <p className="text-[var(--t3)] text-[13px] leading-relaxed mb-6">
        A spot opened up for a session you joined the waitlist for. Claim it now — offers are first come, first served.
      </p>

      {error && <p className="text-red-400 text-[13px] mb-4">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={accept}
          disabled={!!busy}
          className="flex-1 h-11 rounded-xl bg-[var(--accent)] text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy === 'accept' ? <Loader2 size={15} className="animate-spin" /> : null}
          Claim my spot
        </button>
        <button
          onClick={decline}
          disabled={!!busy}
          className="h-11 px-5 rounded-xl border border-[var(--bdr)] text-[var(--t3)] text-[13px] font-bold disabled:opacity-60"
        >
          {busy === 'decline' ? <Loader2 size={15} className="animate-spin" /> : 'Not now'}
        </button>
      </div>
    </div>
  );
}

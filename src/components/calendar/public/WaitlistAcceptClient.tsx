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
      <div className="p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-green/10 text-green flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={26} strokeWidth={2} />
        </div>
        <h1 className="text-lg font-bold font-space text-dash-text mb-1.5">You&apos;re in!</h1>
        <p className="text-[14px] leading-relaxed text-dash-textMuted">
          Your spot for <span className="font-semibold text-dash-text">{offer.title}</span> is confirmed. A confirmation
          email is on its way.
        </p>
      </div>
    );
  }

  if (view === 'declined') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-lg font-bold font-space text-dash-text mb-1.5">No problem</h1>
        <p className="text-[14px] leading-relaxed text-dash-textMuted">
          We&apos;ve passed the spot to the next person on the waitlist.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-xl font-bold font-space text-dash-text mb-0.5">{offer.title ?? 'Your waitlisted session'}</h1>
      {offer.sessionName && <p className="text-[13px] text-dash-textMuted mb-5">{offer.sessionName}</p>}

      <div className="space-y-3 mb-5">
        {offer.when && (
          <div className="flex items-center gap-3 text-[14px]">
            <Calendar size={16} strokeWidth={2} className="text-dash-accent shrink-0" />
            <span className="font-medium text-dash-text">{offer.when}</span>
          </div>
        )}
        {offer.offerExpiresAt && (
          <div className="flex items-center gap-3 text-[14px] text-dash-textMuted">
            <Clock size={16} strokeWidth={2} className="text-dash-textMuted shrink-0" />
            <span>
              Offer expires {new Date(offer.offerExpiresAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      <p className="text-[13px] leading-relaxed text-dash-textMuted mb-5">
        A spot opened up for a session you joined the waitlist for. Claim it now — offers are first come, first served.
      </p>

      {error && <p className="text-red text-[13px] mb-4">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={accept}
          disabled={!!busy}
          className="flex-1 h-11 rounded-xl bg-gradient-to-b from-dash-accent to-[#0F47CC] text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(19,89,255,0.3)] disabled:opacity-60 transition-all duration-200 motion-reduce:transition-none"
        >
          {busy === 'accept' ? <Loader2 size={15} className="animate-spin motion-reduce:hidden" /> : null}
          Claim my spot
        </button>
        <button
          onClick={decline}
          disabled={!!busy}
          className="h-11 px-5 rounded-xl border border-dash-border bg-white text-dash-textMuted text-[13px] font-semibold hover:bg-dash-surface disabled:opacity-60 transition-colors motion-reduce:transition-none"
        >
          {busy === 'decline' ? <Loader2 size={15} className="animate-spin motion-reduce:hidden" /> : 'Not now'}
        </button>
      </div>
    </div>
  );
}

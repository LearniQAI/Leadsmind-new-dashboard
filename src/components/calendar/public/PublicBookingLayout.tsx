import React from 'react';
import BookingClientWrapper from '@/components/calendar/public/BookingClientWrapper';
import { ShieldCheck, Clock, Globe, Users } from 'lucide-react';
import { isGroupSessionType, getGroupSessionNoun } from '@/lib/calendar/calendarTypes';

/**
 * Shared shell for the public booking pages (/book/[slug] and the custom-domain
 * variant). Light premium theme — see docs/calendar-redesign-spec.md.
 */
export default function PublicBookingLayout({ calendar }: { calendar: any }) {
  const isGroupSession = isGroupSessionType(calendar.calendar_type);

  const facts: { icon: React.ElementType; label: string; value: string }[] = [
    { icon: Clock, label: 'Duration', value: `${calendar.slot_duration} minutes` },
    { icon: Globe, label: 'Timezone', value: calendar.timezone || 'UTC' },
  ];
  if (isGroupSession) {
    facts.push({
      icon: Users,
      label: getGroupSessionNoun(calendar.calendar_type),
      value: `Up to ${calendar.capacity || 1} spots${calendar.waitlist_enabled ? ' · waitlist' : ''}`,
    });
  }

  return (
    <main className="min-h-screen bg-dash-bg text-dash-text">
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-dash-surface to-dash-bg pointer-events-none" />

      <div className="relative max-w-[1140px] mx-auto px-5 sm:px-6 py-10 lg:py-20">
        <div className="grid lg:grid-cols-[360px_1fr] gap-10 lg:gap-16 items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green/10 px-2.5 py-1 text-[11px] font-semibold text-green">
                <ShieldCheck size={13} strokeWidth={2} /> Secure booking
              </span>

              <h1 className="font-space text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-dash-text">
                {calendar.name}
              </h1>

              <p className="text-[15px] leading-relaxed text-dash-textMuted max-w-sm">
                {calendar.description || "Pick a time that works for you — you'll get a confirmation by email right away."}
              </p>
            </div>

            <dl className="space-y-4 pt-6 border-t border-dash-border">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center text-dash-textMuted shrink-0">
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <div>
                    <dt className="text-[12px] font-medium text-dash-textMuted">{label}</dt>
                    <dd className="text-[14px] font-semibold text-dash-text">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="rounded-2xl border border-dash-border bg-dash-surface p-4">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-green/10 flex items-center justify-center text-green shrink-0">
                  <ShieldCheck size={14} strokeWidth={2} />
                </div>
                <span className="text-[13px] font-semibold text-dash-text">Encrypted &amp; private</span>
              </div>
              <p className="text-[12px] leading-relaxed text-dash-textMuted">
                Your details and meeting information are stored securely and only used to arrange this meeting.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dash-border bg-white shadow-sm overflow-hidden">
            <BookingClientWrapper calendar={calendar} />
          </div>
        </div>
      </div>
    </main>
  );
}

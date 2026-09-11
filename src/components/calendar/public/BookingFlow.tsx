'use client';

import React, { useOptimistic, useTransition, useState } from 'react';
import { TimeSlotPicker } from './TimeSlotPicker';
import { BookingForm } from './BookingForm';
import { TimeSlot } from '@/lib/calendar/availability';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, Users } from 'lucide-react';

type BookResult = { success: boolean; mode?: 'booked' | 'waitlist'; position?: number };

interface BookingFlowProps {
  availableSlots: TimeSlot[];
  onBook: (slot: string, data: any) => Promise<BookResult>;
  customFields?: any[];
  price?: number;
  isClass?: boolean;
  t: (key: string) => string;
  lang: string;
}

export function BookingFlow({
  availableSlots,
  onBook,
  customFields = [],
  price = 0,
  isClass = false,
  t,
  lang
}: BookingFlowProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [result, setResult] = useState<BookResult | null>(null);

  // Optimistic UI: Hide booked slot instantly (1:1 only — a class slot stays
  // visible until it's full).
  const [optimisticSlots, removeOptimisticSlot] = useOptimistic(
    availableSlots,
    (state, bookedSlot: string) => (isClass ? state : state.filter(s => s.start !== bookedSlot))
  );

  const selectedSlotObj = optimisticSlots.find((s: any) => s.start === selectedSlot) as any;
  const joiningWaitlist = isClass && !!selectedSlotObj?.full;

  const handleBooking = async (formData: any) => {
    if (!selectedSlot) return;

    startTransition(async () => {
      if (!isClass) removeOptimisticSlot(selectedSlot);
      const res = await onBook(selectedSlot, formData);

      if (res.success) {
        setResult(res);
        toast.success(res.mode === 'waitlist' ? "You're on the waitlist" : t('bookingConfirmed'));
      } else {
        toast.error(joiningWaitlist ? 'Could not join the waitlist. Please try again.' : 'Booking failed. The slot may have already been reserved.');
      }
    });
  };

  if (result?.success) {
    const isWaitlist = result.mode === 'waitlist';
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-2xl border border-dash-border bg-dash-surface">
        <div
          className={
            'w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ' +
            (isWaitlist ? 'bg-amber/10 text-amber' : 'bg-green/10 text-green')
          }
        >
          {isWaitlist ? <Users className="h-8 w-8" strokeWidth={2} /> : <CheckCircle2 className="h-8 w-8" strokeWidth={2} />}
        </div>
        <h2 className="text-xl font-bold font-space text-dash-text mb-2">
          {isWaitlist ? "You're on the waitlist" : t('bookingConfirmed')}
        </h2>
        <p className="text-[14px] leading-relaxed text-dash-textMuted max-w-sm mb-7">
          {isWaitlist
            ? `You're #${result.position} on the list. This session is full — if a spot opens up we'll email you a link to claim it (first come, first served).`
            : t('bookingSuccessMsg')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="h-11 px-6 rounded-xl border border-dash-border bg-white text-dash-text hover:bg-dash-surface text-[13px] font-semibold transition-colors motion-reduce:transition-none"
        >
          {t('scheduleAnother')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3.5">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-dash-accent" strokeWidth={2} />
          <h3 className="text-[13px] font-semibold text-dash-text">{t('selectSlot')}</h3>
        </div>
        <TimeSlotPicker
          slots={optimisticSlots}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          isLoading={isPending}
        />
      </section>

      <section className="space-y-3.5">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border border-dash-border flex items-center justify-center text-[9px] font-bold text-dash-textMuted">2</span>
          <h3 className="text-[13px] font-semibold text-dash-text">{t('enterDetails')}</h3>
        </div>
        {joiningWaitlist && (
          <p className="text-[12px] font-medium text-amber -mt-1">
            This session is full — submit your details to join the waitlist.
          </p>
        )}
        <BookingForm
          onSubmit={handleBooking}
          isSubmitting={isPending}
          selectedTime={selectedSlot || undefined}
          customFields={customFields}
          price={price}
          submitLabel={joiningWaitlist ? 'Join the waitlist' : undefined}
          t={t}
          lang={lang}
        />
      </section>
    </div>
  );
}

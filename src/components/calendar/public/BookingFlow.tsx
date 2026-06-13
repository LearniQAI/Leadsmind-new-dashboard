'use client';

import React, { useOptimistic, useTransition, useState } from 'react';
import { TimeSlotPicker } from './TimeSlotPicker';
import { BookingForm } from './BookingForm';
import { TimeSlot } from '@/lib/calendar/availability';
import { toast } from 'sonner';
import { Calendar, CheckCircle2 } from 'lucide-react';

interface BookingFlowProps {
  availableSlots: TimeSlot[];
  onBook: (slot: string, data: any) => Promise<boolean>;
  customFields?: any[];
  price?: number;
  t: (key: string) => string;
  lang: string;
}

export function BookingFlow({
  availableSlots,
  onBook,
  customFields = [],
  price = 0,
  t,
  lang
}: BookingFlowProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Optimistic UI: Hide booked slot instantly
  const [optimisticSlots, removeOptimisticSlot] = useOptimistic(
    availableSlots,
    (state, bookedSlot: string) => state.filter(s => s.start !== bookedSlot)
  );

  const handleBooking = async (formData: any) => {
    if (!selectedSlot) return;

    startTransition(async () => {
      removeOptimisticSlot(selectedSlot);
      const success = await onBook(selectedSlot, formData);

      if (success) {
        setIsSuccess(true);
        toast.success(t('bookingConfirmed'));
      } else {
        toast.error('Booking failed. The slot may have already been reserved.');
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 bg-white/[0.02] rounded-3xl border border-white/5 text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-full bg-[#10b981]/10 flex items-center justify-center mb-6 border border-[#10b981]/20">
          <CheckCircle2 className="h-10 w-10 text-[#10b981]" />
        </div>
        <h2 className="text-[24px] font-bold font-space text-[#eef2ff] mb-2 uppercase tracking-tight">
          {t('bookingConfirmed')}
        </h2>
        <p className="text-[14px] text-[#94a3c8] max-w-sm mb-8 font-dm-sans">
          {t('bookingSuccessMsg')}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="h-11 px-8 rounded-xl bg-white/5 border border-white/10 text-[#eef2ff] hover:bg-white/10 text-[13px] font-bold font-dm-sans transition-all"
        >
          {t('scheduleAnother')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-5 w-5 text-[#3b82f6]" />
          <h3 className="text-[13px] font-black text-[#eef2ff] uppercase tracking-[0.15em]">{t('selectSlot')}</h3>
        </div>
        <TimeSlotPicker 
          slots={optimisticSlots} 
          selectedSlot={selectedSlot} 
          onSelectSlot={setSelectedSlot} 
          isLoading={isPending}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-5 w-5 rounded-full border-2 border-[#4a5a82] flex items-center justify-center text-[10px] font-black text-[#4a5a82]">2</div>
          <h3 className="text-[13px] font-black text-[#eef2ff] uppercase tracking-[0.15em]">{t('enterDetails')}</h3>
        </div>
        <BookingForm 
          onSubmit={handleBooking} 
          isSubmitting={isPending} 
          selectedTime={selectedSlot || undefined}
          customFields={customFields}
          price={price}
          t={t}
          lang={lang}
        />
      </section>
    </div>
  );
}

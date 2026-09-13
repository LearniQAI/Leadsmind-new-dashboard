'use client';

import React, { useState, useEffect } from 'react';
import { BookingFlow } from '@/components/calendar/public/BookingFlow';
import { fetchPublicSlots, bookAppointment, bookGroupSession } from '@/app/actions/calendar/public';
import { format } from 'date-fns';
import { Loader2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/calendar/useTranslation';
import { isGroupSessionType, getGroupSessionNoun } from '@/lib/calendar/calendarTypes';

interface BookingClientWrapperProps {
  calendar: any;
}

export default function BookingClientWrapper({ calendar }: BookingClientWrapperProps) {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { lang, changeLanguage, t } = useTranslation();
  const clientTimezone = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

  // 1. Initial Load & Date Change
  useEffect(() => {
    async function loadSlots() {
      setIsLoading(true);
      try {
        const slots = await fetchPublicSlots(calendar.id, selectedDate);
        setAvailableSlots(slots);
      } catch (err) {
        console.error('Failed to load slots:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSlots();
  }, [calendar.id, selectedDate]);

  const isGroupSession = isGroupSessionType(calendar.calendar_type);
  const groupSessionNoun = getGroupSessionNoun(calendar.calendar_type);

  // 2. Booking Action
  const handleBook = async (slot: string, leadData: any): Promise<{ success: boolean; mode?: 'booked' | 'waitlist'; position?: number }> => {
    try {
      if (isGroupSession) {
        const res = await bookGroupSession(calendar.id, slot, leadData);
        return { success: !!res.success, mode: (res as any).mode, position: (res as any).position };
      }
      const res = await bookAppointment(calendar.id, slot, leadData);
      if (res.success && res.checkoutRequired && res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return { success: true };
      }
      return { success: !!res.success };
    } catch (err) {
      console.error('[booking-wrapper] Booking submission error:', err);
      return { success: false };
    }
  };

  return (
    <div className="p-6 sm:p-8">
      {/* Timezone + language */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7 pb-5 border-b border-dash-border">
        <div className="flex items-center gap-2 text-[12px] text-dash-textMuted">
          <Globe size={14} strokeWidth={2} className="text-dash-accent" />
          <span>Times shown in <strong className="font-semibold text-dash-text">{clientTimezone}</strong></span>
        </div>

        <div className="inline-flex rounded-lg border border-dash-border bg-dash-surface p-0.5">
          {(['en', 'af'] as const).map((code) => (
            <button
              key={code}
              onClick={() => changeLanguage(code)}
              className={cn(
                'px-3 h-7 text-[12px] font-semibold rounded-md transition-colors motion-reduce:transition-none',
                lang === code ? 'bg-white text-dash-text shadow-sm' : 'text-dash-textMuted hover:text-dash-text'
              )}
            >
              {code === 'en' ? 'English' : 'Afrikaans'}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="mb-7 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-[13px] font-semibold text-dash-textMuted mb-0.5">{t('selectDate')}</h2>
          <p className="text-lg font-bold text-dash-text font-space">{format(new Date(selectedDate), 'EEEE, MMMM d')}</p>
        </div>
        <div className="flex gap-2 overflow-x-auto py-1 -mx-1 px-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dateStr = format(d, 'yyyy-MM-dd');
            const active = selectedDate === dateStr;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  'w-11 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-colors motion-reduce:transition-none',
                  active
                    ? 'bg-dash-accent text-white border-dash-accent'
                    : 'bg-white text-dash-textMuted border-dash-border hover:border-dash-accent/40 hover:text-dash-text'
                )}
              >
                <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">{format(d, 'EEE')}</span>
                <span className="text-[14px] font-bold">{format(d, 'd')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-dash-textMuted">
          <Loader2 className="animate-spin motion-reduce:hidden mb-3 text-dash-accent" size={26} />
          <p className="text-[13px] font-medium">Loading available times…</p>
        </div>
      ) : (
        <BookingFlow
          availableSlots={availableSlots}
          onBook={handleBook}
          customFields={calendar.custom_fields || []}
          price={parseFloat(calendar.price || '0')}
          isGroupSession={isGroupSession}
          groupSessionNoun={groupSessionNoun}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}

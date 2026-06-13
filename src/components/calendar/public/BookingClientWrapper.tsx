'use client';

import React, { useState, useEffect } from 'react';
import { BookingFlow } from '@/components/calendar/public/BookingFlow';
import { fetchPublicSlots, bookAppointment } from '@/app/actions/calendar/public';
import { format } from 'date-fns';
import { Loader2, Globe, Languages } from 'lucide-react';
import { useTranslation, Language } from '@/lib/calendar/useTranslation';

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

  // 2. Booking Action
  const handleBook = async (slot: string, leadData: any) => {
    try {
      const res = await bookAppointment(calendar.id, slot, leadData);
      
      if (res.success && res.checkoutRequired && res.redirectUrl) {
        // Redirection to PayFast interstitial checkout gate
        window.location.href = res.redirectUrl;
        return true;
      }
      
      return res.success;
    } catch (err) {
      console.error('[booking-wrapper] Booking submission error:', err);
      return false;
    }
  };

  return (
    <div className="p-8">
      {/* Top Header: Language and Timezone Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[var(--bdr)]">
        <div className="flex items-center gap-2 text-xs text-[var(--t3)]">
          <Globe size={14} className="text-[#3b82f6]" />
          <span>Local Timezone: <strong className="text-[var(--t1)]">{clientTimezone}</strong></span>
        </div>

        {/* Translation Toggle Bridge */}
        <div className="flex items-center gap-2">
          <Languages size={14} className="text-[var(--t4)]" />
          <div className="flex rounded-lg bg-[var(--n900)] p-1 border border-white/5">
            <button
              onClick={() => changeLanguage('en')}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                lang === 'en'
                  ? 'bg-[#2563eb] text-white'
                  : 'text-[var(--t4)] hover:text-[var(--t2)]'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => changeLanguage('af')}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                lang === 'af'
                  ? 'bg-[#2563eb] text-white'
                  : 'text-[var(--t4)] hover:text-[var(--t2)]'
              }`}
            >
              AF (Afrikaans)
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--t4)] mb-1">{t('selectDate')}</h2>
            <p className="text-[20px] font-bold text-[var(--t1)]">{format(new Date(selectedDate), 'MMMM do, yyyy')}</p>
         </div>
         {/* Date selection navigation */}
         <div className="flex gap-2 overflow-x-auto py-1">
            {[0, 1, 2, 3, 4, 5, 6].map(i => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const dateStr = format(d, 'yyyy-MM-dd');
                return (
                    <button
                        key={i}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 transition-all ${
                            selectedDate === dateStr 
                            ? 'bg-[#2563eb] text-white shadow-lg shadow-[#2563eb]/20' 
                            : 'bg-[var(--n900)] text-[var(--t4)] border border-white/5 hover:bg-white/5'
                        }`}
                    >
                        <span className="text-[8px] font-black uppercase">{format(d, 'EEE')}</span>
                        <span className="text-[13px] font-bold">{format(d, 'd')}</span>
                    </button>
                );
            })}
         </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--t4)]">
           <Loader2 className="animate-spin mb-4 text-[#3b82f6]" size={32} />
           <p className="text-[10px] font-black uppercase tracking-[0.2em]">Assembling slots matrix...</p>
        </div>
      ) : (
        <BookingFlow 
          availableSlots={availableSlots} 
          onBook={handleBook}
          customFields={calendar.custom_fields || []}
          price={parseFloat(calendar.price || '0')}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}

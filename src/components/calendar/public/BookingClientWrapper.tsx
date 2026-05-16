'use client';

import React, { useState, useEffect } from 'react';
import { BookingFlow } from '@/components/calendar/public/BookingFlow';
import { fetchPublicSlots, bookAppointment } from '@/app/actions/calendar/public';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface BookingClientWrapperProps {
  calendarId: string;
}

export default function BookingClientWrapper({ calendarId }: BookingClientWrapperProps) {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial Load & Date Change
  useEffect(() => {
    async function loadSlots() {
      setIsLoading(true);
      try {
        const slots = await fetchPublicSlots(calendarId, selectedDate);
        setAvailableSlots(slots);
      } catch (err) {
        console.error('Failed to load slots:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSlots();
  }, [calendarId, selectedDate]);

  // 2. Booking Action
  const handleBook = async (slot: string, leadData: any) => {
    const res = await bookAppointment(calendarId, slot, leadData);
    return res.success;
  };

  return (
    <div className="p-8">
      {/* Date Selector could go here in the future, for now it's today */}
      <div className="mb-8 flex items-center justify-between">
         <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--t4)] mb-1">Select Date</h2>
            <p className="text-[20px] font-bold text-[var(--t1)]">{format(new Date(selectedDate), 'MMMM do, yyyy')}</p>
         </div>
         {/* Simple Date Toggle for testing */}
         <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map(i => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const dateStr = format(d, 'yyyy-MM-dd');
                return (
                    <button
                        key={i}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all ${
                            selectedDate === dateStr 
                            ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20' 
                            : 'bg-[var(--n900)] text-[var(--t4)] hover:bg-[var(--n700)]'
                        }`}
                    >
                        <span className="text-[9px] font-black uppercase">{format(d, 'EEE')}</span>
                        <span className="text-[14px] font-bold">{format(d, 'd')}</span>
                    </button>
                );
            })}
         </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--t4)]">
           <Loader2 className="animate-spin mb-4" size={32} />
           <p className="text-xs font-black uppercase tracking-widest">Generating availability matrix...</p>
        </div>
      ) : (
        <BookingFlow 
          availableSlots={availableSlots} 
          onBook={handleBook} 
        />
      )}
    </div>
  );
}

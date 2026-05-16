'use client';

import React from 'react';
import { PremiumInput, PremiumTextarea } from '@/components/ui/premium-inputs';
import { Button } from '@/components/ui/button';
import { User, Mail, MessageSquare, CalendarCheck2 } from 'lucide-react';

interface BookingFormProps {
  onSubmit: (data: { name: string; email: string; notes: string }) => void;
  isSubmitting?: boolean;
  selectedTime?: string;
}

export function BookingForm({ onSubmit, isSubmitting, selectedTime }: BookingFormProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.15em] ml-1">
            Lead Name
          </label>
          <div className="relative group">
            <PremiumInput
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="pl-10 h-10 text-[13px]"
            />
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4a5a82] group-focus-within:text-[#2563eb] transition-colors" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.15em] ml-1">
            Email Address
          </label>
          <div className="relative group">
            <PremiumInput
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="pl-10 h-10 text-[13px]"
            />
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4a5a82] group-focus-within:text-[#2563eb] transition-colors" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.15em] ml-1">
          Additional Notes
        </label>
        <div className="relative group">
          <PremiumTextarea
            placeholder="Tell us about your objectives..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="min-h-[80px] pl-10 pt-3 text-[13px]"
          />
          <MessageSquare className="absolute left-4 top-4 h-3.5 w-3.5 text-[#4a5a82] group-focus-within:text-[#2563eb] transition-colors" />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !selectedTime}
          className="w-full h-10 rounded-xl bg-[#2563eb] text-white hover:bg-[#2563eb]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[13px] font-bold font-dm-sans transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#2563eb]/20"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <CalendarCheck2 className="h-4 w-4" />
              Confirm Strategic Booking
            </>
          )}
        </button>
        {!selectedTime && (
          <p className="text-center text-[9px] text-[#ef4444] font-bold uppercase tracking-widest mt-3 animate-pulse">
            Please select a time slot above first
          </p>
        )}
      </div>
    </form>
  );
}

'use client';

import React, { useState } from 'react';
import { PremiumInput, PremiumTextarea } from '@/components/ui/premium-inputs';
import { User, Mail, MessageSquare, CalendarCheck2, FileText, AlertCircle } from 'lucide-react';

interface CustomField {
  id: string;
  label: string;
  field_type: 'text' | 'textarea' | 'dropdown' | 'checkbox' | 'url';
  options?: string[];
  is_required?: boolean;
}

interface BookingFormProps {
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    notes: string;
    popiaConsent: boolean;
    answers: Record<string, string>;
  }) => void;
  isSubmitting?: boolean;
  selectedTime?: string;
  customFields?: CustomField[];
  price?: number;
  t: (key: string) => string;
  lang: string;
}

export function BookingForm({
  onSubmit,
  isSubmitting,
  selectedTime,
  customFields = [],
  price = 0,
  t,
  lang
}: BookingFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
    popiaConsent: false,
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFieldChange = (fieldId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.popiaConsent) {
      setValidationError(t('popiaRequired'));
      return;
    }

    // Validate custom fields
    for (const field of customFields) {
      if (field.is_required && !answers[field.id]) {
        setValidationError(`"${field.label}" is required.`);
        return;
      }
    }

    onSubmit({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      notes: formData.notes,
      popiaConsent: formData.popiaConsent,
      answers,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {validationError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2.5 text-xs font-bold font-dm-sans animate-in slide-in-from-top-2 duration-300">
          <AlertCircle size={15} />
          <span>{validationError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.15em] ml-1">
            First Name
          </label>
          <div className="relative group">
            <PremiumInput
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="pl-10 h-10 text-[13px]"
            />
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4a5a82] group-focus-within:text-[#2563eb] transition-colors" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.15em] ml-1">
            Last Name
          </label>
          <div className="relative group">
            <PremiumInput
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              className="pl-10 h-10 text-[13px]"
            />
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4a5a82] group-focus-within:text-[#2563eb] transition-colors" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.15em] ml-1">
            {t('emailAddress')}
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

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.15em] ml-1">
            Phone Number
          </label>
          <div className="relative group">
            <PremiumInput
              type="tel"
              placeholder="+27 82 123 4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="pl-10 h-10 text-[13px]"
            />
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4a5a82] group-focus-within:text-[#2563eb] transition-colors" />
          </div>
        </div>
      </div>

      {/* Dynamic Metadata Fields */}
      {customFields.map((field) => (
        <div key={field.id} className="space-y-1.5 animate-in fade-in duration-300">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.15em] ml-1">
            {field.label} {field.is_required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative group">
            {field.field_type === 'textarea' ? (
              <PremiumTextarea
                placeholder={`Provide details...`}
                value={answers[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                required={field.is_required}
                className="min-h-[70px] pl-10 pt-3 text-[13px]"
              />
            ) : field.field_type === 'dropdown' ? (
              <select
                value={answers[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                required={field.is_required}
                className="w-full h-10 px-10 rounded-xl bg-white/5 border border-white/5 focus:border-[#2563eb] text-[13px] text-[#eef2ff] outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="" className="bg-[#0b1229]">Select option</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt} className="bg-[#0b1229]">{opt}</option>
                ))}
              </select>
            ) : (
              <PremiumInput
                placeholder={`Enter answer...`}
                value={answers[field.id] || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                required={field.is_required}
                className="pl-10 h-10 text-[13px]"
              />
            )}
            <FileText className="absolute left-4 top-3 h-3.5 w-3.5 text-[#4a5a82] group-focus-within:text-[#2563eb]" />
          </div>
        </div>
      ))}

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[0.15em] ml-1">
          {t('additionalNotes')}
        </label>
        <div className="relative group">
          <PremiumTextarea
            placeholder="Objectives, goals, or schedule changes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="min-h-[60px] pl-10 pt-3 text-[13px]"
          />
          <MessageSquare className="absolute left-4 top-4 h-3.5 w-3.5 text-[#4a5a82] group-focus-within:text-[#2563eb] transition-colors" />
        </div>
      </div>

      {/* Non-bypassable POPIA Checkbox */}
      <div className="flex items-start gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-white/5 mt-4">
        <input
          type="checkbox"
          id="popiaConsent"
          checked={formData.popiaConsent}
          onChange={(e) => setFormData({ ...formData, popiaConsent: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] bg-[#0b1229] cursor-pointer"
        />
        <label htmlFor="popiaConsent" className="text-[11px] text-[#94a3c8] leading-normal select-none cursor-pointer">
          {t('popiaConsent')} <span className="text-red-400 font-bold">*</span>
        </label>
      </div>

      {/* PayFast Premium Notice */}
      {price > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-400 leading-normal font-bold">
          {t('paymentNotice')} ZAR {price.toFixed(2)}.
        </div>
      )}

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
              {t('confirmBooking')}
            </>
          )}
        </button>
        {!selectedTime && (
          <p className="text-center text-[9px] text-[#ef4444] font-bold uppercase tracking-widest mt-3 animate-pulse">
            {t('selectSlotFirst')}
          </p>
        )}
      </div>
    </form>
  );
}

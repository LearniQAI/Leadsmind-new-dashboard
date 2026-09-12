'use client';

import React, { useState } from 'react';
import { DashFormField, DashInput, DashTextarea, DashButton } from '@/components/dashboard-ui';
import { CalendarCheck2, AlertCircle } from 'lucide-react';

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
  submitLabel?: string;
  t: (key: string) => string;
  lang: string;
}

export function BookingForm({
  onSubmit,
  isSubmitting,
  selectedTime,
  customFields = [],
  price = 0,
  submitLabel,
  t,
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
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.popiaConsent) {
      setValidationError(t('popiaRequired'));
      return;
    }

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
        <div className="p-3 rounded-xl bg-red/10 border border-red/20 text-red flex items-center gap-2 text-[13px] font-medium">
          <AlertCircle size={15} strokeWidth={2} className="shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DashFormField label="First name" required>
          <DashInput placeholder="John" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
        </DashFormField>
        <DashFormField label="Last name" required>
          <DashInput placeholder="Doe" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
        </DashFormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DashFormField label={t('emailAddress')} required>
          <DashInput type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        </DashFormField>
        <DashFormField label="Phone number">
          <DashInput type="tel" placeholder="+27 82 123 4567" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </DashFormField>
      </div>

      {customFields.map((field) => (
        <DashFormField key={field.id} label={field.label} required={field.is_required}>
          {field.field_type === 'textarea' ? (
            <DashTextarea
              placeholder="Provide details…"
              value={answers[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.is_required}
            />
          ) : field.field_type === 'dropdown' ? (
            <select
              value={answers[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.is_required}
              className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm text-dash-text outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-dash-accent"
            >
              <option value="">Select an option</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <DashInput
              placeholder="Enter your answer…"
              value={answers[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.is_required}
            />
          )}
        </DashFormField>
      ))}

      <DashFormField label={t('additionalNotes')}>
        <DashTextarea
          placeholder="Anything you'd like the host to know before the meeting…"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="min-h-[80px]"
        />
      </DashFormField>

      {/* POPIA consent */}
      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-dash-border bg-dash-surface cursor-pointer">
        <input
          type="checkbox"
          checked={formData.popiaConsent}
          onChange={(e) => setFormData({ ...formData, popiaConsent: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-dash-border text-dash-accent focus:ring-dash-accent cursor-pointer"
        />
        <span className="text-[12px] leading-relaxed text-dash-textMuted select-none">
          {t('popiaConsent')} <span className="text-red font-semibold">*</span>
        </span>
      </label>

      {price > 0 && (
        <div className="p-3.5 rounded-xl bg-amber/5 border border-amber/20 text-[12px] leading-relaxed font-medium text-amber">
          {t('paymentNotice')} ZAR {price.toFixed(2)}.
        </div>
      )}

      <div className="pt-1">
        <DashButton type="submit" disabled={isSubmitting || !selectedTime} variant="primary" size="lg" className="w-full">
          {isSubmitting ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin motion-reduce:animate-none" />
          ) : (
            <>
              <CalendarCheck2 className="h-4 w-4" strokeWidth={2} />
              {submitLabel ?? t('confirmBooking')}
            </>
          )}
        </DashButton>
        {!selectedTime && (
          <p className="text-center text-[12px] text-dash-textMuted mt-2.5">{t('selectSlotFirst')}</p>
        )}
      </div>
    </form>
  );
}

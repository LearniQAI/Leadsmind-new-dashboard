"use client";

import React, { useState } from 'react';
import { Loader2, Lock, Calendar } from 'lucide-react';
import { createWebinarRegistration } from '@/app/actions/webinarRegistrations';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import { useBuilder } from '../BuilderContext';
import { useEditor, useNode } from '@craftjs/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WebinarRegistrationSettings } from './WebinarRegistrationSettings';

export interface WebinarRegistrationProps {
  sessionTitle: string;
  sessionDateTime: string; // datetime-local value, e.g. '2026-09-15T14:00'
  durationMinutes: number;
  description: string;
  buttonText: string;
  backgroundColor: string;
  borderRadius: number;
  padding: number;
  gap: number;
  labelColor: string;
  descriptionColor: string;
  inputBg: string;
  inputBorderColor: string;
  inputTextColor: string;
  buttonBg: string;
  buttonTextColor: string;
}

export const WebinarRegistration = (allProps: WebinarRegistrationProps & any) => {
  const {
    sessionTitle, sessionDateTime, durationMinutes, description, buttonText,
    backgroundColor, borderRadius, padding, gap, labelColor, descriptionColor,
    inputBg, inputBorderColor, inputTextColor, buttonBg, buttonTextColor,
    dragRef, ...props
  } = allProps;

  const { connectors: { connect, drag } } = useNode();
  const { websiteData } = useBuilder();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const pathname = usePathname();

  const stepPath = (() => {
    if (!pathname) return '/';
    const match = pathname.match(/^\/p\/[^/]+\/[^/]+(\/.*)?$/);
    const rest = match?.[1];
    return rest && rest !== '' ? rest : '/';
  })();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customer, setCustomer] = useState({ firstName: '', lastName: '', email: '' });

  const handleChange = (key: keyof typeof customer, value: string) => {
    setCustomer((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled) return;

    setIsSubmitting(true);
    try {
      const funnelId = websiteData?.id;
      if (!funnelId) {
        throw new Error('Missing funnel context');
      }

      const result = await createWebinarRegistration({
        funnelId,
        stepPath,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        sessionTitle,
        sessionDateTime,
        durationMinutes: Number(durationMinutes) || 60,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to register');
        setIsSubmitting(false);
        return;
      }

      if (result.nextStepUrl) {
        window.location.href = result.nextStepUrl;
      } else {
        toast.success('You’re registered!');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while registering');
      setIsSubmitting(false);
    }
  };

  const formattedDateTime = (() => {
    if (!sessionDateTime) return null;
    try {
      return new Date(sessionDateTime).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return null;
    }
  })();

  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
          connect(ref);
          drag(ref);
          if (dragRef) {
            if (typeof dragRef === 'function') dragRef(ref);
            else dragRef.current = ref;
          }
        }
      }}
      className="transition-all outline-dashed outline-1 outline-transparent hover:outline-blue-500/50"
      style={{ backgroundColor, borderRadius: `${borderRadius}px`, padding: `${padding}px` }}
    >
      <h3 className="text-xl font-black mb-2" style={{ color: labelColor }}>{sessionTitle || 'Live Webinar'}</h3>
      {formattedDateTime && (
        <div className="flex items-center gap-1.5 text-sm font-semibold mb-3" style={{ color: labelColor }}>
          <Calendar className="w-4 h-4" />
          {formattedDateTime}
        </div>
      )}
      <p className="text-sm mb-5 leading-relaxed" style={{ color: descriptionColor }}>{description}</p>

      <form className="flex flex-col" style={{ gap: `${gap}px` }} onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-tight" style={{ color: labelColor }}>First name</Label>
            <Input
              type="text"
              placeholder="Jane"
              required
              className="rounded-lg h-10 border"
              style={{ backgroundColor: inputBg, borderColor: inputBorderColor, color: inputTextColor }}
              value={customer.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-tight" style={{ color: labelColor }}>Last name</Label>
            <Input
              type="text"
              placeholder="Doe"
              className="rounded-lg h-10 border"
              style={{ backgroundColor: inputBg, borderColor: inputBorderColor, color: inputTextColor }}
              value={customer.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-tight" style={{ color: labelColor }}>Email</Label>
          <Input
            type="email"
            placeholder="jane@example.com"
            required
            className="rounded-lg h-10 border"
            style={{ backgroundColor: inputBg, borderColor: inputBorderColor, color: inputTextColor }}
            value={customer.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg h-12 font-bold shadow-lg hover:scale-[1.01] transition-all disabled:opacity-70 mt-2"
          style={{ backgroundColor: buttonBg, color: buttonTextColor }}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registering...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              <span>{buttonText || 'Save my seat'}</span>
            </div>
          )}
        </Button>
      </form>
    </div>
  );
};

WebinarRegistration.craft = {
  displayName: 'Webinar Registration',
  props: {
    sessionTitle: 'Live Webinar',
    sessionDateTime: '',
    durationMinutes: 60,
    description: 'Join us live to learn how to grow your business.',
    buttonText: 'Save my seat',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    gap: 16,
    labelColor: '#111827',
    descriptionColor: '#4b5563',
    inputBg: '#f9fafb',
    inputBorderColor: '#e5e7eb',
    inputTextColor: '#111827',
    buttonBg: '#6c47ff',
    buttonTextColor: '#ffffff',
  },
  related: {
    settings: WebinarRegistrationSettings,
  },
  rules: {
    canDrag: () => true,
  },
};

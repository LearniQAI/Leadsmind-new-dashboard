"use client";

import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { handlePageFormSubmission } from '@/app/actions/builder';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { useBuilder } from '../BuilderContext';
import { useEditor, useNode } from '@craftjs/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormSettings } from './FormSettings';

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'checkbox' | 'select' | 'radio' | 'date';
  label: string;
  placeholder: string;
  required: boolean;
  mapping?: 'email' | 'first_name' | 'last_name' | 'phone' | 'custom';
  options?: string[];
}

export interface FormProps {
  fields: FormField[];
  buttonText: string;
  backgroundColor: string;
  borderRadius: number;
  padding: number;
  gap: number;
  labelColor: string;
  inputBg: string;
  inputBorderColor: string;
  inputTextColor: string;
  buttonBg: string;
  buttonTextColor: string;
  onSuccess: 'message' | 'redirect';
  successMessage: string;
  redirectLink: any;
}

export const Form = (allProps: FormProps & any) => {
  const {
    fields,
    buttonText,
    backgroundColor,
    borderRadius,
    padding,
    gap,
    labelColor,
    inputBg,
    inputBorderColor,
    inputTextColor,
    buttonBg,
    buttonTextColor,
    onSuccess,
    successMessage,
    redirectLink,
    dragRef,
    ...props
  } = allProps;

  const { connectors: { connect, drag } } = useNode();
  const { websiteData } = useBuilder();
  const { pageId } = useParams();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const handleInputChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled) return;

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {};
      fields.forEach((field: FormField) => {
        const val = formValues[field.id];
        const key = field.mapping && field.mapping !== 'custom' ? field.mapping : field.label;
        payload[key] = val;
      });

      const workspaceId = websiteData?.workspace_id;
      if (!workspaceId || !pageId) {
        throw new Error("Missing workspace or page context");
      }

      const result = await handlePageFormSubmission(payload, pageId as string, workspaceId);

      if (result.success) {
        setSubmitted(true);
        toast.success('Form submitted successfully!');

        if (onSuccess === 'redirect' && redirectLink) {
          const url = typeof redirectLink === 'string' ? redirectLink : redirectLink.value;
          if (url) {
            setTimeout(() => {
              window.location.href = url;
            }, 1500);
          }
        }
      } else {
        toast.error(result.error || 'Failed to submit form');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted && onSuccess === 'message') {
    return (
      <div
        className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500"
        style={{
          backgroundColor,
          borderRadius: `${borderRadius}px`,
          padding: `${padding}px`,
          color: labelColor
        }}
      >
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
          <Plus className="rotate-45" />
        </div>
        <h3 className="text-xl font-bold mb-2">Success!</h3>
        <p className="opacity-80 text-sm leading-relaxed">{successMessage || 'Thank you for your submission.'}</p>
        <Button
          variant="ghost"
          className="mt-6 text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100"
          onClick={() => setSubmitted(false)}
        >
          Submit another response
        </Button>
      </div>
    );
  }

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
      style={{
        backgroundColor,
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px`,
      }}
    >
      <form
        className="flex flex-col"
        style={{ gap: `${gap}px` }}
        onSubmit={handleSubmit}
      >
        {fields.map((field: FormField) => (
          <div key={field.id} className="space-y-1.5">
            {field.type === 'checkbox' ? (
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id={field.id}
                  required={field.required}
                  className="w-4 h-4 rounded accent-primary bg-muted border-white/10"
                  checked={formValues[field.id] || false}
                  onChange={(e) => handleInputChange(field.id, e.target.checked)}
                />
                <Label htmlFor={field.id} className="text-sm font-medium cursor-pointer" style={{ color: labelColor }}>{field.label}</Label>
              </div>
            ) : field.type === 'radio' ? (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-tight" style={{ color: labelColor }}>{field.label}</Label>
                <div className="flex flex-col gap-2">
                  {(field.options || ['Option 1']).map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={field.id}
                        id={`${field.id}-${i}`}
                        className="w-4 h-4 accent-primary"
                        checked={formValues[field.id] === opt}
                        onChange={() => handleInputChange(field.id, opt)}
                        required={field.required}
                      />
                      <Label htmlFor={`${field.id}-${i}`} className="text-sm cursor-pointer" style={{ color: labelColor }}>{opt}</Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Label className="text-xs font-bold uppercase tracking-tight" style={{ color: labelColor }}>{field.label}</Label>
                {field.type === 'textarea' ? (
                  <textarea
                    className="flex min-h-[100px] w-full rounded-lg border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                    placeholder={field.placeholder}
                    style={{ backgroundColor: inputBg, borderColor: inputBorderColor, color: inputTextColor }}
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                  />
                ) : field.type === 'select' ? (
                  <select
                    className="flex h-10 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    style={{ backgroundColor: inputBg, borderColor: inputBorderColor, color: inputTextColor }}
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                  >
                    <option value="">Select an option...</option>
                    {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="rounded-lg h-10 transition-all border focus:ring-primary"
                    style={{ backgroundColor: inputBg, borderColor: inputBorderColor, color: inputTextColor }}
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}
              </>
            )}
          </div>
        ))}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg h-12 font-bold shadow-lg hover:scale-[1.01] transition-all disabled:opacity-70"
          style={{ backgroundColor: buttonBg, color: buttonTextColor }}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting...</span>
            </div>
          ) : (
            buttonText || 'Submit'
          )}
        </Button>
      </form>
    </div>
  );
};

Form.craft = {
  displayName: 'Contact Form',
  props: {
    fields: [
      { id: '1', type: 'text', label: 'Name', placeholder: 'Enter your name', required: true, mapping: 'first_name' },
      { id: '2', type: 'email', label: 'Email', placeholder: 'Enter your email', required: true, mapping: 'email' },
    ],
    buttonText: 'Submit Information',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    gap: 16,
    labelColor: '#374151',
    inputBg: '#f9fafb',
    inputBorderColor: '#e5e7eb',
    inputTextColor: '#111827',
    buttonBg: '#6c47ff',
    buttonTextColor: '#ffffff',
    onSuccess: 'message',
    successMessage: 'Thank you! We have received your information.',
    redirectLink: { type: 'url', value: '' }
  },

  related: {
    settings: FormSettings,
  },
  rules: {
    canDrag: () => true,
  },
};

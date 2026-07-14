'use client';

import React from 'react';
import { FormField } from './FormBuilderContext';
import { UploadField } from './UploadField';
import { SignaturePad } from './SignaturePad';
import { PaymentBlock } from './PaymentBlock';

interface FieldRendererProps {
  field: FormField;
  mode: 'builder' | 'form';
  value?: any;
  onChange?: (val: any) => void;
  error?: string;
  disabled?: boolean;
}

export function FieldRenderer({
  field,
  mode,
  value,
  onChange,
  error,
  disabled,
}: FieldRendererProps) {
  const isBuilder = mode === 'builder';
  const inputId = `field-${field.id}`;

  const commonClass = "w-full rounded-xl border border-dash-border bg-white px-4 py-3 text-sm !text-dash-text placeholder:text-dash-textMuted focus:outline-none focus:border-dash-accent transition-colors motion-reduce:transition-none duration-300";
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (isBuilder) return;
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isBuilder) return;
    if (onChange) {
      onChange(e.target.checked);
    }
  };

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            id={inputId}
            type="text"
            placeholder={field.placeholder || 'Enter text...'}
            value={value || ''}
            onChange={handleInputChange}
            disabled={isBuilder || disabled}
            className={commonClass}
            style={isBuilder ? { pointerEvents: 'none' } : undefined}
          />
        );

      case 'email':
        return (
          <input
            id={inputId}
            type="email"
            placeholder={field.placeholder || 'Enter email...'}
            value={value || ''}
            onChange={handleInputChange}
            disabled={isBuilder || disabled}
            className={commonClass}
            style={isBuilder ? { pointerEvents: 'none' } : undefined}
          />
        );

      case 'phone':
        return (
          <input
            id={inputId}
            type="tel"
            placeholder={field.placeholder || 'Enter phone number...'}
            value={value || ''}
            onChange={handleInputChange}
            disabled={isBuilder || disabled}
            className={commonClass}
            style={isBuilder ? { pointerEvents: 'none' } : undefined}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={inputId}
            placeholder={field.placeholder || 'Enter long text...'}
            value={value || ''}
            onChange={handleInputChange}
            disabled={isBuilder || disabled}
            rows={4}
            className={`${commonClass} resize-none`}
            style={isBuilder ? { pointerEvents: 'none' } : undefined}
          />
        );

      case 'dropdown':
        const options = field.options || [];
        return (
          <div className="relative">
            <select
              id={inputId}
              value={value || ''}
              onChange={handleInputChange}
              disabled={isBuilder || disabled}
              className={`${commonClass} appearance-none cursor-pointer`}
              style={isBuilder ? { pointerEvents: 'none' } : undefined}
            >
              {options.length === 0 ? (
                <option value="" disabled>No options defined</option>
              ) : (
                <>
                  <option value="" disabled>{field.placeholder || 'Select an option'}</option>
                  {options.map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </>
              )}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none !text-dash-textMuted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <input
                id={inputId}
                type="checkbox"
                checked={!!value}
                onChange={handleCheckboxChange}
                disabled={isBuilder || disabled}
                className="w-5 h-5 rounded border border-dash-border bg-white checked:bg-dash-accent checked:border-transparent focus:outline-none transition-colors motion-reduce:transition-none cursor-pointer"
                style={isBuilder ? { pointerEvents: 'none' } : undefined}
              />
            </div>
            <label
              htmlFor={inputId}
              className="text-sm !text-dash-text cursor-pointer select-none"
              style={isBuilder ? { pointerEvents: 'none' } : undefined}
            >
              {field.label} {field.required && <span className="text-red">*</span>}
            </label>
          </div>
        );

      case 'upload':
        return (
          <UploadField
            fieldId={field.id}
            isBuilder={isBuilder}
            disabled={disabled}
            value={value}
            onChange={onChange}
          />
        );

      case 'signature':
        return (
          <SignaturePad
            fieldId={field.id}
            isBuilder={isBuilder}
            disabled={disabled}
            value={value}
            onChange={onChange}
          />
        );

      case 'payment':
        return (
          <PaymentBlock
            fieldId={field.id}
            isBuilder={isBuilder}
            disabled={disabled}
            value={value}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${field.width === 'half' ? 'col-span-1' : 'col-span-2'}`}>
      {field.type !== 'checkbox' && (
        <label htmlFor={inputId} className="text-xs font-bold !text-dash-textMuted">
          {field.label} {field.required && <span className="text-red">*</span>}
        </label>
      )}

      {renderInput()}

      {field.helpText && !error && (
        <p className="text-[11px] !text-dash-textMuted">{field.helpText}</p>
      )}

      {error && (
        <p className="text-[11px] text-red">{error}</p>
      )}
    </div>
  );
}

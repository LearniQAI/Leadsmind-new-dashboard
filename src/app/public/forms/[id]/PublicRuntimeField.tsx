'use client';

import React from 'react';
import { PublicFieldSchema } from './PublicValidationEngine';
import { UploadField } from '@/app/forms/builder/[id]/components/UploadField';
import { SignaturePad } from '@/app/forms/builder/[id]/components/SignaturePad';
import { PaymentBlock } from '@/app/forms/builder/[id]/components/PaymentBlock';

interface PublicFieldProps {
  field: PublicFieldSchema;
  value: any;
  error?: string;
  onChange: (val: any) => void;
  onFocus?: (id: string) => void;
  onBlur?: (id: string) => void;
}

// Scoped CSS class prefix to avoid host-page style collisions
const P = 'lm-field';

export function PublicRuntimeField({ field, value, error, onChange, onFocus, onBlur }: PublicFieldProps) {
  const inputId = `${P}-${field.id}`;

  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 12,
    color: '#eef2ff',
    fontSize: 13,
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#94a3c8',
    marginBottom: 6,
    fontFamily: 'Space Grotesk, sans-serif',
  };

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            id={inputId}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => onFocus?.(field.id)}
            onBlur={() => onBlur?.(field.id)}
            placeholder={field.placeholder || ''}
            style={baseInputStyle}
          />
        );
      case 'email':
        return (
          <input
            id={inputId}
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => onFocus?.(field.id)}
            onBlur={() => onBlur?.(field.id)}
            placeholder={field.placeholder || 'your@email.com'}
            style={baseInputStyle}
          />
        );
      case 'phone':
        return (
          <input
            id={inputId}
            type="tel"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => onFocus?.(field.id)}
            onBlur={() => onBlur?.(field.id)}
            placeholder={field.placeholder || '+1 234 567 8900'}
            style={baseInputStyle}
          />
        );
      case 'textarea':
        return (
          <textarea
            id={inputId}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => onFocus?.(field.id)}
            onBlur={() => onBlur?.(field.id)}
            placeholder={field.placeholder || ''}
            rows={4}
            style={{ ...baseInputStyle, resize: 'vertical' }}
          />
        );
      case 'dropdown': {
        const opts = field.options || [];
        return (
          <div style={{ position: 'relative' }}>
            <select
               id={inputId}
               value={value || ''}
               onChange={(e) => onChange(e.target.value)}
               onFocus={() => onFocus?.(field.id)}
               onBlur={() => onBlur?.(field.id)}
               style={{ ...baseInputStyle, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="" disabled>{field.placeholder || 'Select an option'}</option>
              {opts.map((opt, i) => (
                <option key={i} value={opt} style={{ background: '#0b132c', color: '#eef2ff' }}>
                  {opt}
                </option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#4a5a82', pointerEvents: 'none', fontSize: 11 }}>▼</span>
          </div>
        );
      }
      case 'checkbox':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id={inputId}
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#2563eb', cursor: 'pointer' }}
            />
            <label
              htmlFor={inputId}
              style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal', color: '#eef2ff', fontSize: 13, fontWeight: 500 }}
            >
              {field.label}
              {field.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
            </label>
          </div>
        );
      case 'upload':
        return (
          <UploadField
            fieldId={field.id}
            isBuilder={false}
            value={value}
            onChange={onChange}
          />
        );
      case 'signature':
        return (
          <SignaturePad
            fieldId={field.id}
            isBuilder={false}
            value={value}
            onChange={onChange}
          />
        );
      case 'payment':
        return (
          <PaymentBlock
            fieldId={field.id}
            isBuilder={false}
            value={value}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={P}
      style={{
        gridColumn: field.width === 'half' ? 'span 1' : 'span 2',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {field.type !== 'checkbox' && (
        <label htmlFor={inputId} style={labelStyle}>
          {field.label}
          {field.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
        </label>
      )}

      {renderInput()}

      {field.helpText && !error && (
        <p style={{ margin: 0, fontSize: 11, color: '#4a5a82', fontFamily: 'DM Sans, sans-serif' }}>
          {field.helpText}
        </p>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: 11, color: '#ef4444', fontFamily: 'DM Sans, sans-serif' }}>
          {error}
        </p>
      )}
    </div>
  );
}

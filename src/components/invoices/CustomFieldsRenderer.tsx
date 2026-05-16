'use client';

import React from 'react';
import { PremiumInput } from '@/components/ui/premium-inputs';

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';

export interface CustomFieldDefinition {
  id: string;
  field_name: string;
  field_type: CustomFieldType;
  placement: 'header' | 'line_items' | 'footer';
  is_required: boolean;
  options?: string[];
}

interface CustomFieldsRendererProps {
  definitions: CustomFieldDefinition[];
  values: Record<string, any>;
  placement: 'header' | 'line_items' | 'footer';
  onChange: (fieldId: string, value: any) => void;
}

const CustomFieldsRenderer: React.FC<CustomFieldsRendererProps> = ({
  definitions,
  values,
  placement,
  onChange,
}) => {
  const filteredFields = definitions.filter((d) => d.placement === placement);

  if (filteredFields.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filteredFields.map((field) => (
        <div key={field.id} className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--t3)]">
            {field.field_name}
            {field.is_required && <span className="text-[var(--red)] ml-1">*</span>}
          </label>

          {field.field_type === 'text' && (
            <PremiumInput
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder={`Enter ${field.field_name.toLowerCase()}...`}
            />
          )}

          {field.field_type === 'number' && (
            <PremiumInput
              type="number"
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder="0.00"
            />
          )}

          {field.field_type === 'date' && (
            <PremiumInput
              type="date"
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
            />
          )}

          {/* Note: Checkbox and Dropdown would need their own Premium versions or standard styling */}
          {field.field_type === 'checkbox' && (
            <div className="flex items-center gap-2 h-12">
               <input 
                type="checkbox" 
                checked={!!values[field.id]}
                onChange={(e) => onChange(field.id, e.target.checked)}
                className="w-5 h-5 rounded border-[var(--bdr)] bg-[var(--n800)] accent-[var(--accent)]"
               />
               <span className="text-sm text-[var(--t2)]">Yes / Enabled</span>
            </div>
          )}

          {field.field_type === 'dropdown' && (
            <select
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-[#080f28]/95 backdrop-blur-[8px] px-4 py-2 text-sm text-white font-dm-sans focus:outline-none focus:border-[#2563eb] transition-all"
            >
              <option value="">Select option...</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
};

export default CustomFieldsRenderer;

'use client';

import React from 'react';
import { DashInput } from '@/components/dashboard-ui/FormField';

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
          <label className="text-[13px] font-semibold !text-dash-text">
            {field.field_name}
            {field.is_required && <span className="text-red ml-1">*</span>}
          </label>

          {field.field_type === 'text' && (
            <DashInput
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder={`Enter ${field.field_name.toLowerCase()}...`}
            />
          )}

          {field.field_type === 'number' && (
            <DashInput
              type="number"
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              placeholder="0.00"
            />
          )}

          {field.field_type === 'date' && (
            <DashInput
              type="date"
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
            />
          )}

          {field.field_type === 'checkbox' && (
            <div className="flex items-center gap-2 h-11">
               <input
                type="checkbox"
                checked={!!values[field.id]}
                onChange={(e) => onChange(field.id, e.target.checked)}
                className="w-4 h-4 rounded border-dash-border accent-dash-accent"
               />
               <span className="text-sm !text-dash-textMuted">Yes / enabled</span>
            </div>
          )}

          {field.field_type === 'dropdown' && (
            <select
              value={values[field.id] || ''}
              onChange={(e) => onChange(field.id, e.target.value)}
              className="h-11 w-full rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text focus:outline-none focus:ring-2 focus:ring-dash-accent transition-colors motion-reduce:transition-none"
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

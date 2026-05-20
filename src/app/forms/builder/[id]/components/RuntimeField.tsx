'use client';

import React from 'react';
import { FormField } from './FormBuilderContext';
import { useRuntimeForm } from './RuntimeStore';
import { FieldRenderer } from './FieldRenderer';

interface RuntimeFieldProps {
  field: FormField;
}

export function RuntimeField({ field }: RuntimeFieldProps) {
  const { state, updateValue } = useRuntimeForm();
  const { values, errors, hiddenFieldIds } = state;

  // Skip rendering if field is hidden by conditional logic rules
  if (hiddenFieldIds.has(field.id)) {
    return null;
  }

  return (
    <FieldRenderer
      field={field}
      mode="form"
      value={values[field.id]}
      onChange={(val) => updateValue(field.id, val)}
      error={errors[field.id]}
    />
  );
}

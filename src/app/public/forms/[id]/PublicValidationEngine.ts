// Public Validation Engine — standalone, no builder imports
// Used by the public runtime renderer and the embed SDK

export interface PublicFieldSchema {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'dropdown' | 'checkbox' | 'upload' | 'signature' | 'payment';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  width?: 'full' | 'half';
  stepId?: string;
}

export function validatePublicField(
  field: PublicFieldSchema,
  value: any
): string | null {
  const strVal = value === null || value === undefined ? '' : String(value).trim();

  const isImplicitlyRequired = field.type === 'email' || field.type === 'phone';
  const isRequired = field.required || isImplicitlyRequired;

  if (isRequired) {
    if (field.type === 'checkbox' && !value) {
      return `Please accept "${field.label}"`;
    }
    if (strVal === '') {
      return `${field.label} is required`;
    }
  }

  if (strVal === '') return null;

  if (field.type === 'email') {
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(strVal)) {
      return 'Please enter a valid email address';
    }
  }

  if (field.type === 'phone') {
    const phoneRx = /^\+?[0-9\s\-()]{7,15}$/;
    if (!phoneRx.test(strVal)) {
      return 'Please enter a valid phone number';
    }
  }

  return null;
}

export function validatePublicStep(
  fields: PublicFieldSchema[],
  values: Record<string, any>,
  hiddenFieldIds: Set<string>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (hiddenFieldIds.has(field.id)) continue;
    const err = validatePublicField(field, values[field.id]);
    if (err) errors[field.id] = err;
  }

  return errors;
}

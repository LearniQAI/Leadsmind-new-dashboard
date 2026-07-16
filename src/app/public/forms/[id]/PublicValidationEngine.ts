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

// Scalar-only field types: a select/text/email/phone/checkbox value must
// never be an array or object. `upload`/`signature`/`payment` legitimately
// carry structured values (file metadata, signature data URL, transaction
// info) and are validated elsewhere.
const SCALAR_ONLY_TYPES = new Set<PublicFieldSchema['type']>([
  'text', 'email', 'phone', 'textarea', 'dropdown', 'checkbox',
]);

// Defense-in-depth against script injection in free-text fields. This is
// not a substitute for output-encoding wherever the value is later
// rendered (dashboard UI, PDFs, emails) — those call sites remain
// responsible for their own escaping — but it stops the most obvious
// payloads from ever being persisted.
const SCRIPT_INJECTION_RX = /<script[\s>]|javascript:|on\w+\s*=\s*["']/i;

const MAX_TEXT_LENGTH = 5000;

export function validatePublicField(
  field: PublicFieldSchema,
  value: any
): string | null {
  if (SCALAR_ONLY_TYPES.has(field.type) && value !== null && value !== undefined && typeof value === 'object') {
    return `${field.label} has an invalid value`;
  }

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

  if (field.type === 'dropdown' && field.options && field.options.length > 0) {
    if (!field.options.includes(strVal)) {
      return `Please select a valid option for "${field.label}"`;
    }
  }

  if ((field.type === 'text' || field.type === 'textarea') && strVal.length > MAX_TEXT_LENGTH) {
    return `${field.label} is too long`;
  }

  if (
    (field.type === 'text' || field.type === 'textarea') &&
    SCRIPT_INJECTION_RX.test(strVal)
  ) {
    return `${field.label} contains disallowed content`;
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

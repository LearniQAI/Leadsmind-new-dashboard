import { FormField } from './FormBuilderContext';

export interface ValidationRule {
  minLength?: number;
  maxLength?: number;
  isNumeric?: boolean;
}

export function validateField(
  field: FormField,
  value: any,
  rules?: ValidationRule
): string | null {
  const valStr = value === undefined || value === null ? '' : String(value).trim();

  const isImplicitlyRequired = field.type === 'email' || field.type === 'phone';
  const isRequired = field.required || isImplicitlyRequired;

  if (isRequired) {
    if (field.type === 'checkbox' && !value) {
      return 'You must accept this field';
    }
    if (valStr === '') {
      return `${field.label} is required`;
    }
  }

  if (valStr === '') return null; // Rest of validation is only for filled values

  // 2. Email format validation
  if (field.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(valStr)) {
      return 'Please enter a valid email address';
    }
  }

  // 3. Phone format validation
  if (field.type === 'phone') {
    const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
    if (!phoneRegex.test(valStr)) {
      return 'Please enter a valid phone number';
    }
  }

  // 4. Min / Max length validation
  if (rules?.minLength && valStr.length < rules.minLength) {
    return `Minimum length is ${rules.minLength} characters`;
  }
  if (rules?.maxLength && valStr.length > rules.maxLength) {
    return `Maximum length is ${rules.maxLength} characters`;
  }

  // 5. Numeric validation
  if (rules?.isNumeric || field.type === 'phone') {
    // Basic number conversion check
    if (rules?.isNumeric && isNaN(Number(valStr))) {
      return 'Please enter a numeric value';
    }
  }

  return null;
}

export function validateStep(
  fields: FormField[],
  values: Record<string, any>,
  hiddenFieldIds: Set<string>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    // Skip fields hidden by logic rules
    if (hiddenFieldIds.has(field.id)) continue;

    // Apply minLength/maxLength if type demands or config allows
    const rules: ValidationRule = {};
    if (field.type === 'text' || field.type === 'textarea') {
      // In a later sprint we could customize min/max in UI. Default safety:
      rules.maxLength = 500;
    }

    const err = validateField(field, values[field.id], rules);
    if (err) {
      errors[field.id] = err;
    }
  }

  return errors;
}

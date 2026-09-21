import { describe, it, expect } from 'vitest';
import { isUserSafeError, userSafeMessage } from '@/shared/errors/userSafe';
import { EmailSendError } from '@/lib/email';
import { AppError, ValidationError } from '@/shared/errors/AppError';

describe('userSafe', () => {
  it('EmailSendError and AppError are safe', () => {
    expect(isUserSafeError(new EmailSendError('The to field must be a valid email address'))).toBe(true);
    expect(isUserSafeError(new ValidationError('Name is required'))).toBe(true);
    expect(userSafeMessage(new AppError('X', 'custom safe', 400), 'generic')).toBe('custom safe');
  });

  it('plain errors, PDF/Chromium failures, DB error objects and non-errors are never safe', () => {
    expect(userSafeMessage(new Error('Could not find Chromium at /var/task/node_modules/@sparticuz/chromium/bin'), 'generic')).toBe('generic');
    expect(userSafeMessage(new TypeError('fetch failed: connect ECONNREFUSED 10.0.0.5:5432'), 'generic')).toBe('generic');
    expect(userSafeMessage({ message: 'duplicate key value violates unique constraint "invoices_pkey"', code: '23505' }, 'generic')).toBe('generic');
    expect(userSafeMessage('a string', 'generic')).toBe('generic');
    expect(userSafeMessage(undefined, 'generic')).toBe('generic');
  });
});

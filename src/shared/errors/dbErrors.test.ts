import { describe, it, expect, vi } from 'vitest';

vi.mock('@/shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { friendlyDbError, sqlStateOf } from './dbErrors';
import { toClientError, AppError } from './AppError';

describe('friendlyDbError', () => {
  it.each([
    ['23505', 'DUPLICATE', 409],
    ['22P02', 'INVALID_FORMAT', 422],
    ['23503', 'REFERENCE_MISSING', 409],
    ['23502', 'REQUIRED_MISSING', 422],
    ['23514', 'INVALID_VALUE', 422],
    ['22007', 'INVALID_FORMAT', 422],
  ])('maps %s -> %s', (state, code, status) => {
    const f = friendlyDbError({ code: state, message: 'duplicate key value violates unique constraint "some_table_some_key"' });
    expect(f?.code).toBe(code);
    expect(f?.status).toBe(status);
    expect(f?.message).not.toMatch(/constraint|violates|key|uuid|contacts_/i);
  });
  it('a duplicate contact email (any of the three keys) says so, without the key name', () => {
    for (const key of ['contacts_workspace_id_email_key', 'unique_workspace_contact', 'contacts_workspace_lower_email_key']) {
      const f = friendlyDbError({ code: '23505', message: `duplicate key value violates unique constraint "${key}"` });
      expect(f?.code).toBe('DUPLICATE_EMAIL');
      expect(f?.message).toBe('A client with this email already exists.');
    }
    expect(friendlyDbError({ code: '23505', message: 'violates unique constraint "invoices_pkey"' })?.code).toBe('DUPLICATE');
  });

  it('ignores non-DB errors and non-SQLSTATE codes', () => {
    expect(friendlyDbError(new Error('boom'))).toBeNull();
    expect(friendlyDbError({ code: 'ECONNRESET' })).toBeNull();
    expect(sqlStateOf({ code: 'PGRST204' })).toBeUndefined(); // PostgREST codes are not SQLSTATEs
    expect(friendlyDbError({ code: 'PGRST204' })).toBeNull();
  });
});

describe('toClientError', () => {
  it('turns a raw unique violation into a safe message with a request id, never the raw text', () => {
    const raw = { code: '23505', message: 'duplicate key value violates unique constraint "contacts_workspace_id_email_key"', details: 'Key (workspace_id, email)=(x, a@b.c) already exists.' };
    const out = toClientError(raw);
    expect(out.code).toBe('DUPLICATE_EMAIL'); // the contacts email key is recognised by name
    expect(out.error).toBe('A client with this email already exists.');
    expect(out.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(out)).not.toMatch(/contacts_workspace|a@b\.c|Key \(/);
  });
  it('maps the empty-uuid error (22P02) and a missing parent (23503)', () => {
    expect(toClientError({ code: '22P02', message: 'invalid input syntax for type uuid: ""' }).error).toMatch(/not in a valid format/);
    expect(toClientError({ code: '23503', message: 'insert or update on table violates foreign key constraint' }).error).toMatch(/no longer exists/);
  });
  it('keeps AppError messages and the generic fallback for unknown errors', () => {
    expect(toClientError(new AppError('X', 'custom', 400)).error).toBe('custom');
    expect(toClientError(new Error('whatever')).error).toBe('An unexpected error occurred. Please try again.');
  });
});

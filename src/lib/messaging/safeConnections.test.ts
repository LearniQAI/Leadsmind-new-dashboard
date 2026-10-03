import { describe, it, expect } from 'vitest';
import { sanitizeConnectionCredentials, toSafeConnection, containsSecretKeys } from './safeConnections';

const real = {
  access_token_encrypted: 'ciphertext-a',
  system_user_access_token_encrypted: 'ciphertext-b',
  user_access_token_encrypted: 'ciphertext-c',
  page_access_token_encrypted: 'ciphertext-d',
  refresh_token: 'plain',
  client_secret: 'x',
  password: 'x',
  waba_id: '123', waba_name: 'Acme', phone_number: '+27 82 555 0101', phone_number_id: '456',
  page_id: 'p1', page_name: 'Acme Page', instagram_id: 'i1', instagram_username: 'acme',
  health_status: 'connected', discovery_status: 'done', token_expires_at: '2026-12-01T00:00:00Z', account_name: 'Acme',
};

describe('sanitizeConnectionCredentials', () => {
  it('drops every encrypted/secret key and keeps display fields', () => {
    const out = sanitizeConnectionCredentials(real);
    expect(Object.keys(out).filter((k) => /encrypted|secret|password|refresh_token/.test(k))).toEqual([]);
    expect(containsSecretKeys(out)).toBe(false);
    expect(out).toMatchObject({ waba_name: 'Acme', phone_number: '+27 82 555 0101', page_name: 'Acme Page', health_status: 'connected', token_expires_at: '2026-12-01T00:00:00Z' });
  });

  it('token_expires_at is kept (a date, not a secret) while real tokens are not', () => {
    const out = sanitizeConnectionCredentials({ token_expires_at: 'x', access_token: 'y', access_token_encrypted: 'z' });
    expect(Object.keys(out)).toEqual(['token_expires_at']);
  });

  it('an unknown future key is NOT passed through (allow-list)', () => {
    expect(sanitizeConnectionCredentials({ brand_new_secret_blob: 'x', waba_id: '1' })).toEqual({ waba_id: '1' });
  });

  it('never passes objects or arrays through, even under an allowed key', () => {
    expect(sanitizeConnectionCredentials({ page_name: { access_token_encrypted: 'x' }, waba_id: ['x'] })).toEqual({});
  });

  it('handles null, undefined and non-objects', () => {
    expect(sanitizeConnectionCredentials(null)).toEqual({});
    expect(sanitizeConnectionCredentials(undefined)).toEqual({});
    expect(sanitizeConnectionCredentials('str')).toEqual({});
  });
});

describe('toSafeConnection', () => {
  it('keeps the row shape and replaces credentials', () => {
    const row = toSafeConnection({ platform: 'whatsapp', status: 'connected', last_sync_at: null, credentials: real });
    expect(row.platform).toBe('whatsapp');
    expect(containsSecretKeys(row)).toBe(false);
  });
});

describe('containsSecretKeys', () => {
  it('finds nested secret keys and ignores clean payloads', () => {
    expect(containsSecretKeys([{ a: { b_encrypted: 1 } }])).toBe(true);
    expect(containsSecretKeys({ credentials: { access_token_encrypted: 'x' } })).toBe(true);
    expect(containsSecretKeys({ platform: 'sms', credentials: {} })).toBe(false);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAdminClient } from './server';

describe('createAdminClient — throws on missing/placeholder service key', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws [FATAL] error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => createAdminClient()).toThrow('[FATAL]');
  });

  it('throws when the key is a placeholder string', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'your_supabase_service_role_key';

    expect(() => createAdminClient()).toThrow('[FATAL]');
  });

  it('does not throw when a real-looking key is provided', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';

    expect(() => createAdminClient()).not.toThrow();
  });
});

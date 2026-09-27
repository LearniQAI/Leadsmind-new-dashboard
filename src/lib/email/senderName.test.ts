import { describe, it, expect } from 'vitest';
import { validateSenderName } from './senderName';

describe('validateSenderName', () => {
  it.each([
    'Zain Ul Hassan',
    'ESL TEFL HUB',
    'AtlasGlobal',
    'World Teachers Academy',
    'Acme & Co.',
    'Café Müller',
    'O’Brien Coaching',
  ])('accepts a real sender name: %s', (name) => {
    expect(validateSenderName(name)).toEqual({ ok: true, name, reason: '' });
  });

  it('trims and collapses whitespace', () => {
    expect(validateSenderName('  Acme   Coaching ').name).toBe('Acme Coaching');
  });

  it.each([
    [null, /Enter a From name/],
    ['', /Enter a From name/],
    ['   ', /Enter a From name/],
    ['A', /too short/],
    ['x'.repeat(61), /under 60/],
    ['hello@acme.com', /not an email address or link/],
    ['Acme <hello@acme.com>', /not an email address or link/],
    ['www.acme.com', /not an email address or link/],
    ['12345', /real words/],
    ['LeadsMind', /not LeadsMind/],
    ['Leads Mind Team', /not LeadsMind/],
    // The signup default (auth/callback) — the live worldteachers.academy fallback on 2026-09-27.
    ["Jamesjkdjkd's Workspace", /default workspace name/],
    ['Olu Max’s Workspace', /default workspace name/],
    ['Test', /placeholder/],
    ['Your Company', /placeholder/],
    ['noreply', /placeholder/],
  ])('rejects %j', (name, reason) => {
    const r = validateSenderName(name as string | null);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(reason);
  });
});

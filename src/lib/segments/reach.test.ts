import { describe, it, expect } from 'vitest';
import { computeReach } from '@/lib/segments/reach';

describe('computeReach', () => {
  it('excludes unsubscribed / invalid / no-email from email and no-phone / opted-out from SMS + WhatsApp', () => {
    const suppressed = new Set(['ws|b@x.com']);
    const contacts = [
      { email: 'a@x.com', phone: '1' },
      { email: 'B@x.com', phone: '2' },                       // unsubscribed (case-insensitive)
      { email: 'c@x.com', phone: '3', is_invalid_email: true },
      { email: 'd@x.com', phone: null },                      // no phone
      { email: null, phone: '5', sms_opt_out: true },         // no email, opted out
      { email: 'f@x.com', phone: '6', opted_out: true },
    ];
    expect(computeReach(contacts, 'ws', suppressed)).toEqual({ email: 3, sms: 3, whatsapp: 3 });
  });
});

import { describe, expect, it, vi } from 'vitest';

const sendSMS = vi.fn();
vi.mock('@/lib/sms', () => ({ sendSMS: (...a: any[]) => sendSMS(...a) }));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => { throw new Error('must not touch the database'); } }));

import { send_whatsapp_template } from './lms_actions';

describe('send_whatsapp_template executor (item 5)', () => {
  it('fails loudly and sends nothing (it used to send literal "Template: ..." text)', async () => {
    await expect(send_whatsapp_template('ws', 'contact', { templateName: 'order_confirmation', languageCode: 'en' }))
      .rejects.toThrow(/not available yet and nothing was sent/);
    expect(sendSMS).not.toHaveBeenCalled();
  });
});

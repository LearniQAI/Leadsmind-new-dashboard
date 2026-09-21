import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendInvoiceEmail = vi.fn();
const sendQuoteEmail = vi.fn();
const logErr = vi.fn();

vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => ({}), createAdminClient: () => ({}) }));
vi.mock('@/lib/stripe', () => ({ stripe: {} }));
vi.mock('@/lib/paystack', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  requireWorkspaceAccess: async () => ({ workspaceId: 'w1' }),
  getUser: vi.fn(), getCurrentWorkspaceId: vi.fn(),
}));
vi.mock('@/lib/invoices/sendInvoiceEmail', () => ({ sendInvoiceEmail: (...a: any[]) => sendInvoiceEmail(...a) }));
vi.mock('@/lib/quotes/sendQuoteEmail', () => ({ sendQuoteEmail: (...a: any[]) => sendQuoteEmail(...a) }));

import { sendInvoiceNow } from '@/app/actions/finance';
import { sendQuoteNow } from '@/app/actions/quotes';
import { EmailSendError } from '@/lib/email';

const CHROMIUM = 'Could not find Chromium at /var/task/node_modules/@sparticuz/chromium/bin (launch failed: spawn ENOENT)';
const DB = { message: 'duplicate key value violates unique constraint "invoices_pkey"', code: '23505' };

beforeEach(() => { sendInvoiceEmail.mockReset(); sendQuoteEmail.mockReset(); logErr.mockReset(); });

describe.each([
  ['sendInvoiceNow', () => sendInvoiceNow('i1'), sendInvoiceEmail, 'invoice'],
  ['sendQuoteNow', () => sendQuoteNow('q1'), sendQuoteEmail, 'quote'],
] as const)('%s error classification', (_name, run, mock, noun) => {
  it('still shows a provider/config rejection (actionable)', async () => {
    mock.mockImplementation(async () => {
      throw new EmailSendError('Email delivery is unavailable for this workspace — connect a Resend account before sending automated emails.');
    });
    const r: any = await run();
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/connect a Resend account/);
  });

  it('masks a PDF-generation (Chromium) failure and logs the real error', async () => {
    const pdfErr = new Error(CHROMIUM);
    mock.mockImplementation(async () => { throw pdfErr; });
    const r: any = await run();
    expect(r.error).toBe(`Failed to send ${noun}. Please try again.`);
    expect(JSON.stringify(r)).not.toMatch(/Chromium|\/var\/task|ENOENT/);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: pdfErr }), expect.stringContaining('failed'));
  });

  it('masks a database error object', async () => {
    mock.mockImplementation(async () => { throw DB; });
    const r: any = await run();
    expect(r.error).toBe(`Failed to send ${noun}. Please try again.`);
    expect(JSON.stringify(r)).not.toMatch(/duplicate key|invoices_pkey|23505/);
  });

  it('keeps the helper\'s own literal failures (e.g. contact has no email) unchanged', async () => {
    mock.mockResolvedValue({ success: false, error: 'Contact has no email address' });
    const r: any = await run();
    expect(r.error).toBe('Contact has no email address');
  });
});

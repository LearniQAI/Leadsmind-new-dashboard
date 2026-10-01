// MANUAL ONLY. Live verification of the invoice flow (client create / duplicate / idempotency, invoice save +
// server-side VAT, update, send failure) under a REAL signed-in session, in Zain Workspace only.
//   - not matched by the main vitest config, and a no-op unless RUN_LIVE_INVOICE_TESTS=1:
//       npm run test:live:invoice
//   - every row is tagged "invflow-" (contact first_name, invoice_number, notification message) and swept before
//     (killed-run leftovers) and after the run.
// Real: auth, requireWorkspaceAccess, RLS, ContactService, saveInvoice/updateInvoice, unique constraints.
// ADMIN (service role): minting the sign-in OTP, READ assertions, the amount_paid fixture, the VAT-off toggle (restored in
// finally), teardown. Mail: contacts use delivered+...@resend.dev, and sendInvoiceNow runs for real (PDF + provider).
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const RUN = process.env.RUN_LIVE_INVOICE_TESTS === '1';
const ZAIN_WS = 'b83f0966-837e-4952-9cd4-480be4ca3f16';
const OTHER_WS = '1f061259-810e-42a9-82a8-2a3836264b77';
const ZAIN_ADMIN_EMAIL = 'zainalimuhammad5857@gmail.com';
const TAG = 'invflow-';
const RUNID = randomUUID().slice(0, 6);

let activeJar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (activeJar.has(name) ? { name, value: activeJar.get(name)! } : undefined),
    getAll: () => [...activeJar].map(([name, value]) => ({ name, value })),
    set: (a: any, b?: any) => { const n = typeof a === 'string' ? a : a.name; const v = typeof a === 'string' ? b : a.value; if (v) activeJar.set(n, v); else activeJar.delete(n); },
    delete: (name: string) => activeJar.delete(name),
  }),
  headers: () => new Headers(),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

// Failure injection for the send-gate tests (default: real PDF, real provider).
const inject = vi.hoisted(() => ({ pdf: 'real' as 'real' | 'fail', mail: 'real' as 'real' | 'fail', mailAttempts: 0 }));
vi.mock('@/lib/pdf/htmlToPdf', async (orig) => {
  const real = await orig<any>();
  return { ...real, htmlToPdfBuffer: (...a: any[]) => (inject.pdf === 'fail' ? Promise.reject(new Error('injected: chromium failed to launch')) : real.htmlToPdfBuffer(...a)) };
});
vi.mock('@/lib/email', async (orig) => {
  const real = await orig<any>();
  return { ...real, sendEmail: (...a: any[]) => { inject.mailAttempts++; return inject.mail === 'fail' ? Promise.reject(new Error('injected: provider down')) : real.sendEmail(...a); } };
});

let admin: any;
let C: any; // contacts actions
let F: any; // finance actions
const report: Record<string, any> = {};
const createdContactIds = new Set<string>();
const createdInvoiceIds = new Set<string>();

const email = (n: string) => `delivered+${TAG}${RUNID}-${n}@resend.dev`;
const ITEMS = [{ id: randomUUID(), description: 'Consulting', quantity: 2, rate: 100, taxRate: 15 }];
const invoicePayload = (contactId: string, extra: Record<string, any> = {}) => ({
  contact_id: contactId,
  invoice_number: `${TAG}${RUNID}-${randomUUID().slice(0, 4)}`,
  issue_date: '2026-10-01',
  due_date: '2026-10-15',
  items: ITEMS,
  currency: 'ZAR',
  // deliberately WRONG client-side figures: the server must recompute them
  subtotal: 1, tax_total: 1, total_amount: 1, amount_due: 1, amount_paid: 999,
  ...extra,
});
const track = (r: any) => { if (r?.success && r.data?.id) createdInvoiceIds.add(r.data.id); return r; };
const trackC = (r: any) => { if (r?.success && r.data?.id) createdContactIds.add(r.data.id); return r; };
const row = async (table: string, id: string) => (await admin.from(table).select('*').eq('id', id).maybeSingle()).data;

async function sweep() {
  const out: Record<string, string[]> = {};
  const del = async (table: string, col: string, key: string) => {
    const { data } = await admin.from(table).select('id').eq('workspace_id', ZAIN_WS).like(col, `${TAG}%`);
    const ids = (data ?? []).map((r: any) => r.id as string);
    if (ids.length) await admin.from(table).delete().eq('workspace_id', ZAIN_WS).in('id', ids);
    out[key] = ids;
  };
  await del('invoices', 'invoice_number', 'invoices');
  // invoices of tagged contacts that were created with another number
  const { data: cs } = await admin.from('contacts').select('id').eq('workspace_id', ZAIN_WS).like('first_name', `${TAG}%`);
  const cids = (cs ?? []).map((c: any) => c.id);
  if (cids.length) {
    const { data: inv2 } = await admin.from('invoices').select('id').eq('workspace_id', ZAIN_WS).in('contact_id', cids);
    const ids2 = (inv2 ?? []).map((r: any) => r.id);
    if (ids2.length) await admin.from('invoices').delete().eq('workspace_id', ZAIN_WS).in('id', ids2);
    out.invoicesByContact = ids2;
  }
  await del('contacts', 'first_name', 'contacts');
  await del('notifications', 'message', 'notifications');
  return out;
}

beforeAll(async () => {
  if (!RUN) return;
  admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: ZAIN_ADMIN_EMAIL });
  if (error) throw new Error(`generateLink: ${error.message}`);
  const jar = new Map<string, string>();
  const user = ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get: (n: string) => jar.get(n), set: (n: string, v: string) => { jar.set(n, v); }, remove: (n: string) => { jar.delete(n); } },
  });
  const v = await user.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (v.error) throw new Error(`verifyOtp: ${v.error.message}`);
  jar.set('active_workspace_id', ZAIN_WS);
  activeJar = jar;
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  C = await import('@/app/actions/contacts');
  F = await import('@/app/actions/finance');
  report.staleSweep = await sweep();
});

afterAll(async () => {
  if (!RUN) return;
  const swept = await sweep();
  const left = async (t: string, c: string) => (await admin.from(t).select('id', { count: 'exact', head: true }).eq('workspace_id', ZAIN_WS).like(c, `${TAG}%`)).count;
  report.cleanup = {
    tracked: { contacts: [...createdContactIds], invoices: [...createdInvoiceIds] },
    swept,
    remaining: { contacts: await left('contacts', 'first_name'), invoices: await left('invoices', 'invoice_number'), notifications: await left('notifications', 'message') },
  };
  if (process.env.INVOICE_REPORT_FILE) (await import('fs')).writeFileSync(process.env.INVOICE_REPORT_FILE, JSON.stringify(report, null, 1));
});

describe.skipIf(!RUN)('invoice flow (real session, Zain Workspace)', () => {
  let clientA = ''; // brand-new client, reused by later tests
  const emailA = email('a');

  it('brand-new client -> saved with its operation id; invoice saved with SERVER-computed workspace VAT', async () => {
    const op = randomUUID();
    const res = trackC(await C.createContact({ firstName: `${TAG}${RUNID}-A`, lastName: 'Client', email: emailA, source: 'Invoice/Quote Creator', clientOperationId: op }));
    expect(res.success).toBe(true);
    clientA = res.data.id;
    const dbRow = await row('contacts', clientA);
    expect(dbRow.workspace_id).toBe(ZAIN_WS);
    expect(dbRow.client_operation_id).toBe(op);

    const settings = await F.getInvoiceSettings();
    expect(settings.vat_enabled).toBe(true);
    const inv = track(await F.saveInvoice(invoicePayload(clientA, { clientOperationId: randomUUID() }), { skipAutoNotify: true }));
    expect(inv.success).toBe(true);
    const d = await row('invoices', inv.data.id);
    const vat = Number(settings.vat_rate);
    expect(Number(d.subtotal)).toBe(200);
    expect(Number(d.tax_total)).toBe(Number((200 * 15 / 100).toFixed(2)));
    expect(Number(d.total_amount)).toBe(230);
    expect(Number(d.amount_due)).toBe(230);
    expect(Number(d.amount_paid)).toBe(0); // client claimed 999
    expect(d.contact_id).toBe(clientA);
    report.newClientAndInvoice = { contactId: clientA, invoiceId: d.id, vatRateInSettings: vat, subtotal: d.subtotal, tax: d.tax_total, total: d.total_amount, clientClaimedTotal: 1 };
  });

  it('a line with NO tax rate gets the workspace rate; with VAT switched off in the workspace every line is 0%', async () => {
    const noRate = track(await F.saveInvoice(invoicePayload(clientA, { items: [{ id: randomUUID(), description: 'No rate', quantity: 1, rate: 100 }], clientOperationId: randomUUID() }), { skipAutoNotify: true }));
    expect(noRate.success).toBe(true);
    const d1 = await row('invoices', noRate.data.id);
    expect(Number(d1.tax_total)).toBe(15);
    expect(Number(d1.total_amount)).toBe(115);

    const { data: ws } = await admin.from('workspaces').select('invoice_settings').eq('id', ZAIN_WS).single();
    const original = ws.invoice_settings;
    try {
      await admin.from('workspaces').update({ invoice_settings: { ...original, vat_enabled: false } }).eq('id', ZAIN_WS);
      const off = track(await F.saveInvoice(invoicePayload(clientA, { clientOperationId: randomUUID() }), { skipAutoNotify: true })); // items carry taxRate 15
      expect(off.success).toBe(true);
      const d2 = await row('invoices', off.data.id);
      expect(Number(d2.tax_total)).toBe(0);
      expect(Number(d2.total_amount)).toBe(200);
      report.vat = { noTaxRateLine: { tax: d1.tax_total, total: d1.total_amount }, vatDisabledWorkspace: { tax: d2.tax_total, total: d2.total_amount } };
    } finally {
      await admin.from('workspaces').update({ invoice_settings: original }).eq('id', ZAIN_WS);
      const { data: back } = await admin.from('workspaces').select('invoice_settings').eq('id', ZAIN_WS).single();
      expect(back.invoice_settings).toEqual(original);
    }
  });

  it('blank due date / invoice number (the form defaults) save fine: they reach the DB as NULL, not ""', async () => {
    const inv = track(await F.saveInvoice(invoicePayload(clientA, { due_date: '', issue_date: '', invoice_number: '', clientOperationId: randomUUID() }), { skipAutoNotify: true }));
    expect(inv.success).toBe(true);
    const d = await row('invoices', inv.data.id);
    expect(d.due_date).toBeNull();
    expect(d.invoice_number).toBeNull();
    expect(d.issue_date).toBeTruthy(); // column default (today)
    report.blankDates = { saved: true, due_date: d.due_date, invoice_number: d.invoice_number, issue_date_defaulted: !!d.issue_date };
  });

  it('existing client: select it and save', async () => {
    const inv = track(await F.saveInvoice(invoicePayload(clientA, { clientOperationId: randomUUID() }), { skipAutoNotify: true }));
    expect(inv.success).toBe(true);
    expect((await row('invoices', inv.data.id)).contact_id).toBe(clientA);
    report.existingClient = { invoiceId: inv.data.id };
  });

  it('duplicate email (exact and different case): friendly DUPLICATE_EMAIL + the existing client; no second contact; select-existing works', async () => {
    const dup = await C.createContact({ firstName: `${TAG}${RUNID}-dup`, lastName: 'Other', email: emailA, clientOperationId: randomUUID() });
    expect(dup.success).toBe(false);
    expect(dup.code).toBe('DUPLICATE_EMAIL');
    expect(dup.error).toBe('A client with this email already exists.');
    expect(dup.existing.id).toBe(clientA);
    expect(JSON.stringify(dup)).not.toMatch(/constraint|23505|violates|key/i);

    const upper = await C.createContact({ firstName: `${TAG}${RUNID}-dup2`, lastName: 'Other', email: emailA.toUpperCase(), clientOperationId: randomUUID() });
    expect(upper.success).toBe(false);
    expect(upper.code).toBe('DUPLICATE_EMAIL');
    expect(upper.existing.id).toBe(clientA);

    const { count } = await admin.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', ZAIN_WS).ilike('email', emailA);
    expect(count).toBe(1);
    const { count: strays } = await admin.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', ZAIN_WS).like('first_name', `${TAG}${RUNID}-dup%`);
    expect(strays).toBe(0);

    const inv = track(await F.saveInvoice(invoicePayload(dup.existing.id, { clientOperationId: randomUUID() }), { skipAutoNotify: true }));
    expect(inv.success).toBe(true);
    report.duplicateEmail = { message: dup.error, code: dup.code, existingId: dup.existing.id, contactsWithEmail: count, caseVariantAlsoCaught: true, invoiceOnExisting: inv.data.id };
  });

  it('client creation is idempotent: replay and concurrent double-submit with one operation id -> one row', async () => {
    const op = randomUUID();
    const mk = () => C.createContact({ firstName: `${TAG}${RUNID}-idem`, lastName: 'Replay', email: email('idem'), clientOperationId: op });
    const first = trackC(await mk());
    const replay = trackC(await mk());
    expect(first.success && replay.success).toBe(true);
    expect(replay.data.id).toBe(first.data.id);
    expect(replay.replayed).toBe(true);

    const op2 = randomUUID();
    const mk2 = () => C.createContact({ firstName: `${TAG}${RUNID}-idem2`, lastName: 'Race', email: email('idem2'), clientOperationId: op2 });
    const [a, b] = await Promise.all([mk2(), mk2()]);
    trackC(a); trackC(b);
    expect(a.success && b.success).toBe(true);
    expect(a.data.id).toBe(b.data.id);
    const { count } = await admin.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', ZAIN_WS).eq('client_operation_id', op2);
    expect(count).toBe(1);

    const bad = await C.createContact({ firstName: `${TAG}${RUNID}-bad`, lastName: 'Op', email: email('bad'), clientOperationId: 'nope' });
    expect(bad.success).toBe(false);
    report.clientIdempotency = { replaySameId: replay.data.id === first.data.id, concurrentSameId: a.data.id === b.data.id, rowsForOperation: count, badOperationId: bad.error };
  });

  it('invoice save is idempotent: replay and concurrent submit with one operation id -> one invoice', async () => {
    const op = randomUUID();
    const p = invoicePayload(clientA, { clientOperationId: op });
    const first = track(await F.saveInvoice(p, { skipAutoNotify: true }));
    const replay = track(await F.saveInvoice({ ...p, invoice_number: p.invoice_number + '-x' }, { skipAutoNotify: true }));
    expect(first.success && replay.success).toBe(true);
    expect(replay.data.id).toBe(first.data.id);
    expect(replay.replayed).toBe(true);

    const op2 = randomUUID();
    const p2 = invoicePayload(clientA, { clientOperationId: op2 });
    const [a, b] = await Promise.all([F.saveInvoice(p2, { skipAutoNotify: true }), F.saveInvoice(p2, { skipAutoNotify: true })]);
    track(a); track(b);
    expect(a.success && b.success).toBe(true);
    expect(a.data.id).toBe(b.data.id);
    const { count } = await admin.from('invoices').select('id', { count: 'exact', head: true }).eq('workspace_id', ZAIN_WS).eq('client_operation_id', op2);
    expect(count).toBe(1);
    report.invoiceIdempotency = { replaySameId: true, concurrentSameId: a.data.id === b.data.id, rowsForOperation: count };
  });

  it('failures are friendly results (never raw DB text, never a throw): foreign contact, no items, bad operation id, no session', async () => {
    const { data: foreign } = await admin.from('contacts').select('id').eq('workspace_id', OTHER_WS).limit(1);
    const x = await F.saveInvoice(invoicePayload(foreign[0].id, { clientOperationId: randomUUID() }), { skipAutoNotify: true });
    expect(x.success).toBe(false);
    expect(x.error).toMatch(/no longer exists/);
    const none = await F.saveInvoice(invoicePayload(clientA, { items: [], clientOperationId: randomUUID() }), { skipAutoNotify: true });
    expect(none.success).toBe(false);
    expect(none.error).toMatch(/at least one line item/);
    const badOp = await F.saveInvoice(invoicePayload(clientA, { clientOperationId: 'nope' }), { skipAutoNotify: true });
    expect(badOp.success).toBe(false);
    const blankFk = await F.saveInvoice(invoicePayload('' as any, { clientOperationId: randomUUID() }), { skipAutoNotify: true });
    expect(blankFk.success).toBe(false);

    const saved = activeJar; activeJar = new Map();
    const noSessionContact = await C.createContact({ firstName: `${TAG}${RUNID}-nosess`, lastName: 'X', email: email('nosess') });
    const noSessionInvoice = await F.saveInvoice(invoicePayload(clientA), { skipAutoNotify: true });
    activeJar = saved;
    expect(noSessionContact.success).toBe(false);
    expect(noSessionContact.error).toMatch(/session has expired/);
    expect(noSessionInvoice.success).toBe(false);
    expect(noSessionInvoice.error).toMatch(/session has expired/);
    for (const r of [x, none, badOp, blankFk, noSessionContact, noSessionInvoice]) expect(JSON.stringify(r)).not.toMatch(/violates|constraint|22P02|uuid|PGRST/i);
    report.friendlyFailures = { foreignContact: x.error, noItems: none.error, badOperationId: badOp.error, blankContactId: blankFk.error, noSessionContact: noSessionContact.error, noSessionInvoice: noSessionInvoice.error };
  });

  it('update: zero-row is a failure, other workspace is untouchable, paid amount is preserved and totals recomputed', async () => {
    const inv = track(await F.saveInvoice(invoicePayload(clientA, { clientOperationId: randomUUID() }), { skipAutoNotify: true }));
    await admin.from('invoices').update({ amount_paid: 50 }).eq('id', inv.data.id); // ADMIN fixture: a part-payment
    const up = await F.updateInvoice(inv.data.id, invoicePayload(clientA, { items: [{ id: randomUUID(), description: 'Changed', quantity: 4, rate: 100, taxRate: 15 }], amount_paid: 0, total_amount: 1 }));
    expect(up.success).toBe(true);
    const d = await row('invoices', inv.data.id);
    expect(Number(d.total_amount)).toBe(460);
    expect(Number(d.amount_paid)).toBe(50);
    expect(Number(d.amount_due)).toBe(410);

    const ghost = await F.updateInvoice(randomUUID(), invoicePayload(clientA));
    expect(ghost.success).toBe(false);
    expect(ghost.error).toMatch(/not found/i);
    const { data: foreignInv } = await admin.from('invoices').select('id, total_amount').eq('workspace_id', OTHER_WS).limit(1);
    if (foreignInv?.length) {
      const before = foreignInv[0].total_amount;
      const x = await F.updateInvoice(foreignInv[0].id, invoicePayload(clientA));
      expect(x.success).toBe(false);
      const after = (await admin.from('invoices').select('total_amount').eq('id', foreignInv[0].id).single()).data.total_amount;
      expect(after).toBe(before);
    }
    report.update = { total: d.total_amount, amountPaidKept: d.amount_paid, amountDue: d.amount_due, ghostUpdate: ghost.error };
  });

  it('send is a gate: PDF failure and provider failure leave the invoice a DRAFT with a visible error; "mark as sent" cannot bypass it; Retry then works', async () => {
    const inv = track(await F.saveInvoice(invoicePayload(clientA, { clientOperationId: randomUUID() }), { skipAutoNotify: true }));
    const id = inv.data.id;
    try {
      inject.pdf = 'fail'; inject.mailAttempts = 0;
      const pdfFail = await F.sendInvoiceNow(id);
      expect(pdfFail.success).toBe(false);
      expect(pdfFail.error).toBe('Failed to send invoice. Please try again.'); // generic: no chromium/path detail
      expect((await row('invoices', id)).status).toBe('draft');
      expect(inject.mailAttempts).toBe(0); // no email without a PDF

      const viaStatus = await F.updateInvoiceStatus(id, 'sent'); // the preview's "Send invoice" menu item
      expect(viaStatus.success).toBe(false);
      expect((await row('invoices', id)).status).toBe('draft');
      expect(inject.mailAttempts).toBe(0);

      inject.pdf = 'real'; inject.mail = 'fail';
      const mailFail = await F.sendInvoiceNow(id);
      expect(mailFail.success).toBe(false);
      expect(inject.mailAttempts).toBe(1); // attempted, failed
      expect((await row('invoices', id)).status).toBe('draft');

      inject.mail = 'real';
      const retry = await F.sendInvoiceNow(id); // the user's Retry
      expect(retry.success).toBe(true);
      expect((await row('invoices', id)).status).toBe('sent');

      const inv2 = track(await F.saveInvoice(invoicePayload(clientA, { clientOperationId: randomUUID() }), { skipAutoNotify: true }));
      const viaMenu = await F.updateInvoiceStatus(inv2.data.id, 'sent');
      expect(viaMenu.success).toBe(true);
      expect((await row('invoices', inv2.data.id)).status).toBe('sent');
      report.sendGate = { pdfFailure: pdfFail.error, statusAfterPdfFailure: 'draft', emailsAttemptedAfterPdfFailure: 0, markSentBypassBlocked: viaStatus.error, providerFailureStatus: 'draft', retrySucceeded: retry.success, menuSendSucceeded: viaMenu.success };
    } finally {
      inject.pdf = 'real'; inject.mail = 'real';
    }
  });

  it('send: failure (PDF/provider) leaves the invoice a DRAFT and returns a message; no-email client is refused before anything is sent', async () => {
    const inv = track(await F.saveInvoice(invoicePayload(clientA, { clientOperationId: randomUUID() }), { skipAutoNotify: true }));
    const sent = await F.sendInvoiceNow(inv.data.id);
    const afterSend = await row('invoices', inv.data.id);
    report.send = { success: sent.success, error: sent.error ?? null, statusAfter: afterSend.status };
    if (sent.success) expect(afterSend.status).toBe('sent');
    else expect(afterSend.status).toBe('draft');

    const noEmail = trackC(await C.createContact({ firstName: `${TAG}${RUNID}-noemail`, lastName: 'Client', clientOperationId: randomUUID() }));
    expect(noEmail.success).toBe(true);
    expect((await row('contacts', noEmail.data.id)).email).toBeNull();
    const inv2 = track(await F.saveInvoice(invoicePayload(noEmail.data.id, { clientOperationId: randomUUID() }), { skipAutoNotify: true }));
    const refused = await F.sendInvoiceNow(inv2.data.id);
    expect(refused.success).toBe(false);
    expect(refused.error).toBe('Contact has no email address');
    expect((await row('invoices', inv2.data.id)).status).toBe('draft');
    report.sendNoEmail = { error: refused.error, statusAfter: 'draft' };
  });
});

/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';
process.env.CRON_SECRET = 'task68verifysecret';
process.env.RESEND_API_KEY = 're_task68verify0000000000';
process.env.TWILIO_ACCOUNT_SID = 'AC_123'; // force @/lib/sms sandbox (mock send, no live Twilio)

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
process.env.CRON_SECRET = 'task68verifysecret';
import { randomUUID } from 'crypto';

const React = require('react');
if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;

// Task 68 — WhatsApp appointment reminders in /api/cron/reminders.
//   * out-of-window contact  -> approved `appointment_reminder` TEMPLATE send
//   * in-window contact      -> free-text send, body identical to the SMS reminder
//   * opted-out contact      -> WhatsApp skipped, email + SMS unaffected
//   * contact with no phone  -> WhatsApp skipped (no_number), email still sent
//   * regression: SMS + email still delivered; re-run resends nothing.

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { encrypt } = await import('../../src/lib/encryption');
  const db = createAdminClient();
  const { GET: remindersGET } = await import('../../src/app/api/cron/reminders/route');

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${d ? ` -- ${d}` : ''}`); };
  const auth = { headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? `Bearer ${process.env.CRON_SECRET}` : null) } } as any;

  const realFetch = globalThis.fetch;
  const emails: Array<{ to: string; text: string }> = [];
  const waSends: Array<{ to: string; type: string; body: any }> = [];
  const emailTo = (to: string) => [...emails].reverse().find((e) => e.to === to);
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    if (u.includes('api.resend.com/emails')) {
      const b = JSON.parse(init.body);
      emails.push({ to: Array.isArray(b.to) ? b.to[0] : b.to, text: b.text ?? '' });
      return new Response(JSON.stringify({ id: 'em' }), { status: 200 });
    }
    if (u.includes('graph.facebook.com') && /\/messages(\?|$)/.test(u)) {
      const b = JSON.parse(init.body);
      waSends.push({ to: b.to, type: b.type, body: b });
      return new Response(JSON.stringify({ messages: [{ id: `wamid.${waSends.length}` }] }), { status: 200 });
    }
    return realFetch(url, init);
  }) as typeof fetch;

  const { data: authUser } = await db.auth.admin.createUser({ email: `t68-${runId}-host@example.com`, password: randomUUID(), email_confirm: true });
  const hostId = authUser!.user!.id;
  let workspaceId = '';
  const aptIds: string[] = [];

  const waFor = (phone: string) => waSends.filter((w) => w.to === phone.replace('+', ''));

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', hostId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;

    // The workspace's ONE WhatsApp connection (same shape as the Meta OAuth callback writes).
    await db.from('platform_connections').upsert({
      workspace_id: workspaceId,
      platform: 'whatsapp',
      credentials: {
        access_token_encrypted: encrypt('fake-system-user-token'),
        phone_number_id: `109${runId.replace(/\D/g, '0')}0`,
        phone_number: '+27000000000',
        waba_id: 'waba_test',
        health_status: 'connected',
      },
      status: 'connected',
    }, { onConflict: 'workspace_id,platform' });

    const in1h = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const mkContact = async (tag: string, phone: string | null, extra: any = {}) => {
      const { data } = await db.from('contacts').insert({
        workspace_id: workspaceId, email: `t68-${runId}-${tag}@example.com`,
        first_name: tag[0].toUpperCase() + tag.slice(1), last_name: 'T', phone, ...extra,
      }).select().single();
      return data!.id;
    };
    const mkApt = async (contactId: string, link: string | null, status: string) => {
      const { data, error } = await db.from('appointments').insert({
        workspace_id: workspaceId, calendar_id: null, contact_id: contactId, user_id: hostId,
        title: `T68 ${status}`, start_time: in1h, end_time: new Date(new Date(in1h).getTime() + 18e5).toISOString(),
        status: 'scheduled', meeting_mode: 'google_meet', meeting_link: link,
        reminder_1h_sent: false, reminder_24h_sent: false,
        metadata: link ? { meeting_link_status: 'google_meet' } : { meeting_link_status: 'zoom_pending_integration' },
      }).select().single();
      if (error) throw new Error(error.message);
      aptIds.push(data!.id);
      return data!.id;
    };

    // --- contacts ---
    const cOut = await mkContact('outwin', '+27820000001');           // out of window -> template
    const cIn = await mkContact('inwin', '+27820000002');             // in window -> free text
    const cOpt = await mkContact('optout', '+27820000003', { sms_opt_out: true }); // opted out -> skip
    const cNoPhone = await mkContact('nophone', null);                // no phone -> skip, email only

    // in-window contact has a whatsapp conversation with a recent inbound
    await db.from('conversations').insert({
      workspace_id: workspaceId, contact_id: cIn, platform: 'whatsapp',
      last_customer_message_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    });

    const realLink = 'https://meet.google.com/abc-defg-hij';
    await mkApt(cOut, realLink, 'outwin');
    await mkApt(cIn, realLink, 'inwin');
    await mkApt(cOpt, realLink, 'optout');
    await mkApt(cNoPhone, realLink, 'nophone');

    console.log('\n=== reminders cron run ===');
    const res = await remindersGET(auth);
    const body = await res.json();
    check('cron ran successfully', body.success === true, JSON.stringify(body));
    check('cron reports whatsapp_sent = 2 (out-of-window template + in-window free text)', body.whatsapp_sent === 2, JSON.stringify(body));

    // --- out-of-window: TEMPLATE ---
    const outWa = waFor('+27820000001');
    check('★ out-of-window contact got a WhatsApp send', outWa.length === 1);
    check('★ ...as an approved TEMPLATE (type=template, name=appointment_reminder)',
      outWa[0]?.type === 'template' && outWa[0]?.body?.template?.name === 'appointment_reminder', JSON.stringify(outWa[0]?.body?.template));
    const tParams = (outWa[0]?.body?.template?.components?.[0]?.parameters || []).map((p: any) => p.text);
    check('★ ...template params are [name, date, time]', tParams.length === 3 && tParams[0] === 'Outwin', JSON.stringify(tParams));

    // --- in-window: FREE TEXT, body identical to the SMS reminder ---
    const inWa = waFor('+27820000002');
    check('★ in-window contact got a WhatsApp send', inWa.length === 1);
    check('★ ...as free text (type=text)', inWa[0]?.type === 'text');
    const waBody = inWa[0]?.body?.text?.body || '';
    check('★ ...body matches the SMS reminder content (same meeting-link state logic)',
      waBody.includes(`Reminder: "T68 inwin" starts in 1 hour.`) && waBody.includes(`Link: ${realLink}`), waBody);

    // --- opted-out: skipped, other channels fine ---
    check('★ opted-out contact got NO WhatsApp send', waFor('+27820000003').length === 0);
    check('  → opted-out contact STILL got the email reminder', !!emailTo(`t68-${runId}-optout@example.com`));

    // --- no phone: skipped gracefully, email still sent ---
    check('no-phone contact got NO WhatsApp send', waFor('').length === 0 && waSends.every((w) => !!w.to));
    check('  → no-phone contact still got the email reminder', !!emailTo(`t68-${runId}-nophone@example.com`));

    // --- regression: SMS + email delivered for all (reminder flag set only after both) ---
    const { data: flags } = await db.from('appointments').select('id, reminder_1h_sent').in('id', aptIds);
    check('regression: email + SMS delivered for all 4 (reminder_1h_sent set for every apt)',
      (flags ?? []).length === 4 && (flags ?? []).every((r: any) => r.reminder_1h_sent === true));
    check('regression: every contact with an email got one', [1, 2, 3, 4].every((_, i) =>
      !!emailTo(`t68-${runId}-${['outwin', 'inwin', 'optout', 'nophone'][i]}@example.com`)));

    // --- regression: re-run resends nothing (no duplicate WhatsApp) ---
    const waCountBefore = waSends.length;
    emails.length = 0;
    const res2 = await remindersGET(auth);
    const body2 = await res2.json();
    check('regression: re-run sends 0 reminders and 0 WhatsApp', (body2.reminders_sent ?? 0) === 0 && (body2.whatsapp_sent ?? 0) === 0 && waSends.length === waCountBefore, JSON.stringify(body2));
  } finally {
    globalThis.fetch = realFetch;
    if (aptIds.length) await db.from('appointments').delete().in('id', aptIds);
    if (workspaceId) {
      await db.from('conversations').delete().eq('workspace_id', workspaceId).eq('platform', 'whatsapp');
      await db.from('contacts').delete().eq('workspace_id', workspaceId).like('email', `t68-${runId}-%`);
      await db.from('platform_connections').delete().eq('workspace_id', workspaceId).eq('platform', 'whatsapp');
    }
    await db.auth.admin.deleteUser(hostId).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

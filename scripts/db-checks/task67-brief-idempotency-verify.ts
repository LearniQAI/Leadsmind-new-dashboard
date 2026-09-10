/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';
process.env.CRON_SECRET = 'task67idem';
process.env.RESEND_API_KEY = 're_task67idem00000000000';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
process.env.CRON_SECRET = 'task67idem';
process.env.TWILIO_ACCOUNT_SID = 'AC_123'; // force sms.ts sandbox mode (no live send)
import { randomUUID } from 'crypto';

const React = require('react');
if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const db = createAdminClient();
  const { GET: remindersGET } = await import('../../src/app/api/cron/reminders/route');
  const { GET: briefGET } = await import('../../src/app/api/cron/pre-meeting-brief/route');

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${d ? ` -- ${d}` : ''}`); };
  const briefReq = { headers: { get: (k: string) => (k === 'Authorization' ? `Bearer ${process.env.CRON_SECRET}` : null) } } as any;
  const remindReq = { headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? `Bearer ${process.env.CRON_SECRET}` : null) } } as any;

  const realFetch = globalThis.fetch;
  const emails: Array<{ to: string; subject: string }> = [];
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    if (u.includes('api.resend.com/emails')) {
      const b = JSON.parse(init.body);
      emails.push({ to: Array.isArray(b.to) ? b.to[0] : b.to, subject: b.subject });
      return new Response(JSON.stringify({ id: 'em_' + emails.length }), { status: 200 });
    }
    if (u.includes('api.openai.com')) {
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ professional_history: 'x', strategic_focus_areas: ['y'] }), tool_calls: null } }] }), { status: 200 });
    }
    return realFetch(url, init);
  }) as typeof fetch;

  const { data: authUser } = await db.auth.admin.createUser({ email: `t67i-${runId}-host@example.com`, password: randomUUID(), email_confirm: true });
  const hostId = authUser!.user!.id;
  let workspaceId = '';
  const aptIds: string[] = [];
  const hostEmail = `t67i-${runId}-host@example.com`;

  const creditsUsed = async () => {
    const { data } = await db.from('ai_usage_credits').select('credits_used_this_period').eq('workspace_id', workspaceId).maybeSingle();
    return data?.credits_used_this_period ?? 0;
  };
  const briefSent = async (id: string) => {
    const { data } = await db.from('appointments').select('brief_sent').eq('id', id).single();
    return data!.brief_sent;
  };
  const runBrief = async () => { emails.length = 0; return (await briefGET(briefReq)).json(); };

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', hostId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;

    const { data: contact } = await db.from('contacts').insert({ workspace_id: workspaceId, email: `t67i-${runId}-c@example.com`, first_name: 'Ida', last_name: 'K', phone: '+15005550006' }).select().single();
    const contactId = contact!.id;

    const mkApt = async (title: string, minsAhead: number) => {
      const start = new Date(Date.now() + minsAhead * 60 * 1000).toISOString();
      const { data, error } = await db.from('appointments').insert({
        workspace_id: workspaceId, calendar_id: null, contact_id: contactId, user_id: hostId,
        title, start_time: start, end_time: new Date(new Date(start).getTime() + 18e5).toISOString(),
        status: 'scheduled', meeting_mode: 'google_meet', meeting_link: 'https://meet.google.com/aaa-bbbb-ccc',
        metadata: { meeting_link_status: 'google_meet' }, reminder_1h_sent: false, reminder_24h_sent: false,
      }).select().single();
      if (error) throw new Error(error.message);
      aptIds.push(data!.id);
      return data!.id;
    };

    console.log('\n=== PART 1: exactly-once — run the brief cron twice for the same appointment ===');
    const aptId = await mkApt(`T67i once`, 100);
    await db.from('ai_research_reports').delete().eq('contact_id', contactId);

    const c0 = await creditsUsed();
    const b1 = await runBrief();
    const emailsRun1 = emails.filter((e) => e.to === hostEmail).length;
    const c1 = await creditsUsed();
    check('run #1: cron succeeded', b1.success === true, JSON.stringify(b1));
    check('run #1: this appointment was briefed', (b1.briefings ?? []).some((x: any) => x.appointmentId === aptId && x.sentTo), JSON.stringify(b1.briefings));
    check('run #1: exactly ONE briefing email sent', emailsRun1 === 1, `emails=${emailsRun1}`);
    check('run #1: exactly ONE AI credit consumed', c1 - c0 === 1, `delta=${c1 - c0}`);
    check('run #1: brief_sent flag is now true', (await briefSent(aptId)) === true);

    const b2 = await runBrief();
    const emailsRun2 = emails.filter((e) => e.to === hostEmail).length;
    const c2 = await creditsUsed();
    check('run #2 (immediate re-run): cron succeeded', b2.success === true, JSON.stringify(b2));
    check('run #2: appointment NOT processed again', !(b2.briefings ?? []).some((x: any) => x.appointmentId === aptId), JSON.stringify(b2.briefings));
    check('run #2: NO second briefing email', emailsRun2 === 0, `emails=${emailsRun2}`);
    check('run #2: NO second AI credit consumed', c2 - c1 === 0, `delta=${c2 - c1}`);

    console.log('\n=== PART 2: widened window — a missed tick self-heals ===');
    // 90min ahead: outside the OLD fragile 115-120 band, inside the new 10-120 window
    const healApt = await mkApt(`T67i heal`, 90);
    await db.from('ai_research_reports').delete().eq('contact_id', contactId);
    const c3 = await creditsUsed();
    const b3 = await runBrief();
    check('appointment 90min out (would have been missed by the old 5-min band) gets briefed', (b3.briefings ?? []).some((x: any) => x.appointmentId === healApt), JSON.stringify(b3.briefings));
    check('  -> its brief_sent is true, exactly one more credit charged', (await briefSent(healApt)) === true && (await creditsUsed()) - c3 === 1);

    console.log('\n=== PART 3: out-of-credit skip stays retryable ===');
    const retryApt = await mkApt(`T67i retry`, 95);
    await db.from('ai_research_reports').delete().eq('contact_id', contactId);
    const { data: bal } = await db.from('ai_usage_credits').select('plan_monthly_credits, credits_purchased_addon, credits_used_this_period').eq('workspace_id', workspaceId).maybeSingle();
    await db.from('ai_usage_credits').update({ plan_monthly_credits: 0, credits_purchased_addon: 0, credits_used_this_period: 0 }).eq('workspace_id', workspaceId);

    const b4 = await runBrief();
    check('out-of-credit: appointment reported skipped (no_ai_credits)', JSON.stringify(b4).includes('no_ai_credits'), JSON.stringify(b4.briefings));
    check('out-of-credit: brief_sent LEFT false (deliberate — a skip is transient, not delivered)', (await briefSent(retryApt)) === false);
    check('out-of-credit: no briefing email sent', emails.filter((e) => e.to === hostEmail).length === 0);

    // credits restored -> the same appointment is retried and briefed
    await db.from('ai_usage_credits').update({ plan_monthly_credits: bal?.plan_monthly_credits ?? 500, credits_purchased_addon: bal?.credits_purchased_addon ?? 0, credits_used_this_period: bal?.credits_used_this_period ?? 0 }).eq('workspace_id', workspaceId);
    const cR = await creditsUsed();
    const b5 = await runBrief();
    check('credits restored: the previously-skipped appointment is now briefed', (b5.briefings ?? []).some((x: any) => x.appointmentId === retryApt && x.sentTo), JSON.stringify(b5.briefings));
    check('  -> exactly one credit charged for the retry, brief_sent now true', (await creditsUsed()) - cR === 1 && (await briefSent(retryApt)) === true);

    const b6 = await runBrief();
    check('and it does not send a third time', !(b6.briefings ?? []).some((x: any) => x.appointmentId === retryApt));

    console.log('\n=== PART 4: regression — hourly reminder cron idempotency unaffected ===');
    const remApt = await mkApt(`T67i reminder`, 60); // ~1h -> reminder cron 1h window
    emails.length = 0;
    const r1 = await (await remindersGET(remindReq)).json();
    check('reminder cron sent for the 1h appointment', (r1.reminders_sent ?? 0) >= 1, JSON.stringify(r1));
    const { data: remRow } = await db.from('appointments').select('reminder_1h_sent').eq('id', remApt).single();
    check('  -> reminder_1h_sent set true', remRow!.reminder_1h_sent === true);
    const r2 = await (await remindersGET(remindReq)).json();
    check('reminder cron re-run does NOT resend', (r2.reminders_sent ?? 0) === 0, JSON.stringify(r2));
  } finally {
    globalThis.fetch = realFetch;
    if (aptIds.length) await db.from('appointments').delete().in('id', aptIds);
    if (workspaceId) {
      await db.from('ai_research_reports').delete().eq('workspace_id', workspaceId);
      await db.from('contacts').delete().eq('workspace_id', workspaceId).like('email', `t67i-${runId}-%`);
    }
    await db.auth.admin.deleteUser(hostId).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

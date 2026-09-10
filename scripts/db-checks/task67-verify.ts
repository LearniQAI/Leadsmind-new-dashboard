/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';
process.env.CRON_SECRET = process.env.CRON_SECRET || 'task67verifysecret';
process.env.RESEND_API_KEY = 're_task67verify0000000000';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
process.env.CRON_SECRET = 'task67verifysecret';
// Force Twilio sandbox mode so the SMS path exercises real message-building
// without a live send (sms.ts returns a mock + logs sms.sandbox_mode).
process.env.TWILIO_ACCOUNT_SID = 'AC_123';
import { randomUUID } from 'crypto';

// tsx runs this outside Next's RSC runtime; auth.ts (pulled in by the brief
// route's POST handler) calls react's `cache` at module load. Shim it.
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
  const auth = { headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? `Bearer ${process.env.CRON_SECRET}` : null) } } as any;

  // ---- intercept outbound HTTP: Resend + OpenAI ----
  const realFetch = globalThis.fetch;
  const emails: Array<{ to: string; subject: string; text: string; html: string }> = [];
  let openaiCalls = 0;
  const lastEmailTo = (to: string) => [...emails].reverse().find((e) => e.to === to);
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    if (u.includes('api.resend.com/emails')) {
      const body = JSON.parse(init.body);
      emails.push({ to: Array.isArray(body.to) ? body.to[0] : body.to, subject: body.subject, text: body.text ?? '', html: body.html ?? '' });
      return new Response(JSON.stringify({ id: 'em_' + emails.length }), { status: 200 });
    }
    if (u.includes('api.openai.com')) {
      openaiCalls++;
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ professional_history: 'Test exec bio.', strategic_focus_areas: ['route automation'] }), tool_calls: null } }],
      }), { status: 200 });
    }
    return realFetch(url, init);
  }) as typeof fetch;

  const { data: authUser } = await db.auth.admin.createUser({ email: `t67-${runId}-host@example.com`, password: randomUUID(), email_confirm: true });
  const hostId = authUser!.user!.id;
  let workspaceId = '';
  const aptIds: string[] = [];
  // ad-hoc appointments (calendar_id NULL) are exempt from appointments_no_overlap,
  // which lets several test bookings share the same start_time.
  const calId = null;

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', hostId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;

    const mkContact = async (tag: string) => {
      const { data } = await db.from('contacts').insert({ workspace_id: workspaceId, email: `t67-${runId}-${tag}@example.com`, first_name: tag, last_name: 'T', phone: '+15005550006' }).select().single();
      return data!.id;
    };
    const cGoogle = await mkContact('gmeet');
    const cZoom = await mkContact('zoom');
    const cPlain = await mkContact('plain');

    const in1h = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const mkApt = async (contactId: string, meetingLink: string | null, status: string, extraMeta: any = {}) => {
      const { data, error } = await db.from('appointments').insert({
        workspace_id: workspaceId, calendar_id: calId, contact_id: contactId, user_id: hostId,
        title: `T67 ${status}`, start_time: in1h, end_time: new Date(new Date(in1h).getTime() + 18e5).toISOString(),
        status: 'scheduled', meeting_mode: 'google_meet', meeting_link: meetingLink,
        reminder_1h_sent: false, reminder_24h_sent: false,
        metadata: extraMeta,
      }).select().single();
      if (error) throw new Error(`apt insert failed: ${error.message}`);
      aptIds.push(data!.id);
      return data!.id;
    };

    console.log('\n=== PART 1: hourly reminder cron -- Task 63 meeting-link states ===');
    await mkApt(cGoogle, 'https://meet.google.com/abc-defg-hij', 'gmeet', { meeting_link_status: 'google_meet' });
    await mkApt(cZoom, null, 'zoom', { meeting_link_status: 'zoom_pending_integration' });
    await mkApt(cPlain, 'https://meet.google.com/xyz-1234-567', 'plain', { meeting_link_status: 'google_meet' });

    emails.length = 0;
    const rRes = await remindersGET(auth);
    const rBody = await rRes.json();
    check('reminders cron ran successfully', rBody.success === true, JSON.stringify(rBody));
    check('reminders cron sent 3 reminders', rBody.reminders_sent === 3, JSON.stringify(rBody));

    const gMail = lastEmailTo(`t67-${runId}-gmeet@example.com`);
    check('google_meet reminder: real Meet link present', !!gMail && gMail.text.includes('Meeting Link: https://meet.google.com/abc-defg-hij'));
    check('google_meet reminder: no bogus "TBD" line', !!gMail && !gMail.text.includes('TBD'));

    const zMail = lastEmailTo(`t67-${runId}-zoom@example.com`);
    check('zoom reminder: NO fabricated meeting link line', !!zMail && !/Meeting Link:/.test(zMail.text));
    check('zoom reminder: honest "coming soon" note included', !!zMail && /coming soon/i.test(zMail.text));
    check('zoom reminder: no bogus "TBD" line', !!zMail && !zMail.text.includes('TBD'));

    const pMail = lastEmailTo(`t67-${runId}-plain@example.com`);
    check('regression: plain reminder still delivered with its link', !!pMail && pMail.text.includes('Meeting Link: https://meet.google.com/xyz-1234-567'));

    // SMS path: each contact has a phone, so reminders_sent===3 above means
    // sendSMS() (the established Twilio sendSMS/resolveWorkspaceTwilioCredentials
    // path) completed for all 3 without throwing -- the reminder_*_sent flag is
    // only written after BOTH channels succeed.
    const { data: flagRows } = await db.from('appointments').select('id, reminder_1h_sent').in('id', aptIds);
    check('SMS+email both delivered for all 3 (reminder_1h_sent set only after both channels succeed)',
      (flagRows ?? []).length === 3 && (flagRows ?? []).every((r: any) => r.reminder_1h_sent === true));

    // idempotency: re-run -> nothing re-sent
    emails.length = 0;
    const rRes2 = await remindersGET(auth);
    const rBody2 = await rRes2.json();
    check('regression: re-run does not resend (reminder_1h_sent flag honored)', (rBody2.reminders_sent ?? 0) === 0, JSON.stringify(rBody2));

    console.log('\n=== PART 2: AI pre-meeting brief cron (now registered in vercel.json) ===');
    // appointment ~117 min ahead -> inside the cron's 115-120min look-ahead window
    const briefStart = new Date(Date.now() + 117 * 60 * 1000).toISOString();
    const { data: briefApt } = await db.from('appointments').insert({
      workspace_id: workspaceId, calendar_id: calId, contact_id: cGoogle, user_id: hostId,
      title: `T67 brief`, start_time: briefStart, end_time: new Date(new Date(briefStart).getTime() + 18e5).toISOString(),
      status: 'scheduled', meeting_mode: 'google_meet', metadata: {},
    }).select().single();
    aptIds.push(briefApt!.id);

    // clear any cached research report + note starting credit balance
    await db.from('ai_research_reports').delete().eq('contact_id', cGoogle);
    const { data: creditsBefore } = await db.from('ai_usage_credits').select('credits_used_this_period').eq('workspace_id', workspaceId).maybeSingle();

    emails.length = 0;
    openaiCalls = 0;
    const bRes = await briefGET({ headers: { get: (k: string) => (k === 'Authorization' ? `Bearer ${process.env.CRON_SECRET}` : null) } } as any);
    const bBody = await bRes.json();
    check('brief cron ran successfully', bBody.success === true, JSON.stringify(bBody));
    check('brief cron processed the in-window appointment', (bBody.processedCount ?? 0) >= 1, JSON.stringify(bBody));

    const hostMail = lastEmailTo(`t67-${runId}-host@example.com`);
    check('brief: a real AI briefing email was delivered to the host', !!hostMail && /Pre-Meeting/i.test(hostMail.subject));
    check('brief: email contains a real lead-suitability score', !!hostMail && /Lead Suitability Metric/.test(hostMail.html) && /\/ 100/.test(hostMail.html));
    check('brief: email contains prospect intelligence summary', !!hostMail && /Prospect Intelligence Summary/.test(hostMail.html));

    const { data: report } = await db.from('ai_research_reports').select('id, lead_score, report_json').eq('contact_id', cGoogle).maybeSingle();
    check('brief: a real ai_research_reports row was persisted', !!report && typeof report.lead_score === 'number');

    const { data: creditsAfter } = await db.from('ai_usage_credits').select('credits_used_this_period').eq('workspace_id', workspaceId).maybeSingle();
    const used = (creditsAfter?.credits_used_this_period ?? 0) - (creditsBefore?.credits_used_this_period ?? 0);
    check('brief: AI credit was consumed (consistent with other metered AI features)', used >= 1, `delta=${used}`);

    // vercel.json registration
    // credit exhaustion -> brief is skipped gracefully, not a hard cron failure
    const { data: preBal } = await db.from('ai_usage_credits').select('credits_used_this_period, plan_monthly_credits, credits_purchased_addon').eq('workspace_id', workspaceId).maybeSingle();
    const { error: exhErr } = await db.from('ai_usage_credits').update({ plan_monthly_credits: 0, credits_purchased_addon: 0, credits_used_this_period: 0 }).eq('workspace_id', workspaceId);
    if (exhErr) console.log('  (could not force exhaustion:', exhErr.message, ')');
    await db.from('ai_research_reports').delete().eq('contact_id', cGoogle);
    const { data: exhaustedApt } = await db.from('appointments').insert({
      workspace_id: workspaceId, calendar_id: calId, contact_id: cGoogle, user_id: hostId,
      title: `T67 exhausted`, start_time: new Date(Date.now() + 118 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 136 * 60 * 1000).toISOString(), status: 'scheduled', meeting_mode: 'google_meet', metadata: {},
    }).select().single();
    aptIds.push(exhaustedApt!.id);
    emails.length = 0;
    const exRes = await briefGET({ headers: { get: (k: string) => (k === 'Authorization' ? `Bearer ${process.env.CRON_SECRET}` : null) } } as any);
    const exBody = await exRes.json();
    check('brief cron survives an out-of-credit workspace (no hard failure)', exBody.success === true, JSON.stringify(exBody));
    check('brief: out-of-credit appointment reported as skipped, not briefed', JSON.stringify(exBody).includes('no_ai_credits'), JSON.stringify(exBody));
    await db.from('ai_usage_credits').update({ plan_monthly_credits: preBal?.plan_monthly_credits ?? 500, credits_purchased_addon: preBal?.credits_purchased_addon ?? 0, credits_used_this_period: preBal?.credits_used_this_period ?? 0 }).eq('workspace_id', workspaceId);

    const vercelJson = JSON.parse(await (await import('fs/promises')).readFile('vercel.json', 'utf8'));
    const entry = vercelJson.crons.find((c: any) => c.path === '/api/cron/pre-meeting-brief');
    check('vercel.json: pre-meeting-brief cron is registered', !!entry, JSON.stringify(entry));
    check('vercel.json: schedule runs every 5 min (matches the 5-min look-ahead window)', entry?.schedule === '*/5 * * * *', entry?.schedule);
  } finally {
    globalThis.fetch = realFetch;
    if (aptIds.length) await db.from('appointments').delete().in('id', aptIds);
    if (workspaceId) {
      await db.from('ai_research_reports').delete().eq('workspace_id', workspaceId);
      await db.from('contacts').delete().eq('workspace_id', workspaceId).like('email', `t67-${runId}-%`);
    }
    await db.auth.admin.deleteUser(hostId).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

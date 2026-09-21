/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
// Live verification for the Email Sequences S1 (unsubscribe/suppression) and S3 (trigger filter) fixes.
// Runs the REAL modules (executor, send_email action, unsubscribeEmail, EventBus, builder form action)
// against the linked database, inside a throwaway workspace created for the run. Only the outbound
// Resend HTTP call is intercepted (captured, never sent), so no email reaches anyone.
// It deliberately does NOT invoke the workflow-resume cron route: that sweeps every workspace's
// due executions, including real customers'.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { randomUUID } from 'crypto';

const React = require('react');
if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { encrypt } = await import('../../src/lib/encryption');
  const { triggerWorkflows, processNextStep } = await import('../../src/lib/automation/executor');
  const { unsubscribeEmail } = await import('../../src/app/actions/popia');
  const { verifyUnsubscribeToken } = await import('../../src/lib/security/unsubscribeToken');
  const { publishEvent } = await import('../../src/lib/events/EventBus');
  const { handlePageFormSubmission } = await import('../../src/app/actions/builder');
  const db = createAdminClient();

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${d ? ` -- ${d}` : ''}`); };

  const realFetch = globalThis.fetch;
  const sent: Array<{ to: string; subject: string; html: string; text: string; from: string }> = [];
  globalThis.fetch = (async (url: any, init?: any) => {
    if (String(url).includes('api.resend.com/emails')) {
      const b = JSON.parse(init.body);
      sent.push({ to: Array.isArray(b.to) ? b.to[0] : b.to, subject: b.subject, html: b.html || '', text: b.text || '', from: b.from });
      return new Response(JSON.stringify({ id: 'em_' + sent.length }), { status: 200 });
    }
    return realFetch(url, init);
  }) as typeof fetch;

  const email = (tag: string) => `seqv-${runId}-${tag}@example.com`;
  const { data: authUser } = await db.auth.admin.createUser({ email: `seqv-${runId}-owner@example.com`, password: randomUUID(), email_confirm: true });
  const userId = authUser!.user!.id;
  let workspaceId = '';

  const mkContact = async (tag: string, extra: Record<string, any> = {}) => {
    const { data, error } = await db.from('contacts').insert({ workspace_id: workspaceId, email: email(tag), first_name: `Test${tag}`, last_name: 'Verify', ...extra }).select().single();
    if (error) throw new Error(`contact ${tag}: ${error.message}`);
    return data!;
  };
  // Mirrors what saveSequence/saveWorkflowEditor persist: workflow + steps + sequential edges.
  const mkWorkflow = async (name: string, triggerType: string, triggerConfig: any, stepSpecs: Array<{ type: string; config: any }>, source: string | null = 'email_sequence') => {
    const { data: wf, error } = await db.from('workflows').insert({ workspace_id: workspaceId, name, trigger_type: triggerType, trigger_config: triggerConfig, is_active: true, source }).select().single();
    if (error) throw new Error(`workflow ${name}: ${error.message}`);
    const ids: string[] = [];
    for (let i = 0; i < stepSpecs.length; i++) {
      const { data: s, error: se } = await db.from('workflow_steps').insert({ workflow_id: wf!.id, workspace_id: workspaceId, position: i + 1, type: stepSpecs[i].type, config: stepSpecs[i].config }).select('id').single();
      if (se) throw new Error(`step: ${se.message}`);
      ids.push(s!.id);
    }
    for (let i = 0; i < ids.length - 1; i++) {
      await db.from('workflow_edges').insert({ workflow_id: wf!.id, workspace_id: workspaceId, source_step_id: ids[i], target_step_id: ids[i + 1], source_handle: 'next' });
    }
    return wf!;
  };
  const twoEmails = (label: string) => [
    { type: 'send_email', config: { subject: `${label} #1 for {{contact.first_name}}`, body: 'Plain body one\nsecond line' } },
    { type: 'wait', config: { delayValue: 1, delayUnit: 'days' } },
    { type: 'send_email', config: { subject: `${label} #2`, body: '<p>Second email</p>', isHtml: true } },
  ];
  const execsFor = async (wfId: string, contactId: string) => (await db.from('workflow_executions').select('*').eq('workflow_id', wfId).eq('contact_id', contactId).order('started_at')).data ?? [];
  const poll = async (fn: () => Promise<boolean>, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };

  const cleanupIds = { workflows: [] as string[], tags: [] as string[], funnels: [] as string[] };
  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', userId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;
    const { error: provErr } = await db.from('workspace_email_providers').insert({
      workspace_id: workspaceId, provider: 'resend', encrypted_api_key: encrypt('re_verify_fake_key_0000'), from_email: `noreply@verify-${runId}.example`, from_name: 'Verify Co',
    });
    if (provErr) throw new Error(`provider: ${provErr.message}`);
    console.log(`throwaway workspace ${workspaceId}`);

    // ───────── S1: real link, unsubscribe -> suppressed -> executions cancelled -> nothing more sends ─────────
    console.log('\n=== S1a: sent email carries a real signed unsubscribe link; unsubscribing stops the sequence ===');
    const seq1 = await mkWorkflow('Verify drip', 'contact_created', {}, twoEmails('Drip'));
    cleanupIds.workflows.push(seq1.id);
    const a = await mkContact('a');
    await triggerWorkflows(workspaceId, 'contact_created', a.id);
    check('email #1 sent immediately on enrollment', sent.length === 1 && sent[0].to === a.email, `sent=${sent.length}`);
    check('subject merge tag {{contact.first_name}} resolved', sent[0]?.subject === 'Drip #1 for Testa', sent[0]?.subject);
    check('plain-text body kept its line break (<br>)', /Plain body one<br>second line/.test(sent[0]?.html ?? ''));
    const linkMatch = sent[0]?.html.match(/href="([^"]*\/public\/unsubscribe\?[^"]+)"/);
    check('html contains an unsubscribe link', !!linkMatch);
    const url = new URL(linkMatch![1]);
    const [qEmail, qWs, qToken] = [url.searchParams.get('email')!, url.searchParams.get('workspace_id')!, url.searchParams.get('token')!];
    check('link is for this contact + workspace with a VALID signed token', qEmail === a.email && qWs === workspaceId && verifyUnsubscribeToken(qEmail, qWs, qToken));
    check('no unresolved {{tokens}} in sent html', !/\{\{/.test(sent[0]?.html ?? ''));
    check('sent from the workspace provider address (no platform fallback)', sent[0]?.from.includes(`noreply@verify-${runId}.example`), sent[0]?.from);
    const [running] = await execsFor(seq1.id, a.id);
    check('execution is running and waiting (resume_at set)', running?.status === 'running' && !!running?.context?.resume_at);

    const unsub = await unsubscribeEmail(qEmail, qWs, qToken); // exactly what the /public/unsubscribe page calls
    check('unsubscribeEmail(link params) succeeds', unsub.success === true, JSON.stringify(unsub));
    const { data: supp } = await db.from('global_suppression_list').select('email').eq('workspace_id', workspaceId).ilike('email', a.email);
    check('(b) contact is in the suppression list', (supp?.length ?? 0) === 1);
    const { data: aAfter } = await db.from('contacts').select('is_invalid_email').eq('id', a.id).single();
    check('    and flagged is_invalid_email', aAfter?.is_invalid_email === true);
    const [cancelled] = await execsFor(seq1.id, a.id);
    check('(c) the running execution was CANCELLED by the unsubscribe', cancelled?.status === 'cancelled' && cancelled?.context?.termination_reason === 'unsubscribed', `status=${cancelled?.status}`);
    const { data: logs } = await db.from('workflow_step_logs').select('status,error_message').eq('execution_id', running.id);
    check('    with a skipped step-log explaining why', (logs ?? []).some((l: any) => l.status === 'skipped' && /unsubscribed/.test(l.error_message ?? '')));

    // Backstop: even if the execution were somehow still running when its next email is due, the
    // send-time gate must refuse. Force exactly that state and drive the executor for this execution only.
    await db.from('workflow_executions').update({ status: 'running', context: { resume_at: new Date(Date.now() - 60000).toISOString() } }).eq('id', running.id);
    const before = sent.length;
    await processNextStep(running.id);
    check('(d) no further email sent even with the run forced back to running', sent.length === before, `sent ${before} -> ${sent.length}`);
    const [gated] = await execsFor(seq1.id, a.id);
    check('    send-time gate cancelled the run (unsubscribe also flags is_invalid_email)', gated?.status === 'cancelled' && gated?.context?.termination_reason === 'email_invalid_email', `status=${gated?.status} reason=${gated?.context?.termination_reason}`);
    // Isolate the suppression-LIST path of the gate (contact NOT flagged invalid, only listed).
    await db.from('contacts').update({ is_invalid_email: false }).eq('id', a.id);
    await db.from('workflow_executions').update({ status: 'running', context: { resume_at: new Date(Date.now() - 60000).toISOString() } }).eq('id', running.id);
    await processNextStep(running.id);
    const [gated2] = await execsFor(seq1.id, a.id);
    check('    suppression-list-only path: gate blocks with email_suppressed, still nothing sent', gated2?.status === 'cancelled' && gated2?.context?.termination_reason === 'email_suppressed' && sent.length === before, `reason=${gated2?.context?.termination_reason} sent=${sent.length}`);

    console.log('\n=== S1b: already-suppressed / invalid contacts are never enrolled or sent to ===');
    await db.from('global_suppression_list').upsert({ workspace_id: workspaceId, email: `SeqV-${runId}-B@Example.com`, reason: 'unsubscribe' }, { onConflict: 'workspace_id,email' });
    const b = await mkContact('b'); // stored lowercase; suppression row is mixed case
    const c = await mkContact('c', { is_invalid_email: true });
    const n0 = sent.length;
    await triggerWorkflows(workspaceId, 'contact_created', b.id);
    await triggerWorkflows(workspaceId, 'contact_created', c.id);
    const bx = await execsFor(seq1.id, b.id); const cx = await execsFor(seq1.id, c.id);
    check('suppressed (case-insensitive match) contact: NOT enrolled, declined row recorded', bx.length === 1 && bx[0].status === 'skipped_suppressed', bx.map((x: any) => x.status).join());
    check('invalid-email contact: NOT enrolled', cx.length === 1 && cx[0].status === 'skipped_suppressed', cx.map((x: any) => x.status).join());
    check('no email sent to either', sent.length === n0);

    console.log('\n=== S1c: same send_email action in a plain /automations workflow (not a sequence) ===');
    const generic = await mkWorkflow('Verify generic', 'appointment_booked', {}, [
      { type: 'send_email', config: { subject: 'Generic', body: 'hello' } },
      { type: 'apply_tag', config: { tag: 'VerifyGenericTag' } },
    ], null);
    cleanupIds.workflows.push(generic.id);
    const n1 = sent.length;
    await triggerWorkflows(workspaceId, 'appointment_booked', b.id); // suppressed contact
    const gx = await execsFor(generic.id, b.id);
    check('generic workflow: no email to a suppressed contact', sent.length === n1);
    const { data: glogs } = await db.from('workflow_step_logs').select('status').eq('execution_id', gx[0]?.id ?? '00000000-0000-0000-0000-000000000000');
    check('generic workflow: email step skipped, later steps still ran (completed)', gx[0]?.status === 'completed' && (glogs ?? []).some((l: any) => l.status === 'skipped'), `status=${gx[0]?.status} logs=${(glogs ?? []).map((l: any) => l.status)}`);
    const d = await mkContact('d');
    await triggerWorkflows(workspaceId, 'appointment_booked', d.id); // clean contact
    check('generic workflow: clean contact DOES get the email with an unsubscribe link', sent.length === n1 + 1 && sent[sent.length - 1].html.includes('/public/unsubscribe?'));

    // ───────── S3: trigger filter ─────────
    console.log('\n=== S3a: tag trigger only enrolls contacts who receive THAT tag ===');
    const { data: tagA, error: tagAErr } = await db.from('tags').insert({ workspace_id: workspaceId, name: `VerifyTagA-${runId}` }).select().single();
    if (tagAErr) throw new Error(`tag: ${tagAErr.message}`);
    const { data: tagB } = await db.from('tags').insert({ workspace_id: workspaceId, name: `VerifyTagB-${runId}` }).select().single();
    cleanupIds.tags.push(tagA!.id, tagB!.id);
    const tagSeq = await mkWorkflow('Verify tag seq', 'tag_added', { tag_id: tagA!.id, tag_name: tagA!.name }, twoEmails('TagSeq'));
    const legacySeq = await mkWorkflow('Verify tag seq (no filter, legacy)', 'tag_added', {}, twoEmails('Legacy'));
    cleanupIds.workflows.push(tagSeq.id, legacySeq.id);
    const e = await mkContact('e'); const f = await mkContact('f'); const g = await mkContact('g');

    const n2 = sent.length;
    await triggerWorkflows(workspaceId, 'tag_added', e.id, { tagId: tagB!.id });
    check('OTHER tag (by id) does not enroll', (await execsFor(tagSeq.id, e.id)).length === 0);
    await triggerWorkflows(workspaceId, 'tag_added', e.id, { tag: tagB!.name });
    check('OTHER tag (by name) does not enroll', (await execsFor(tagSeq.id, e.id)).length === 0);
    check('legacy sequence with NO filter never enrolls on any tag (fails closed)', (await execsFor(legacySeq.id, e.id)).length === 0 && sent.length === n2);
    await triggerWorkflows(workspaceId, 'tag_added', f.id, { tagId: tagA!.id });
    check('THE configured tag (by id) enrolls + sends', (await execsFor(tagSeq.id, f.id)).length === 1 && sent.length === n2 + 1);
    await triggerWorkflows(workspaceId, 'tag_added', g.id, { tag: tagA!.name.toLowerCase() });
    check('THE configured tag (by name, other publisher path, case-insensitive) enrolls', (await execsFor(tagSeq.id, g.id)).length === 1);

    console.log('\n=== S3b: through the REAL entrypoint (EventBus.publishEvent carries the payload) ===');
    const h = await mkContact('h');
    await publishEvent(workspaceId, 'tag_added', h.id, { tagId: tagB!.id });
    await new Promise((r) => setTimeout(r, 2500));
    check('publishEvent(other tag): sequence did not enroll', (await execsFor(tagSeq.id, h.id)).length === 0);
    await publishEvent(workspaceId, 'tag_added', h.id, { tagId: tagA!.id });
    check('publishEvent(configured tag): sequence enrolled', await poll(async () => (await execsFor(tagSeq.id, h.id)).length === 1));

    console.log('\n=== S3c: course + funnel triggers ===');
    const courseX = randomUUID(); const courseY = randomUUID();
    const courseSeq = await mkWorkflow('Verify course seq', 'course_completed', { course_id: courseX }, twoEmails('Course'));
    cleanupIds.workflows.push(courseSeq.id);
    const i = await mkContact('i'); const j = await mkContact('j');
    await triggerWorkflows(workspaceId, 'course_completed', i.id, { courseId: courseY });
    await triggerWorkflows(workspaceId, 'course_completed', j.id, { courseId: courseX });
    check('course_completed: other course does NOT enroll, configured course does', (await execsFor(courseSeq.id, i.id)).length === 0 && (await execsFor(courseSeq.id, j.id)).length === 1);

    // Real funnel form submission -> pages -> funnel_steps -> funnel_id resolved into the event payload.
    const mkFunnel = async (name: string) => {
      const { data: fn, error: fe } = await db.from('funnels').insert({ workspace_id: workspaceId, name }).select().single();
      if (fe) throw new Error(`funnel: ${fe.message}`);
      const { data: st, error: se } = await db.from('funnel_steps').insert({ funnel_id: fn!.id, name: `${name} step`, path_name: `p-${name}`.toLowerCase(), order: 1 }).select().single();
      if (se) throw new Error(`funnel_step: ${se.message}`);
      const { data: pg, error: pe } = await db.from('pages').insert({ workspace_id: workspaceId, funnel_step_id: st!.id, name: `${name} page` }).select().single();
      if (pe) throw new Error(`page: ${pe.message}`);
      cleanupIds.funnels.push(fn!.id);
      return { funnelId: fn!.id, pageId: pg!.id };
    };
    const f1 = await mkFunnel(`VerifyFunnel1-${runId}`); const f2 = await mkFunnel(`VerifyFunnel2-${runId}`);
    const funnelSeq = await mkWorkflow('Verify funnel seq', 'funnel_subscribed', { funnel_id: f1.funnelId }, twoEmails('Funnel'));
    cleanupIds.workflows.push(funnelSeq.id);
    const r2 = await handlePageFormSubmission(f2.pageId, '', { email: email('k'), first_name: 'K' });
    await new Promise((r) => setTimeout(r, 2500));
    const { data: k } = await db.from('contacts').select('id').eq('workspace_id', workspaceId).eq('email', email('k')).maybeSingle();
    check('funnel form on OTHER funnel: sequence did not enroll', r2.success === true && !!k && (await execsFor(funnelSeq.id, k.id)).length === 0, JSON.stringify(r2));
    await handlePageFormSubmission(f1.pageId, '', { email: email('l'), first_name: 'L' });
    const enrolledL = await poll(async () => {
      const { data: l } = await db.from('contacts').select('id').eq('workspace_id', workspaceId).eq('email', email('l')).maybeSingle();
      return !!l && (await execsFor(funnelSeq.id, l.id)).length === 1;
    });
    check('funnel form on THE configured funnel: sequence enrolled', enrolledL);
  } finally {
    globalThis.fetch = realFetch;
    if (workspaceId) {
      const del = async (t: string, col = 'workspace_id') => { await db.from(t).delete().eq(col, workspaceId); };
      await del('workflow_step_logs'); await del('workflow_executions'); await del('workflow_edges'); await del('workflow_steps'); await del('workflows');
      await del('global_suppression_list'); await del('contact_activities'); await del('tag_assignments'); await del('tags');
      await del('pages'); await db.from('funnel_steps').delete().in('funnel_id', cleanupIds.funnels); await del('funnels');
      await del('workspace_email_providers'); await del('contacts');
    }
    await db.auth.admin.deleteUser(userId).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

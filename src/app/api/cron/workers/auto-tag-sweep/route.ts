import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { applyAutoTag } from '@/modules/tags/autoTagging/applySystemTag';
import { publishEvent } from '@/lib/events/EventBus';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// High Value Client tagging is DISABLED — it was shipped with a placeholder
// R50,000 threshold that nobody approved as a real business number. Do not
// re-enable until a real, approved threshold is provided; then set this to true
// (and adjust HIGH_VALUE_THRESHOLD below, which is otherwise dead while this is
// false). Confirmed via a live DB query on disabling: zero contacts had been
// tagged yet, so no data cleanup was needed.
const HIGH_VALUE_CLIENT_ENABLED = false;
const HIGH_VALUE_THRESHOLD = 50000;
const INACTIVE_DAYS = 30;
const STUDENT_INACTIVE_DAYS = 14;

// Time-based cross-module auto-tags — conditions that change purely because time
// passed (invoice due date, contact/student inactivity), not because of a discrete
// event. Event-driven auto-tags (quiz pass/fail, course completion, deal lost, ticket
// status, campaign clicks) are applied inline at their real mutation sites instead —
// see applyAutoTag() call sites elsewhere in the codebase.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results = { invoices: 0, highValue: 0, inactiveContacts: 0, students: 0, errors: 0 };

  try {
    // ---- Invoice Overdue / Outstanding Invoice / High Value Client ----
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('workspace_id, contact_id, status, due_date, amount_paid, total_amount')
      .not('contact_id', 'is', null);
    if (invErr) throw invErr;

    const byContact = new Map<string, { workspaceId: string; invoices: typeof invoices }>();
    (invoices ?? []).forEach((inv: any) => {
      const key = inv.contact_id;
      if (!byContact.has(key)) byContact.set(key, { workspaceId: inv.workspace_id, invoices: [] });
      byContact.get(key)!.invoices.push(inv);
    });

    for (const [contactId, { workspaceId, invoices: contactInvoices }] of byContact.entries()) {
      const unpaid = contactInvoices.filter((i: any) => i.status !== 'paid' && i.status !== 'void');
      const overdue = unpaid.filter((i: any) => i.due_date && new Date(i.due_date) < now);
      const totalPaid = contactInvoices
        .filter((i: any) => i.status === 'paid')
        .reduce((sum: number, i: any) => sum + Number(i.amount_paid ?? i.total_amount ?? 0), 0);

      await applyAutoTag(workspaceId, 'contact', contactId, 'Outstanding Invoice', unpaid.length > 0);
      await applyAutoTag(workspaceId, 'contact', contactId, 'Invoice Overdue', overdue.length > 0);
      if (HIGH_VALUE_CLIENT_ENABLED) {
        await applyAutoTag(workspaceId, 'contact', contactId, 'High Value Client', totalPaid >= HIGH_VALUE_THRESHOLD);
        if (totalPaid >= HIGH_VALUE_THRESHOLD) results.highValue++;
      }
      results.invoices++;
    }

    // ---- Inactive 30 Days (general contact activity) ----
    const inactiveCutoff = new Date(now.getTime() - INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: inactiveContacts, error: contactErr } = await supabase
      .from('contacts')
      .select('id, workspace_id')
      .lt('last_activity_at', inactiveCutoff);
    if (contactErr) throw contactErr;

    for (const contact of inactiveContacts ?? []) {
      await applyAutoTag(contact.workspace_id, 'contact', contact.id, 'Inactive 30 Days', true);
      results.inactiveContacts++;
    }
    // Recently-active contacts should have the tag removed if they no longer qualify.
    const { data: activeContacts } = await supabase
      .from('contacts')
      .select('id, workspace_id')
      .gte('last_activity_at', inactiveCutoff);
    for (const contact of activeContacts ?? []) {
      await applyAutoTag(contact.workspace_id, 'contact', contact.id, 'Inactive 30 Days', false);
    }

    // ---- Active / Inactive Student ----
    const { data: enrollments, error: enrollErr } = await supabase
      .from('enrollments')
      .select('contact_id, last_active_at, courses(workspace_id)')
      .not('contact_id', 'is', null);
    if (enrollErr) throw enrollErr;

    const studentCutoff = now.getTime() - STUDENT_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
    const latestByContact = new Map<string, { workspaceId: string; lastActive: number }>();
    (enrollments ?? []).forEach((e: any) => {
      const workspaceId = e.courses?.workspace_id;
      if (!workspaceId || !e.contact_id) return;
      const lastActive = e.last_active_at ? new Date(e.last_active_at).getTime() : 0;
      const existing = latestByContact.get(e.contact_id);
      if (!existing || lastActive > existing.lastActive) {
        latestByContact.set(e.contact_id, { workspaceId, lastActive });
      }
    });

    for (const [contactId, { workspaceId, lastActive }] of latestByContact.entries()) {
      const isActive = lastActive >= studentCutoff;
      await applyAutoTag(workspaceId, 'contact', contactId, 'Active Student', isActive);
      await applyAutoTag(workspaceId, 'contact', contactId, 'Inactive Student', !isActive);
      // Reuses this same already-computed isActive signal — no second definition
      // of "inactive" anywhere else. Fires every sweep the contact still
      // qualifies (same idempotent-tag-reapply pattern as the lines above),
      // not just on the transition, since a workflow may want to re-nudge.
      if (!isActive) {
        await publishEvent(workspaceId, 'student_inactive', contactId, { lastActiveAt: lastActive ? new Date(lastActive).toISOString() : null });
      }
      results.students++;
    }
  } catch (err) {
    results.errors++;
    logger.error({ err }, 'cron.auto_tag_sweep.failed');
    return NextResponse.json({ success: false, error: 'Auto-tag sweep failed', results }, { status: 500 });
  }

  return NextResponse.json({ success: true, results });
}

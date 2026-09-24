// Teardown for live tests that create throwaway workspaces in the REAL database.
//
// The old pattern (delete rows table by table, then deleteUser(...).catch(() => {})) left whole test
// workspaces behind in production: it never deleted the workspace row itself, missed tables it didn't list
// (notifications, tag_history, ai_usage_credits, ...), and ignored every error, including deleteUser's. One
// run left 1,003 contacts plus a WhatsApp connection with a plaintext token.
//
// Deleting the WORKSPACE lets the ON DELETE CASCADE foreign keys remove every dependent row, including tables
// a test doesn't know it touched. The exception is a table with no foreign key to workspaces, which the
// cascade cannot reach: NO_FK_TABLES are deleted explicitly first.
// Every error is collected and thrown, so a failed cleanup fails the run instead of passing silently.

// The 59 tables that had no workspace_id foreign key as of 2026-09-24, children before parents. Migration
// 20260927000001 adds a CASCADE FK to every one of them; once it is applied this explicit pass is redundant
// but harmless, and it keeps cleanup complete on a database where the migration has not run.
const NO_FK_TABLES = [
  'lena_messages', 'lena_conversations', 'lena_knowledge_base', 'lena_configs', 'lena_agents',
  'notifications_sent', 'notifications',
  'module_quiz_attempts', 'module_quiz_questions', 'quiz_attempts', 'quiz_questions', 'lms_quizzes',
  'course_certificates', 'course_progress', 'course_lessons', 'course_modules',
  'booking_intake_responses', 'booking_intake_forms', 'booking_outcomes', 'booking_packages',
  'booking_slot_analytics', 'booking_waitlists', 'no_show_recoveries', 'round_robin_assignment',
  'affiliate_clicks', 'affiliate_commissions', 'affiliate_payouts', 'affiliates',
  'messages', 'conversations',
  'contact_activities', 'contact_notes', 'contact_tasks', 'contact_verifications',
  'kyc_checks', 'kyc_consent_records', 'kyc_risk_ratings',
  'lms_adaptive_rules', 'lms_adaptive_rules_v2', 'lms_ai_ingest_queue', 'lms_automation_rules',
  'lms_certificate_templates', 'lms_certificates', 'lms_delayed_actions', 'lms_expert_profiles',
  'lms_student_struggle_scores',
  'opportunities', 'pipeline_stages', 'pipelines',
  'appointments', 'credit_ledger', 'email_queue', 'lead_finder_searches', 'platform_connections',
  'podcast_shows', 'service_items', 'shipment_events', 'speakers', 'webhook_delivery_logs',
  // These five DO have a workspace FK, but ON DELETE NO ACTION: any row in them blocks the workspace delete.
  'invoice_delivery_queue', 'expenses', 'time_entries', 'price_lists', 'form_collaborators',
];

// Also deletes every workspace the given users own, so a workspace auto-created at sign-up is removed even if
// setup failed before the test recorded its id.
export async function deleteTestWorkspaces(db: any, workspaceIds: string[], userIds: string[]): Promise<void> {
  const errors: string[] = [];
  const users = userIds.filter(Boolean);
  let owned: string[] = [];
  if (users.length) {
    const { data, error } = await db.from('workspaces').select('id').in('owner_id', users);
    if (error) errors.push(`owned-workspace lookup: ${error.message}`);
    owned = (data ?? []).map((w: any) => w.id);
  }
  for (const id of [...new Set([...workspaceIds.filter(Boolean), ...owned])]) {
    for (const t of NO_FK_TABLES) {
      const { error } = await db.from(t).delete().eq('workspace_id', id);
      if (error) errors.push(`${t} for ${id}: ${error.message}`);
    }
    const { error } = await db.from('workspaces').delete().eq('id', id);
    if (error) errors.push(`workspace ${id}: ${error.message}`);
  }
  // Users last: a user who still owns a workspace (or its rows) cannot be deleted.
  for (const id of users) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error && !/not.?found/i.test(error.message)) errors.push(`user ${id}: ${error.message}`);
  }
  if (errors.length) throw new Error(`Live-test cleanup FAILED, rows were left in the database:\n  ${errors.join('\n  ')}`);
}

// Sweep patterns for the live tests' naming convention: owner email `<prefix>-<8 hex runId>[-<tag>]-owner@example.com`,
// whose sign-up workspace is named `<same local part>'s Workspace`.
export function testRunPatterns(prefix: string): { namePattern: RegExp; ownerEmailPattern: RegExp } {
  const local = `${prefix}-[0-9a-f]{8}(-[a-z0-9]+)?-owner`;
  return { namePattern: new RegExp(`^${local}'s Workspace$`), ownerEmailPattern: new RegExp(`^${local}@example\\.com$`) };
}

// A run that is killed (Ctrl-C, timeout, crash) never reaches afterAll. Call this at the start of a run to
// remove what earlier runs of the SAME test left behind. It is deliberately narrow: only workspaces whose
// name matches `namePattern` AND whose owner's email matches `ownerEmailPattern` AND that are older than
// `minAgeMinutes` (so a run in progress elsewhere is never touched).
export async function sweepStaleTestWorkspaces(
  db: any,
  opts: { namePattern: RegExp; ownerEmailPattern: RegExp; minAgeMinutes?: number },
): Promise<number> {
  const cutoff = new Date(Date.now() - (opts.minAgeMinutes ?? 60) * 60_000).toISOString();
  const { data: rows, error } = await db.from('workspaces').select('id, name, owner_id, created_at').lt('created_at', cutoff);
  if (error) throw new Error(`stale test-workspace sweep: ${error.message}`);
  const workspaceIds: string[] = [];
  const userIds: string[] = [];
  for (const w of (rows ?? []).filter((r: any) => opts.namePattern.test(r.name ?? ''))) {
    const { data: u } = w.owner_id ? await db.auth.admin.getUserById(w.owner_id) : { data: null };
    const email = u?.user?.email ?? '';
    if (!opts.ownerEmailPattern.test(email)) continue;
    workspaceIds.push(w.id);
    if (u?.user) userIds.push(u.user.id);
  }
  if (workspaceIds.length) await deleteTestWorkspaces(db, workspaceIds, userIds);
  return workspaceIds.length;
}

// Shared helpers for the v1/* public API: verify a client-supplied foreign-key id actually
// belongs to the caller's own workspace before it's referenced in an insert/update. Same
// pattern already proven correct in v1/pipeline-stages and v1/deals's stage_id check —
// centralized here so every route applies it identically instead of re-deriving it per file.
//
// Usage: pass either the full insert payload (POST, where every field is present, possibly
// null) or the sparse `updates` object (PATCH, where only client-supplied keys exist) — a
// missing/null id is always treated as "not supplied," never as an ownership violation.

export type MinimalSupabase = {
  from: (table: string) => any
}

export async function verifyOwnedId(
  supabase: MinimalSupabase,
  table: string,
  id: unknown,
  workspaceId: string,
  label: string
): Promise<string | null> {
  if (id === null || id === undefined) return null
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!data) return `${label} does not belong to this workspace`
  return null
}

export async function verifyWorkspaceMember(
  supabase: MinimalSupabase,
  userId: unknown,
  workspaceId: string,
  label: string
): Promise<string | null> {
  if (userId === null || userId === undefined) return null
  const { data } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!data) return `${label} does not belong to this workspace`
  return null
}

async function firstError(checks: Array<Promise<string | null>>): Promise<{ error: string | null }> {
  const results = await Promise.all(checks)
  return { error: results.find((r) => r) ?? null }
}

// appointments: contact_id -> contacts, calendar_id -> booking_calendars, deal_id ->
// opportunities, outcome_id -> booking_outcomes, user_id -> workspace_members.
// host_id is intentionally NOT checked: no migration defines it as a real column on
// `appointments`, so it can't reference cross-tenant data.
export async function verifyAppointmentForeignKeys(
  supabase: MinimalSupabase,
  workspaceId: string,
  obj: Record<string, any>
) {
  return firstError([
    verifyOwnedId(supabase, 'contacts', obj.contact_id, workspaceId, 'contact_id'),
    verifyOwnedId(supabase, 'booking_calendars', obj.calendar_id, workspaceId, 'calendar_id'),
    verifyOwnedId(supabase, 'opportunities', obj.deal_id, workspaceId, 'deal_id'),
    verifyOwnedId(supabase, 'booking_outcomes', obj.outcome_id, workspaceId, 'outcome_id'),
    verifyWorkspaceMember(supabase, obj.user_id, workspaceId, 'user_id'),
  ])
}

// tasks: contact_id -> contacts, assigned_to -> workspace_members.
export async function verifyTaskForeignKeys(
  supabase: MinimalSupabase,
  workspaceId: string,
  obj: Record<string, any>
) {
  return firstError([
    verifyOwnedId(supabase, 'contacts', obj.contact_id, workspaceId, 'contact_id'),
    verifyWorkspaceMember(supabase, obj.assigned_to, workspaceId, 'assigned_to'),
  ])
}

// related_id is polymorphic (its target table is named by related_type). Only a known,
// explicitly-mapped related_type may be used — an unrecognized type is rejected rather than
// silently trusted, since there's no registry of valid types to fall back on.
const TASK_RELATED_TYPE_TABLES: Record<string, string> = {
  contact: 'contacts',
  deal: 'opportunities',
  appointment: 'appointments',
  invoice: 'invoices',
  order: 'orders',
}

export async function verifyTaskRelatedId(
  supabase: MinimalSupabase,
  workspaceId: string,
  obj: Record<string, any>
): Promise<string | null> {
  if (obj.related_id === null || obj.related_id === undefined) return null
  const relatedType = obj.related_type
  const table = relatedType ? TASK_RELATED_TYPE_TABLES[relatedType] : undefined
  if (!table) return 'related_type must be one of: ' + Object.keys(TASK_RELATED_TYPE_TABLES).join(', ')
  return verifyOwnedId(supabase, table, obj.related_id, workspaceId, 'related_id')
}

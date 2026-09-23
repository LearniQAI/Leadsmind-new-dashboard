// Per-user scoping for audio_progress — the ONE place that decides "which row is mine".
//
// Why this exists: the resume lookup used to run client-side as
//   from('audio_progress').select(...).eq('content_block_id', id).maybeSingle()
// with NO user filter, relying on RLS to narrow it. But RLS deliberately lets workspace members
// read every learner's row for their workspace's blocks (the analytics policy), so for staff —
// or a learner who is also a workspace member — that query returned OTHER people's rows: with
// exactly one learner's row the player silently resumed from that learner's position; with two
// or more, maybeSingle errored and returned nothing. Every read of a user's own progress must
// filter by that user's own contact, resolved here.
//
// Plain module (not 'use server'): exporting these from an action file would make them callable
// from any client. Callers pass a service-role client + the authenticated user's email; the
// result is always constrained to that email's own contact.

type Db = { from: (table: string) => any };

/** The contact that represents `email` in `workspaceId`, WITHOUT creating one. Same match rule
 *  (email + workspace, first row) as getOrCreateStudentContact, which reuses this so reads and
 *  writes always resolve the SAME contact. */
export async function findOwnStudentContactId(db: Db, email: string | null | undefined, workspaceId: string): Promise<string | null> {
  if (!email) return null;
  const { data } = await db
    .from('contacts')
    .select('id')
    .eq('email', email)
    .eq('workspace_id', workspaceId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * The requesting user's OWN saved position for a block, or null (no contact in that workspace —
 * e.g. an admin who has never listened as a learner — or no progress yet). Never reads another
 * user's row: the query is filtered by the caller's own contact_id, independent of RLS.
 * The workspace comes from the block itself (authoritative), not a client-supplied value.
 */
export async function getOwnAudioResumePosition(db: Db, email: string | null | undefined, contentBlockId: string): Promise<number | null> {
  if (!email) return null;
  const { data: block } = await db
    .from('content_blocks')
    .select('id, course_lessons!inner(workspace_id)')
    .eq('id', contentBlockId)
    .maybeSingle();
  const workspaceId: string | undefined = (block as any)?.course_lessons?.workspace_id;
  if (!workspaceId) return null;

  const contactId = await findOwnStudentContactId(db, email, workspaceId);
  if (!contactId) return null;

  const { data: progress } = await db
    .from('audio_progress')
    .select('position_seconds')
    .eq('content_block_id', contentBlockId)
    .eq('contact_id', contactId)
    .maybeSingle();
  const pos = progress?.position_seconds;
  return typeof pos === 'number' && Number.isFinite(pos) ? pos : null;
}

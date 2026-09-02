import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * The persisted, stable-id certificate mechanism.
 *
 * There is exactly ONE certificate-creation path in this codebase: a single row per
 * (contact_id, course_id) in `course_certificates`, whose `validation_id` and
 * name/title snapshots are minted ONCE on first issue and reused by every later
 * download (see migration 20260903000019 and /api/student/courses/[id]/certificate).
 *
 * This helper is that path, factored out so both the student download route and the
 * `assign_certificate` automation action issue certificates the same way — no second
 * Math.random()-id path.
 */

export const CERT_COLS =
  'validation_id, issued_at, student_name_snapshot, course_title_snapshot';

export interface IssuedCertificate {
  validation_id: string;
  issued_at: string;
  student_name_snapshot: string;
  course_title_snapshot: string;
  /** true when this call minted the row, false when an existing row was returned. */
  created: boolean;
}

/**
 * Returns the certificate row for (contactId, courseId), creating it on first call.
 * Idempotent and race-safe against the unique(contact_id, course_id) constraint.
 */
export async function ensureCourseCertificate(params: {
  contactId: string;
  courseId: string;
  /** Optional — resolved from the course row when omitted. */
  workspaceId?: string;
  adminClient?: ReturnType<typeof createAdminClient>;
}): Promise<IssuedCertificate> {
  const { contactId, courseId } = params;
  const adminClient = params.adminClient ?? createAdminClient();

  const { data: existingCert } = await adminClient
    .from('course_certificates')
    .select(CERT_COLS)
    .eq('contact_id', contactId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (existingCert) {
    return { ...(existingCert as any), created: false };
  }

  // Resolve the snapshot fields the same way the download route does.
  const [{ data: course }, { data: contact }] = await Promise.all([
    adminClient.from('courses').select('title, workspace_id').eq('id', courseId).single(),
    adminClient.from('contacts').select('first_name, last_name, email').eq('id', contactId).single(),
  ]);

  if (!course) throw new Error(`ensureCourseCertificate: course ${courseId} not found`);

  const workspaceId = params.workspaceId || course.workspace_id;
  const studentName =
    (contact
      ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email
      : '') || 'Verified Graduate';

  const newRow = {
    contact_id: contactId,
    course_id: courseId,
    workspace_id: workspaceId,
    validation_id: `LM-${courseId.slice(0, 4).toUpperCase()}-${contactId.slice(0, 4).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`,
    student_name_snapshot: studentName,
    course_title_snapshot: course.title,
  };

  const { data: inserted, error: insErr } = await adminClient
    .from('course_certificates')
    .insert(newRow)
    .select(CERT_COLS)
    .single();

  if (insErr) {
    // Lost a race with a concurrent first issue — re-read the row the other writer made.
    const { data: raced } = await adminClient
      .from('course_certificates')
      .select(CERT_COLS)
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (raced) return { ...(raced as any), created: false };
    return {
      validation_id: newRow.validation_id,
      issued_at: new Date().toISOString(),
      student_name_snapshot: newRow.student_name_snapshot,
      course_title_snapshot: newRow.course_title_snapshot,
      created: true,
    };
  }

  return { ...(inserted as any), created: true };
}

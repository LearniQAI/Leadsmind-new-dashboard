import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { ensureCourseCertificate } from '@/lib/lms/issueCertificate';
import { enrolmentInactiveReason } from '@/lib/lms/enrolment';
import { getCourseCompletionStatus } from '@/lib/lms/courseCompletion';
import { generateCertificatePDF } from '../../../../../../../libs/services/src/pdf/cert-generator';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;

    // 1. Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 2. Resolve contact (student record)
    // First, find the workspace associated with the course to resolve the contact
    const { data: course } = await adminClient
      .from('courses')
      .select('title, workspace_id, certificate_config')
      .eq('id', courseId)
      .single();

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Certificate design: per-course override -> workspace default -> built-in classic.
    const { data: ws } = await adminClient
      .from('workspaces')
      .select('certificate_config')
      .eq('id', course.workspace_id)
      .maybeSingle();
    const certConfig = course.certificate_config || ws?.certificate_config || {};

    const contactId = await getOrCreateStudentContact(course.workspace_id);
    if (!contactId) {
      return NextResponse.json({ error: 'Student contact not resolved' }, { status: 400 });
    }

    // 2b. The enrolment must still be active (same isEnrolmentActive predicate, incl. expiry) —
    // a suspended / cancelled / expired / pending-approval student can't pull a certificate.
    const { data: enrollment } = await adminClient
      .from('enrollments')
      .select('status, active, expires_at, grace_period_expires_at')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .maybeSingle();
    const inactiveReason = enrolmentInactiveReason(enrollment);
    if (inactiveReason) {
      return NextResponse.json(
        { error: inactiveReason, code: enrollment ? 'ENROLMENT_INACTIVE' : 'NOT_ENROLLED' },
        { status: 403 }
      );
    }

    // 3. Verify course completion — the shared definition (courseCompletion.ts): every visible lesson
    // complete, lesson quizzes AND module quizzes passed, graded assignments passed. Inactive lessons
    // the student can't see are excluded. An already-issued certificate is never re-gated or revoked
    // (issuance is idempotent), so a re-download of an existing certificate skips this check.
    const { data: alreadyIssued } = await adminClient
      .from('course_certificates')
      .select('id')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!alreadyIssued) {
      const completion = await getCourseCompletionStatus(adminClient, contactId, courseId);
      if (!completion.complete) {
        return NextResponse.json(
          {
            error: completion.reason,
            code: 'COURSE_NOT_COMPLETE',
            totals: completion.totals,
            missing: completion.missing,
          },
          { status: completion.totals.lessons === 0 ? 400 : 403 }
        );
      }
    }

    // 4. Persisted certificate record — the identity of the certificate (validation_id) and
    // its displayed name/course/date are generated ONCE, on first issue, and stored in
    // course_certificates. Every later download reuses that same row, so a re-download
    // produces the SAME certificate — not a fresh Math.random() id and a new date each time.
    // This is the single certificate-creation path, shared with the assign_certificate
    // automation action via ensureCourseCertificate().
    const cert = await ensureCourseCertificate({
      contactId,
      courseId,
      workspaceId: course.workspace_id,
      adminClient,
      // Criteria were verified above (or the certificate already exists).
      requireCompletion: false,
    });

    const validationId = cert.validation_id;
    const completionDate = new Date(cert.issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // 5. Generate A4 Landscape PDF from the stored snapshot (so a later rename of the student
    // or the course never silently alters an already-issued certificate).
    const pdfBuffer = await generateCertificatePDF({
      studentName: cert.student_name_snapshot,
      courseTitle: cert.course_title_snapshot,
      completionDate,
      validationId,
      config: certConfig,
    });

    // Batch 4 (G7) fix — this MUST be gated on cert.created, exactly like the
    // assign_certificate automation action already gates it (issueCertificate.ts /
    // automation-executor.ts). Found during the Batch 4 chain-idempotency audit: this emit was
    // previously unconditional, so every re-download (not just the first) re-fired
    // certificate_issued — harmless before any certificate_issued rule existed, but once a
    // certificate_issued -> send_certificate_email rule is seeded, an unconditional emit here
    // would send a fresh "you earned your certificate!" email on every single re-download.
    if (cert.created) {
      try {
        const { emitLMSEvent } = await import('../../../../../../../libs/core/src/events/lms-event-bus');
        await emitLMSEvent('certificate_issued', {
          workspaceId: course.workspace_id,
          contactId,
          courseId,
          metadata: { validationId }
        });
      } catch (telemetryErr) {
        console.error('[Certificate API Telemetry Event Error]:', telemetryErr);
      }
    }

    // Return PDF stream directly
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Certificate_${course.title.replace(/\s+/g, '_')}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (err: any) {
    console.error('[API Certificate Download Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

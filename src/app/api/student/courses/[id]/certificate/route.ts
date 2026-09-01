import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
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
      .select('title, workspace_id')
      .eq('id', courseId)
      .single();

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 444 });
    }

    const contactId = await getOrCreateStudentContact(course.workspace_id);
    if (!contactId) {
      return NextResponse.json({ error: 'Student contact not resolved' }, { status: 400 });
    }

    // 3. Verify Course Completion Status
    const [lessonsRes, progressRes, contactRes] = await Promise.all([
      adminClient.from('course_lessons').select('id').eq('course_id', courseId),
      adminClient.from('course_progress').select('lesson_id').eq('contact_id', contactId).eq('course_id', courseId).not('completed_at', 'is', null),
      adminClient.from('contacts').select('first_name, last_name, email').eq('id', contactId).single()
    ]);

    const totalLessons = lessonsRes.data?.length || 0;
    const completedLessons = progressRes.data?.length || 0;
    const contact = contactRes.data;

    if (totalLessons === 0) {
      return NextResponse.json({ error: 'Course contains no lessons' }, { status: 400 });
    }

    if (completedLessons < totalLessons) {
      return NextResponse.json({
        error: 'Course not fully completed yet',
        progress: `${completedLessons}/${totalLessons}`
      }, { status: 403 });
    }

    // 3b. course_progress row-count alone only proves a lesson was marked complete, not that
    // any quiz attached to it was actually passed — a completion certificate must also verify
    // a real passing quiz_attempts row exists for every lesson that has quiz questions.
    const lessonIds = (lessonsRes.data || []).map((l: any) => l.id);
    const { data: quizLessons } = await adminClient
      .from('quiz_questions')
      .select('lesson_id')
      .in('lesson_id', lessonIds);

    const quizLessonIds = Array.from(new Set((quizLessons || []).map((q: any) => q.lesson_id)));

    if (quizLessonIds.length > 0) {
      const { data: passedAttempts } = await adminClient
        .from('quiz_attempts')
        .select('lesson_id')
        .eq('student_id', contactId)
        .eq('passed', true)
        .in('lesson_id', quizLessonIds);

      const passedLessonIds = new Set((passedAttempts || []).map((a: any) => a.lesson_id));
      const missingQuiz = quizLessonIds.some((id) => !passedLessonIds.has(id));

      if (missingQuiz) {
        return NextResponse.json({
          error: 'Course not fully completed yet — one or more quizzes have not been passed'
        }, { status: 403 });
      }
    }

    // 4. Persisted certificate record — the identity of the certificate (validation_id) and
    // its displayed name/course/date are generated ONCE, on first issue, and stored in
    // course_certificates. Every later download reuses that same row, so a re-download
    // produces the SAME certificate — not a fresh Math.random() id and a new date each time.
    const currentName = contact
      ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email
      : user.email || 'Verified Graduate';

    const CERT_COLS = 'validation_id, issued_at, student_name_snapshot, course_title_snapshot';

    let cert:
      | { validation_id: string; issued_at: string; student_name_snapshot: string; course_title_snapshot: string }
      | null = null;

    const { data: existingCert } = await adminClient
      .from('course_certificates')
      .select(CERT_COLS)
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingCert) {
      cert = existingCert as any;
    } else {
      const newRow = {
        contact_id: contactId,
        course_id: courseId,
        workspace_id: course.workspace_id,
        validation_id: `LM-${courseId.slice(0, 4).toUpperCase()}-${contactId.slice(0, 4).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`,
        student_name_snapshot: currentName,
        course_title_snapshot: course.title,
      };
      const { data: inserted, error: insErr } = await adminClient
        .from('course_certificates')
        .insert(newRow)
        .select(CERT_COLS)
        .single();

      if (insErr) {
        // Lost a race with a concurrent first download (unique(contact_id, course_id)) —
        // re-read the row the other request just wrote so both downloads still agree.
        const { data: raced } = await adminClient
          .from('course_certificates')
          .select(CERT_COLS)
          .eq('contact_id', contactId)
          .eq('course_id', courseId)
          .maybeSingle();
        cert = (raced as any) || {
          validation_id: newRow.validation_id,
          issued_at: new Date().toISOString(),
          student_name_snapshot: newRow.student_name_snapshot,
          course_title_snapshot: newRow.course_title_snapshot,
        };
      } else {
        cert = inserted as any;
      }
    }

    const validationId = cert!.validation_id;
    const completionDate = new Date(cert!.issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // 5. Generate A4 Landscape PDF from the stored snapshot (so a later rename of the student
    // or the course never silently alters an already-issued certificate).
    const pdfBuffer = await generateCertificatePDF({
      studentName: cert!.student_name_snapshot,
      courseTitle: cert!.course_title_snapshot,
      completionDate,
      validationId,
    });

    // Fire certificate telemetry event if needed
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

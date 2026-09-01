'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { sanitizeSlug } from '@/lib/slug';
import { logger } from '@/shared/logger';

export async function getCourses() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  // Real module/lesson/enrollment counts for the courses list cards (Phase E) — no
  // placeholder numbers. modules/enrollments both have a real FK to courses, so those two
  // use Supabase's embedded count syntax in the same query. course_lessons.course_id has NO
  // FK constraint to courses (only lessons -> module_id -> courses is FK-enforced) — found
  // live via a real PostgREST error while verifying this, not assumed — so lesson counts are
  // fetched separately and merged in below rather than embedded.
  const { data, error } = await supabase
   .from('courses')
   .select('*, modules:course_modules(count), enrollments(count)')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;

  if (data && data.length > 0) {
   const { data: lessonRows } = await supabase
    .from('course_lessons')
    .select('course_id')
    .in('course_id', data.map((c) => c.id));

   const lessonCounts = new Map<string, number>();
   for (const row of lessonRows || []) {
    lessonCounts.set(row.course_id, (lessonCounts.get(row.course_id) || 0) + 1);
   }
   for (const course of data as any[]) {
    course.lessons = [{ count: lessonCounts.get(course.id) || 0 }];
   }
  }

  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.courses.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function getCourse(courseId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('courses')
   .select('*')
   .eq('id', courseId)
   .eq('workspace_id', workspaceId)
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.course.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

// AUDIT (Default LeadsMind Domain + Real URL Path pass) — before this fix, "no domain
// selected" meant the course had domain_id=null AND url_path=null, and there was no real
// student-facing URL at all except the internal UUID admin route. Two real findings changed
// this function's design from what a first read of the schema would suggest:
//   1. courses.url_path has NEVER had a real consumer anywhere in this codebase (confirmed via
//      a full grep) — the only route that actually serves a public course landing page today
//      is /unauthenticated/courses/[slug], keyed by courses.slug, which DOES already have a
//      real global unique constraint (courses_slug_key) and a real, already-shipped, already-
//      working updateCourseSlug() action (courseLanding.ts) with real uniqueness enforcement.
//   2. The (domain_id, url_path) unique index is PARTIAL — `WHERE domain_id IS NOT NULL AND
//      url_path IS NOT NULL` — so it enforces nothing at all for domain_id=null rows. Postgres
//      also treats every NULL as distinct from every other NULL, so even a non-partial index
//      on (domain_id, url_path) would not have caught two default-domain courses reusing the
//      same url_path. That combination made url_path structurally unusable as the "leadsmind.io
//      default domain" slug store even before considering that nothing reads it.
// Decision: "leadsmind.io (default)" is NOT a seeded domain_configurations row — it reuses
// courses.slug, the field that already has real uniqueness AND a real serving route, rather
// than building a second, competing storage+serving mechanism for the exact same concept. A
// connected custom domain still writes domain_id/url_path exactly as before (unchanged, still
// real DB-level uniqueness via the partial index) — that path is untouched by this decision.
// domainId is the literal sentinel 'default' for the "leadsmind.io (default)" choice, or a real
// domain_configurations.id for a connected custom domain, or null/omitted (legacy "skip for
// now" callers, still supported so nothing that already calls this function breaks).
export async function createCourseWithDomain(title: string, domainId?: string | null, urlPath?: string | null) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  if (!title || title.trim() === '') return { error: 'Course name is required' };

  const supabase = await createServerClient();

  let resolvedDomainId: string | null = null;
  let resolvedUrlPath: string | null = null;
  let resolvedSlug: string | null = null;

  if (domainId === 'default') {
   // Real global uniqueness backstop, same one updateCourseSlug() and the DB's own
   // courses_slug_key constraint already enforce — checked here too so a duplicate is caught
   // at create time with a clear message, not just as a raw 23505 after insert.
   const cleanSlug = sanitizeSlug(urlPath || title);
   if (!cleanSlug) return { error: 'A URL path is required' };

   const adminClient = createAdminClient();
   const { data: duplicate } = await adminClient
    .from('courses')
    .select('id')
    .eq('slug', cleanSlug)
    .maybeSingle();
   if (duplicate) {
    return { error: 'This URL path is already taken. Choose a different one.' };
   }

   resolvedSlug = cleanSlug;
  } else if (domainId) {
   // Verify the chosen domain actually belongs to this workspace — domainId is never
   // trusted blindly, same discipline as every other cross-entity reference in this app.
   const { data: domain, error: domainErr } = await supabase
    .from('domain_configurations')
    .select('id')
    .eq('id', domainId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

   if (domainErr) throw domainErr;
   if (!domain) return { error: 'Domain not found in this workspace' };

   const cleanSlug = sanitizeSlug(urlPath || '');
   if (!cleanSlug) return { error: 'A URL path is required when a domain is selected' };

   resolvedDomainId = domainId;
   resolvedUrlPath = cleanSlug;
  }
  // domainId omitted/null (legacy "skip for now" path, still reachable by any older caller):
  // no slug, no domain_id/url_path — same no-real-URL-yet behavior as before this pass.

  const { data, error } = await supabase
   .from('courses')
   .insert({
    workspace_id: workspaceId,
    title,
    status: 'draft',
    domain_id: resolvedDomainId,
    url_path: resolvedUrlPath,
    ...(resolvedSlug ? { slug: resolvedSlug } : {})
   })
   .select()
   .single();

  if (error) {
   // Real DB-level protection — the partial unique index on (domain_id, url_path) for the
   // custom-domain path, and courses_slug_key for the default-domain path — not just the
   // pre-check above, which has an unavoidable (tiny) TOCTOU gap between the check and the
   // insert. Either constraint violation lands here as 23505.
   if (error.code === '23505') {
    return resolvedSlug
     ? { error: 'This URL path is already taken. Choose a different one.' }
     : { error: 'This URL path is already used on this domain. Choose a different one.' };
   }
   throw error;
  }
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'create.course.with.domain.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function enrollStudent(courseId: string, contactId: string) {
 try {
  const user = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  // Enrolls an arbitrary contactId chosen by the caller, so this can never run on the
  // session-scoped client (the ownership-only enrollments RLS policy would reject it, and
  // did before this fix — see 20260725000001_lock_down_student_self_report_writes.sql).
  // Requiring admin/owner here mirrors enrollStudent() in studentEnrollments.ts, which is
  // the self-enrollment (paid-invoice-gated) counterpart to this staff-enrolls-student path.
  const adminClient = createAdminClient();
  const { data: membership } = await adminClient
   .from('workspace_members')
   .select('role')
   .eq('workspace_id', workspaceId)
   .eq('user_id', user.id)
   .maybeSingle();
  if (!membership || !['admin', 'owner'].includes(membership.role)) {
   return { error: 'Unauthorized' };
  }

  const { data: existingEnrolment } = await adminClient
   .from('enrollments')
   .select('id')
   .eq('course_id', courseId)
   .eq('contact_id', contactId)
   .maybeSingle();

  const { error } = await adminClient
   .from('enrollments')
   .upsert({ course_id: courseId, contact_id: contactId, status: 'active' });

  if (error) throw error;

  // Fetch workspace_id of the course to trigger automation event
  const { data: course } = await adminClient
   .from('courses')
   .select('workspace_id')
   .eq('id', courseId)
   .single();

  if (course?.workspace_id) {
   const { publishEvent } = await import('@/lib/events/EventBus');
   await publishEvent(course.workspace_id, 'student_enrolled_course', contactId, { courseId });

   // Send the real invitation email only on a genuinely new enrolment (never re-send on an
   // idempotent re-upsert). Fail-soft — a delivery problem must not fail the enrolment.
   if (!existingEnrolment) {
    const { sendCourseOnboardingEmail } = await import('@/lib/lms/onboardingEmail');
    await sendCourseOnboardingEmail({ courseId, contactId, workspaceId: course.workspace_id });
   }
  }

  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'enroll.student.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function updateProgress(contactId: string, lessonId: string, completed: boolean, progress: number) {
 try {
  // Progress tracking logic
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'update.progress.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function getModules(courseId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  
  // Verify course belongs to workspace
  const { data: course, error: courseErr } = await supabase
   .from('courses')
   .select('id')
   .eq('id', courseId)
   .eq('workspace_id', workspaceId)
   .single();

  if (courseErr || !course) return { error: 'Unauthorized or course not found' };

  // Fetch modules
  const { data: modules, error: modulesErr } = await supabase
   .from('modules')
   .select('*, lessons:lessons(id, title, order_index, is_free:is_preview, video_url, content, type, metadata)')
   .eq('course_id', courseId)
   .order('order_index', { ascending: true });

  if (modulesErr) throw modulesErr;
  return { data: modules };
 } catch (error: any) {
  logger.error({ err: error }, 'get.modules.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function createModule(
 colorId: string, // CourseId parameter, let's keep the parameter name as courseId
 name: string,
 description: string,
 iconEmoji: string | null,
 publishStatus: 'Draft' | 'Published' | 'Coming Soon',
 nqfLevel: string,
 isRequiredForCompletion: boolean,
 isActive: boolean = true
) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  if (!name || name.trim() === '') {
   return { error: 'Module name is required' };
  }

  const supabase = await createServerClient();
  
  // Verify course ownership
  const { data: course, error: courseErr } = await supabase
   .from('courses')
   .select('id')
   .eq('id', colorId)
   .eq('workspace_id', workspaceId)
   .single();

  if (courseErr || !course) return { error: 'Unauthorized or course not found' };

  // Calculate order_index
  const { count } = await supabase
   .from('modules')
   .select('id', { count: 'exact', head: true })
   .eq('course_id', colorId);

  const nextOrderIndex = (count || 0) + 1;

  const { data: module, error } = await supabase
   .from('modules')
   .insert({
    course_id: colorId,
    name,
    description,
    icon_emoji: iconEmoji,
    publish_status: publishStatus,
    nqf_level: nqfLevel,
    is_required_for_completion: isRequiredForCompletion,
    is_active: isActive,
    order_index: nextOrderIndex
   })
   .select()
   .single();

  if (error) throw error;
  return { data: module };
 } catch (error: any) {
  logger.error({ err: error }, 'create.module.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function createLesson(
 moduleId: string,
 title: string,
 content: string,
 videoUrl: string,
 isFree: boolean,
 type: string = 'Text',
 metadata: any = {}
) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  if (!title || title.trim() === '') {
   return { error: 'Lesson title is required' };
  }

  const supabase = await createServerClient();

  // Verify workspace owns the module via course
  const { data: moduleObj, error: moduleErr } = await supabase
   .from('modules')
   .select('id, course_id, courses!inner(workspace_id)')
   .eq('id', moduleId)
   .single();

  if (moduleErr || !moduleObj) return { error: 'Module not found' };
  
  const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  // Calculate order_index for lesson
  const { count } = await supabase
   .from('lessons')
   .select('id', { count: 'exact', head: true })
   .eq('module_id', moduleId);

  const nextOrderIndex = (count || 0) + 1;

  const { data: lesson, error } = await supabase
   .from('lessons')
   .insert({
    module_id: moduleId,
    title,
    content,
    video_url: videoUrl,
    is_preview: isFree,
    type,
    metadata,
    order_index: nextOrderIndex
   })
   .select()
   .single();

  if (error) throw error;
  return { data: lesson };
 } catch (error: any) {
  logger.error({ err: error }, 'create.lesson.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function getStudentCourseProgress(courseId: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Get student contact record
  const { data: contact } = await supabase
   .from('contacts')
   .select('id')
   .eq('email', user.email)
   .single();

  if (!contact) return { data: [] };

  // Fetch progress list
  const { data, error } = await supabase
   .from('lesson_progress')
   .select('lesson_id, completed, completed_at')
   .eq('contact_id', contact.id);

  if (error) throw error;
  return { data: data || [] };
 } catch (error: any) {
  logger.error({ err: error }, 'get.student.course.progress.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function completeLessonAction(lessonId: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Get or auto-create student contact record if missing
  let { data: contact } = await supabase
   .from('contacts')
   .select('id')
   .eq('email', user.email)
   .single();

  if (!contact) {
   // Fallback: Create contact matching user profile
   const { data: newContact, error: contactErr } = await supabase
    .from('contacts')
    .insert({
     email: user.email,
     first_name: user.email?.split('@')[0] || 'Student',
     last_name: ''
    })
    .select('id')
    .single();

   if (contactErr) throw contactErr;
   contact = newContact;
  }

  const { error } = await supabase
   .from('lesson_progress')
   .upsert({
    contact_id: contact.id,
    lesson_id: lessonId,
    completed: true,
    completed_at: new Date().toISOString()
   }, { onConflict: 'contact_id,lesson_id' });

  if (error) throw error;

  // No lesson_completed/module_completed/course_completed publishing here: this action
  // (and the /courses/[id]/learn player it serves) reads/writes against the legacy
  // modules/lessons tables, which are never populated for real courses — real course
  // content lives in course_modules/course_lessons and completion events for it are
  // published from studentProgress.ts's markLessonComplete (the real student-facing
  // /student/courses/[id] flow). A lookup here against `lessons` would always return
  // nothing for a real course, so the event-publish block that used to sit here could
  // never actually fire.

  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'complete.lesson.action.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

/**
 * Fetches analytics, enrollment counts, total earnings, student completions,
 * progress details, and quiz attempt logs for a specific course.
 */
export async function getCourseAnalytics(courseId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const adminClient = createAdminClient();

    // 1. Fetch course details
    const { data: course, error: courseErr } = await adminClient
      .from('courses')
      .select('id, title, price, published')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .single();

    if (courseErr || !course) {
      throw new Error(courseErr?.message || 'Course not found or unauthorized');
    }

    // 2. Fetch all enrollments
    const { data: enrollments, error: enrollError } = await adminClient
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        contact_id,
        contact:contacts (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('course_id', courseId);

    if (enrollError) throw enrollError;

    // 3. Fetch all course lessons
    const { data: lessons, error: lessonsError } = await adminClient
      .from('course_lessons')
      .select('id, title, lesson_type')
      .eq('course_id', courseId);

    if (lessonsError) throw lessonsError;

    // 4. Fetch real lesson completions (completed_at set). completed_at:null rows are the
    // player heartbeat remembering video playback position, not completions.
    const { data: progress, error: progressError } = await adminClient
      .from('course_progress')
      .select('contact_id, lesson_id')
      .eq('course_id', courseId)
      .not('completed_at', 'is', null);

    if (progressError) throw progressError;

    // 5. Fetch quiz attempts for the quiz lessons in this course
    const quizLessons = (lessons || []).filter((l: any) => l.lesson_type === 'quiz');
    const quizLessonIds = quizLessons.map((l: any) => l.id);

    let attempts: any[] = [];
    let attemptContacts: any[] = [];

    if (quizLessonIds.length > 0) {
      const { data: attemptsData, error: attemptsError } = await adminClient
        .from('quiz_attempts')
        .select(`
          id,
          lesson_id,
          student_id,
          score,
          max_score,
          percentage,
          passed,
          submitted_at
        `)
        .in('lesson_id', quizLessonIds)
        .order('submitted_at', { ascending: false });

      if (attemptsError) throw attemptsError;
      attempts = attemptsData || [];

      const contactIdsFromAttempts = Array.from(new Set(attempts.map((a: any) => a.student_id)));
      if (contactIdsFromAttempts.length > 0) {
        const { data: contactsData } = await adminClient
          .from('contacts')
          .select('id, first_name, last_name, email')
          .in('id', contactIdsFromAttempts);
        attemptContacts = contactsData || [];
      }
    }

    // 6. Compute statistics
    const totalEnrollments = enrollments?.length || 0;
    const coursePrice = course.price || 0;
    const totalEarnings = totalEnrollments * coursePrice;
    const totalLessons = lessons?.length || 0;

    let completedStudentsCount = 0;
    let totalProgressPercent = 0;

    const studentStats = (enrollments || []).map((e: any) => {
      const c = e.contact || {};
      const completedForThisStudent = (progress || []).filter((p: any) => p.contact_id === e.contact_id).length;
      const pct = totalLessons > 0 ? Math.round((completedForThisStudent / totalLessons) * 100) : 0;
      
      if (pct === 100) {
        completedStudentsCount++;
      }
      totalProgressPercent += pct;

      return {
        contactId: e.contact_id,
        firstName: c.first_name || 'Student',
        lastName: c.last_name || '',
        email: c.email || 'unknown@example.com',
        enrolledAt: e.enrolled_at,
        status: e.status,
        completedLessons: completedForThisStudent,
        progressPercentage: pct
      };
    });

    const averageProgress = totalEnrollments > 0 ? Math.round(totalProgressPercent / totalEnrollments) : 0;

    const quizAttemptsLog = attempts.map((a: any) => {
      const lessonObj: any = quizLessons.find((l: any) => l.id === a.lesson_id) || {};
      const c: any = attemptContacts.find((contact: any) => contact.id === a.student_id) || {};
      return {
        id: a.id,
        quizTitle: lessonObj.title || 'Untitled Quiz',
        studentName: `${c.first_name || 'Student'} ${c.last_name || ''}`.trim(),
        studentEmail: c.email || 'unknown@example.com',
        score: a.score,
        maxScore: a.max_score || 100,
        percentage: a.percentage ?? (a.max_score ? Math.round((a.score / a.max_score) * 100) : a.score),
        passed: a.passed,
        submittedAt: a.submitted_at
      };
    });

    return {
      data: {
        summary: {
          totalEnrollments,
          coursePrice,
          totalEarnings,
          totalLessons,
          completedStudentsCount,
          averageProgress,
          completionRate: totalEnrollments > 0 ? Math.round((completedStudentsCount / totalEnrollments) * 100) : 0
        },
        students: studentStats,
        quizAttempts: quizAttemptsLog
      }
    };
  } catch (error: any) {
    logger.error({ err: error }, 'get.course.analytics.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

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
  const { data, error } = await supabase
   .from('courses')
   .select('*, modules:course_modules(count)')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
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

// Phase D: course creation now requires name + a workspace-connected domain + a unique URL
// path up front (PRD Section 1's required sequence), rather than the old flat title-only
// insert. Reuses the same domain_configurations rows already surfaced by getDomains() in
// domains.ts — no second, parallel domain concept.
export async function createCourseWithDomain(title: string, domainId: string, urlPath: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  if (!title || title.trim() === '') return { error: 'Course name is required' };
  if (!domainId) return { error: 'A domain is required' };

  const cleanSlug = sanitizeSlug(urlPath || '');
  if (!cleanSlug) return { error: 'A valid URL path is required' };

  const supabase = await createServerClient();

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

  const { data, error } = await supabase
   .from('courses')
   .insert({
    workspace_id: workspaceId,
    title,
    status: 'draft',
    domain_id: domainId,
    url_path: cleanSlug
   })
   .select()
   .single();

  if (error) {
   // Real DB-level protection (the unique index on (domain_id, url_path) from Phase A),
   // not just a client-side check — a duplicate slug on the same domain is rejected here
   // even if a client bypassed the UI's own uniqueness check entirely.
   if (error.code === '23505') {
    return { error: 'This URL path is already used on this domain. Choose a different one.' };
   }
   throw error;
  }
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'create.course.with.domain.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function getForumPosts() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('forum_posts')
   .select('*, author:auth.users(email)')
   .eq('workspace_id', workspaceId)
   .is('parent_id', null)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  logger.error({ err: error }, 'get.forum.posts.failed');
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

export async function updateModule(
 moduleId: string,
 name: string,
 description: string,
 iconEmoji: string | null,
 publishStatus: 'Draft' | 'Published' | 'Coming Soon',
 nqfLevel: string,
 isRequiredForCompletion: boolean,
 isActive?: boolean
) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  if (!name || name.trim() === '') {
   return { error: 'Module name is required' };
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

  const updatePayload: any = {
   name,
   description,
   icon_emoji: iconEmoji,
   publish_status: publishStatus,
   nqf_level: nqfLevel,
   is_required_for_completion: isRequiredForCompletion
  };
  if (isActive !== undefined) {
   updatePayload.is_active = isActive;
  }

  const { data: updatedModule, error } = await supabase
   .from('modules')
   .update(updatePayload)
  .eq("id", moduleId).eq("workspace_id", workspaceId)
   .select()
   .single();

  if (error) throw error;
  return { data: updatedModule };
 } catch (error: any) {
  logger.error({ err: error }, 'update.module.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function deleteModule(moduleId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();

  // Verify workspace owns the module via course
  const { data: moduleObj, error: moduleErr } = await supabase
   .from('modules')
   .select('id, course_id, courses!inner(workspace_id)')
  .eq("id", moduleId).eq("workspace_id", workspaceId)
   .single();

  if (moduleErr || !moduleObj) return { error: 'Module not found' };
  
  const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  const { error } = await supabase
   .from('modules')
   .delete()
  .eq("id", moduleId).eq("workspace_id", workspaceId);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'delete.module.failed');
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

export async function updateLesson(
 lessonId: string,
 title: string,
 content: string,
 videoUrl: string,
 isFree: boolean,
 type?: string,
 metadata?: any
) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  if (!title || title.trim() === '') {
   return { error: 'Lesson title is required' };
  }

  const supabase = await createServerClient();

  // Verify workspace owns the lesson via module -> course
  const { data: lessonObj, error: lessonErr } = await supabase
   .from('lessons')
   .select('id, module_id, modules!inner(course_id, courses!inner(workspace_id))')
   .eq('id', lessonId)
   .single();

  if (lessonErr || !lessonObj) return { error: 'Lesson not found' };
  
  const courseWorkspaceId = (lessonObj.modules as any)?.courses?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  const updatePayload: any = {
   title,
   content,
   video_url: videoUrl,
   is_preview: isFree
  };
  if (type !== undefined) updatePayload.type = type;
  if (metadata !== undefined) updatePayload.metadata = metadata;

  const { data: updatedLesson, error } = await supabase
   .from('lessons')
   .update(updatePayload)
  .eq("id", lessonId).eq("workspace_id", workspaceId)
   .select()
   .single();

  if (error) throw error;
  return { data: updatedLesson };
 } catch (error: any) {
  logger.error({ err: error }, 'update.lesson.failed');
  return { error: 'Operation failed. Please try again.' };
 }
}

export async function deleteLesson(lessonId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();

  // Verify workspace owns the lesson
  const { data: lessonObj, error: lessonErr } = await supabase
   .from('lessons')
   .select('id, module_id, modules!inner(course_id, courses!inner(workspace_id))')
  .eq("id", lessonId).eq("workspace_id", workspaceId)
   .single();

  if (lessonErr || !lessonObj) return { error: 'Lesson not found' };
  
  const courseWorkspaceId = (lessonObj.modules as any)?.courses?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  const { error } = await supabase
   .from('lessons')
   .delete()
  .eq("id", lessonId).eq("workspace_id", workspaceId);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  logger.error({ err: error }, 'delete.lesson.failed');
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

    // 4. Fetch progress logs
    const { data: progress, error: progressError } = await adminClient
      .from('course_progress')
      .select('contact_id, lesson_id')
      .eq('course_id', courseId);

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

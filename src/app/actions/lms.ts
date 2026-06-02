'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

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
  return { error: error.message };
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
  return { error: error.message };
 }
}

export async function createCourse(title: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('courses')
   .insert({
    workspace_id: workspaceId,
    title,
    status: 'draft'
   })
   .select()
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
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
  return { error: error.message };
 }
}

export async function enrollStudent(courseId: string, contactId: string) {
 try {
  const supabase = await createServerClient();
  const { error } = await supabase
   .from('enrollments')
   .upsert({ course_id: courseId, contact_id: contactId, status: 'active' });

  if (error) throw error;

  // Fetch workspace_id of the course to trigger automation event
  const { data: course } = await supabase
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
  return { error: error.message };
 }
}

export async function updateProgress(contactId: string, lessonId: string, completed: boolean, progress: number) {
 try {
  // Progress tracking logic
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
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
  return { error: error.message };
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
  return { error: error.message };
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
   .eq('id', moduleId)
   .select()
   .single();

  if (error) throw error;
  return { data: updatedModule };
 } catch (error: any) {
  return { error: error.message };
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
   .eq('id', moduleId)
   .single();

  if (moduleErr || !moduleObj) return { error: 'Module not found' };
  
  const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  const { error } = await supabase
   .from('modules')
   .delete()
   .eq('id', moduleId);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
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
  return { error: error.message };
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
   .eq('id', lessonId)
   .select()
   .single();

  if (error) throw error;
  return { data: updatedLesson };
 } catch (error: any) {
  return { error: error.message };
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
   .eq('id', lessonId)
   .single();

  if (lessonErr || !lessonObj) return { error: 'Lesson not found' };
  
  const courseWorkspaceId = (lessonObj.modules as any)?.courses?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  const { error } = await supabase
   .from('lessons')
   .delete()
   .eq('id', lessonId);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
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
  return { error: error.message };
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

  // 1. Fetch lesson, module and course context details
  const { data: lessonObj } = await supabase
    .from('lessons')
    .select('id, module_id, modules!inner(course_id, courses!inner(workspace_id))')
    .eq('id', lessonId)
    .single();

  if (lessonObj) {
    const moduleId = lessonObj.module_id;
    const courseId = (lessonObj.modules as any)?.course_id;
    const workspaceId = (lessonObj.modules as any)?.courses?.workspace_id;

    if (workspaceId && courseId) {
      const { publishEvent } = await import('@/lib/events/EventBus');
      
      // A. Publish lesson_completed
      await publishEvent(workspaceId, 'lesson_completed', contact.id, { lessonId, moduleId, courseId });

      // B. Evaluate Module Completed
      // Fetch all lessons in this module
      const { data: moduleLessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', moduleId);

      if (moduleLessons && moduleLessons.length > 0) {
        const lessonIds = moduleLessons.map((l: any) => l.id);
        const { data: completedInModule } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('contact_id', contact.id)
          .eq('completed', true)
          .in('lesson_id', lessonIds);
        
        if (completedInModule && completedInModule.length === lessonIds.length) {
          await publishEvent(workspaceId, 'module_completed', contact.id, { moduleId, courseId });
        }
      }

      // C. Evaluate Course Completed
      // Fetch all modules in this course that are required
      const { data: courseModules } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', courseId)
        .eq('is_required_for_completion', true);

      if (courseModules && courseModules.length > 0) {
        const moduleIds = courseModules.map((m: any) => m.id);
        const { data: courseLessons } = await supabase
          .from('lessons')
          .select('id')
          .in('module_id', moduleIds);

        if (courseLessons && courseLessons.length > 0) {
          const courseLessonIds = courseLessons.map((l: any) => l.id);
          const { data: completedInCourse } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('contact_id', contact.id)
            .eq('completed', true)
            .in('lesson_id', courseLessonIds);

          if (completedInCourse && completedInCourse.length === courseLessonIds.length) {
            await publishEvent(workspaceId, 'course_completed', contact.id, { courseId });
          }
        }
      }
    }
  }

  return { success: true };
 } catch (error: any) {
  return { error: error.message };
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

    const supabase = await createServerClient();

    // 1. Fetch course details
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id, title, price, published')
      .eq('id', courseId)
      .eq('workspace_id', workspaceId)
      .single();

    if (courseErr || !course) {
      throw new Error(courseErr?.message || 'Course not found or unauthorized');
    }

    // 2. Fetch all enrollments
    const { data: enrollments, error: enrollError } = await supabase
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
    const { data: lessons, error: lessonsError } = await supabase
      .from('course_lessons')
      .select('id, title, lesson_type')
      .eq('course_id', courseId);

    if (lessonsError) throw lessonsError;

    // 4. Fetch progress logs
    const { data: progress, error: progressError } = await supabase
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
      const { data: attemptsData, error: attemptsError } = await supabase
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
        const { data: contactsData } = await supabase
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
        maxScore: a.max_score || 10,
        percentage: a.percentage || (a.max_score ? Math.round((a.score / a.max_score) * 100) : 0),
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
    return { error: error.message };
  }
}

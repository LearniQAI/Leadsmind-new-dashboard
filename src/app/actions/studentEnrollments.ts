'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId, getUserRole } from '@/lib/auth';

/**
 * Resolves the contact_id for the currently logged-in user email.
 * If no contact exists, it auto-creates one in the current active workspace.
 */
export async function getOrCreateStudentContact(workspaceId: string) {
  const user = await getUser();
  if (!user) return null;

  const adminClient = createAdminClient();

  // Find contact by email in workspace using admin client to bypass RLS select policies
  const { data: contact } = await adminClient
    .from('contacts')
    .select('id')
    .eq('email', user.email)
    .eq('workspace_id', workspaceId)
    .limit(1)
    .maybeSingle();

  if (contact) return contact.id;

  // Auto-create contact record using admin client to bypass RLS insert policies
  const nameParts = (user.user_metadata?.full_name || '').split(' ');
  const firstName = nameParts[0] || 'Student';
  const lastName = nameParts.slice(1).join(' ') || '';

  const { data: newContact, error } = await adminClient
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      email: user.email,
      first_name: firstName,
      last_name: lastName
    })
    .select('id')
    .single();

  if (error) {
    console.error('[StudentEnrollments] Failed to create contact:', error);
    return null;
  }
  return newContact?.id || null;
}

/**
 * Enrolls a student in a course.
 */
export async function enrollStudent(courseId: string) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const role = await getUserRole();
    if (role === 'admin') {
      return { error: 'Administrators cannot enroll in workspace courses as students.' };
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to register student contact profile' };

    const adminClient = createAdminClient();

    // Check if already enrolled using admin client to bypass RLS
    const { data: existing } = await adminClient
      .from('enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (existing) {
      return { success: true, message: 'Already enrolled' };
    }

    const { error } = await adminClient
      .from('enrollments')
      .insert({
        course_id: courseId,
        contact_id: contactId,
        status: 'active'
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Retrieves the courses the logged-in student is enrolled in.
 */
export async function getMyEnrollments() {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { data: [] };

    const adminClient = createAdminClient();

    // Fetch enrollments with course details using admin client to bypass RLS
    const { data: enrollments, error } = await adminClient
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        course:courses (
          id,
          title,
          description,
          price,
          thumbnail_url,
          status,
          published
        )
      `)
      .eq('contact_id', contactId);

    if (error) throw error;

    const activeEnrollments = (enrollments || [])
      .filter((e: any) => e.course)
      .map((e: any) => ({
        enrollmentId: e.id,
        enrolledAt: e.enrolled_at,
        status: e.status,
        ...e.course
      }));

    return { data: activeEnrollments };
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Fetches all courses available in the marketplace (published courses in the current workspace).
 */
export async function getMarketplaceCourses() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const adminClient = createAdminClient();
    const { data: courses, error } = await adminClient
      .from('courses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('published', true);

    if (error) throw error;
    return { data: courses || [] };
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Retrieves enrolled courses with dynamic completion progress percentages.
 */
export async function getEnrolledCoursesWithProgress() {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { data: [] };

    const adminClient = createAdminClient();

    // 1. Fetch enrollments using admin client to bypass RLS
    const { data: enrollments, error: enrollError } = await adminClient
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        course:courses (
          id,
          title,
          description,
          price,
          thumbnail_url,
          status,
          published
        )
      `)
      .eq('contact_id', contactId);

    if (enrollError) throw enrollError;

    // 2. Fetch all progress logs for this contact using admin client to bypass RLS
    const { data: progressLogs, error: progressError } = await adminClient
      .from('course_progress')
      .select('course_id, lesson_id')
      .eq('contact_id', contactId);

    if (progressError) throw progressError;

    // 3. Fetch all course lessons count for enrolled courses using admin client to bypass RLS
    const courseIds = (enrollments || []).map((e: any) => e.course?.id).filter(Boolean);
    
    let lessonCounts: Record<string, number> = {};
    if (courseIds.length > 0) {
      const { data: lessons, error: lessonsError } = await adminClient
        .from('course_lessons')
        .select('course_id, id')
        .in('course_id', courseIds);
      
      if (lessonsError) throw lessonsError;
      
      (lessons || []).forEach((l: any) => {
        lessonCounts[l.course_id] = (lessonCounts[l.course_id] || 0) + 1;
      });
    }

    // 4. Construct response
    const coursesWithProgress = (enrollments || [])
      .filter((e: any) => e.course)
      .map((e: any) => {
        const c = e.course;
        const totalLessons = lessonCounts[c.id] || 0;
        const completedLessons = (progressLogs || []).filter((p: any) => p.course_id === c.id).length;
        const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        return {
          enrollmentId: e.id,
          enrolledAt: e.enrolled_at,
          status: e.status,
          id: c.id,
          title: c.title,
          description: c.description,
          price: c.price,
          thumbnail_url: c.thumbnail_url,
          totalLessons,
          completedLessons,
          progressPercentage
        };
      });

    return { data: coursesWithProgress };
  } catch (err: any) {
    return { error: err.message };
  }
}

'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId, getUserRole } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

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

    const adminClient = createAdminClient();

    // Fetch the course to find its workspace_id
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('workspace_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return { error: 'Course not found' };
    }

    const workspaceId = course.workspace_id;
    if (!workspaceId) return { error: 'Course does not belong to a workspace' };

    // Check user role specifically in the course's workspace to block course admins from self-enrolling
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership?.role === 'admin') {
      return { error: 'Administrators cannot enroll in workspace courses as students.' };
    }

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to register student contact profile' };

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

    // Hook telemetry triggers
    const { emitLMSEvent } = await import('../../../libs/core/src/events/lms-event-bus');
    await emitLMSEvent('student.enrolled', {
      workspaceId,
      contactId,
      courseId
    });

    try {
      const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
      dispatchWebhook(workspaceId, 'course.enrolment', {
        enrolment: { contact_id: contactId, course_id: courseId, enrolled_at: new Date().toISOString() },
      }).catch(() => {});
    } catch (e) { console.error('[webhook-dispatch-course-enrolment-error]', e); }

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

    const adminClient = createAdminClient();

    // Fetch all contact records matching user's email across all workspaces
    const { data: contacts, error: contactError } = await adminClient
      .from('contacts')
      .select('id')
      .eq('email', user.email);

    if (contactError) throw contactError;
    const contactIds = (contacts || []).map((c: any) => c.id);
    if (contactIds.length === 0) return { data: [] };

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
      .in('contact_id', contactIds);

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
export async function getMarketplaceCourses(overrideWorkspaceId?: string) {
  try {
    const workspaceId = overrideWorkspaceId || await getCurrentWorkspaceId();

    const adminClient = createAdminClient();
    let query = adminClient
      .from('courses')
      .select('*')
      .eq('published', true);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data: courses, error } = await query;
    if (error) throw error;

    // Fallback: If no courses are found in the filtered workspace, but there are published courses in the system, return all published courses
    if ((!courses || courses.length === 0) && workspaceId) {
      const { data: allCourses } = await adminClient
        .from('courses')
        .select('*')
        .eq('published', true);
      if (allCourses && allCourses.length > 0) {
        return { data: allCourses };
      }
    }

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

    const adminClient = createAdminClient();

    // Fetch all contact records matching user's email across all workspaces
    const { data: contacts, error: contactError } = await adminClient
      .from('contacts')
      .select('id')
      .eq('email', user.email);

    if (contactError) throw contactError;
    const contactIds = (contacts || []).map((c: any) => c.id);
    if (contactIds.length === 0) return { data: [] };

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
      .in('contact_id', contactIds);

    if (enrollError) throw enrollError;

    // 2. Fetch all progress logs for these contacts using admin client to bypass RLS
    const { data: progressLogs, error: progressError } = await adminClient
      .from('course_progress')
      .select('course_id, lesson_id')
      .in('contact_id', contactIds);

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

/**
 * Creates a Stripe Checkout Session for a student course purchase.
 */
export async function createCourseCheckoutSession(courseId: string) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();

    // Fetch course details
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return { error: 'Course not found' };
    }

    const workspaceId = course.workspace_id;
    if (!workspaceId) {
      return { error: 'Course does not belong to a workspace' };
    }

    // Check user role specifically in the course's workspace to block course admins from self-enrolling
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership?.role === 'admin') {
      return { error: 'Administrators cannot enroll in workspace courses as students.' };
    }

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) {
      return { error: 'Failed to resolve student contact details' };
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course.title,
              description: course.description || undefined,
              images: course.thumbnail_url ? [course.thumbnail_url] : undefined,
            },
            unit_amount: Math.round(course.price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        courseId: course.id,
        contactId: contactId,
        workspaceId: workspaceId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/courses/${course.id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/student/checkout/${course.id}?payment=canceled`,
      customer_email: user.email || undefined,
    });

    return { url: session.url };
  } catch (err: any) {
    console.error('[StudentEnrollments] createCourseCheckoutSession error:', err);
    return { error: err.message || 'Failed to create checkout session' };
  }
}

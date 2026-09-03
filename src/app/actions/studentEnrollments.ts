'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId, getUserRole } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { logger } from '@/shared/logger';
import { isEnrolmentActive } from '@/lib/lms/enrolment';

/**
 * Every `contacts.id` matching the logged-in user's email, across all workspaces — the same
 * cross-workspace identity resolution getEnrolledCoursesWithProgress()/getStudentQuizStats()
 * use for the student dashboard (a student can hold a contact in more than one workspace and
 * the /student area has no single active-workspace scoping for its aggregates). Read-only:
 * unlike getOrCreateStudentContact it never creates a row.
 */
export async function getStudentContactIds(): Promise<string[]> {
  const user = await getUser();
  if (!user?.email) return [];
  const adminClient = createAdminClient();
  const { data } = await adminClient.from('contacts').select('id').eq('email', user.email);
  return (data || []).map((c: any) => c.id);
}

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
    logger.error({ err: error, workspaceId }, 'student_enrollments.contact.create.failed');
    return null;
  }
  return newContact?.id || null;
}

/**
 * Enrolls a student in a course.
 */
export async function enrollStudent(courseId: string) {
  let workspaceId: string | null = null;
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();

    // Fetch the course to find its workspace_id, price, and pricing_model
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('workspace_id, price, pricing_model, start_method, email_access_auto_send')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return { error: 'Course not found' };
    }

    workspaceId = course.workspace_id;
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

    // Paid courses require a real, completed payment record before enrollment is created —
    // this is the only thing standing between a direct call to this action and a free ride
    // into a paid course. Gated on pricing_model === 'free' (the same authoritative field
    // CheckoutClient itself reads to decide whether to show the free-enrollment UI at all),
    // NOT on price > 0 — a course can have pricing_model = 'free' while still carrying a
    // stale nonzero `price` left over from before it was switched to free access (e.g. it
    // was a paid course whose price was never reset when the model changed), and gating on
    // price alone made every such course wrongly demand a payment record that could never
    // exist, permanently blocking real enrollment behind a contradictory "No completed
    // payment found" error even though the checkout page correctly showed the free-entry UI.
    // The payment record convention (a paid invoice whose metadata references this courseId)
    // mirrors the same metadata shape already used for Stripe course checkout sessions
    // (see createCourseCheckoutSession/createDirectCourseCheckoutSession below).
    if (course.pricing_model !== 'free' && course.price && course.price > 0) {
      const { data: paidInvoice } = await adminClient
        .from('invoices')
        .select('id')
        .eq('contact_id', contactId)
        .eq('workspace_id', workspaceId)
        .eq('status', 'paid')
        .contains('metadata', { courseId })
        .maybeSingle();

      if (!paidInvoice) {
        return { error: 'No completed payment found for this course.' };
      }
    }

    // Course Start Method 1 (email access link): a course explicitly configured this way
    // either grants access immediately (auto-send) or holds the enrollment as
    // pending_approval until an admin approves it — see courseEnrollmentApproval.ts. Every
    // other start_method (including the default instant_payment) keeps today's exact
    // behavior: status 'active' immediately.
    const isHeldForApproval =
      course.start_method === 'email_access_link' && !course.email_access_auto_send;

    const { error } = await adminClient
      .from('enrollments')
      .insert({
        course_id: courseId,
        contact_id: contactId,
        status: isHeldForApproval ? 'pending_approval' : 'active'
      });

    if (error) throw error;

    if (isHeldForApproval) {
      // No access yet, no onboarding email yet — both wait for a real admin Approve action.
      return { success: true, pendingApproval: true, message: 'Your enrollment is awaiting approval.' };
    }

    // Hook telemetry triggers
    // Trigger string is 'enrollment_created' — the exact value the automation-rule
    // builder's dropdown offers (RuleModal TRIGGERS) and emitLMSEvent matches by
    // exact string. It was historically emitted as 'student.enrolled', which no
    // rule could ever match.
    const { emitLMSEvent } = await import('../../../libs/core/src/events/lms-event-bus');
    await emitLMSEvent('enrollment_created', {
      workspaceId,
      contactId,
      courseId
    });

    try {
      const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
      dispatchWebhook(workspaceId, 'course.enrolment', {
        enrolment: { contact_id: contactId, course_id: courseId, enrolled_at: new Date().toISOString() },
      }).catch(() => {});
    } catch (e) {
      logger.error({ err: e, workspaceId, contactId, courseId }, 'student_enrollments.enrolment.webhook_dispatch.failed');
    }

    // Method 1 auto-send fires the same real onboarding-email path every other free
    // enrollment already uses — no second email mechanism.
    if (course.start_method === 'email_access_link') {
      try {
        const { sendCourseOnboardingEmail } = await import('@/lib/lms/onboardingEmail');
        await sendCourseOnboardingEmail({ courseId, contactId, workspaceId, accessType: 'full' });
      } catch (e) {
        logger.error({ err: e, workspaceId, contactId, courseId }, 'student_enrollments.access_link_email.failed');
      }
    }

    return { success: true };
  } catch (err: any) {
    logger.error({ err, workspaceId, courseId }, 'student_enrollments.enroll.failed');
    return { error: 'Failed to enroll in course.' };
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
        active,
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
      .filter((e: any) => e.course && isEnrolmentActive(e))
      .map((e: any) => ({
        enrollmentId: e.id,
        enrolledAt: e.enrolled_at,
        status: e.status,
        ...e.course
      }));

    return { data: activeEnrollments };
  } catch (err: any) {
    logger.error({ err }, 'student_enrollments.my_enrollments.fetch.failed');
    return { error: 'Failed to fetch enrollments.' };
  }
}

/**
 * Fetches all courses available in the marketplace (published courses in the current workspace).
 */
export async function getMarketplaceCourses(overrideWorkspaceId?: string) {
  try {
    const adminClient = createAdminClient();
    const user = await getUser();

    // The set of workspaces this user may legitimately see a catalog for:
    //  - an explicit override (already role-checked by the caller), or
    //  - the active_workspace_id cookie, PLUS every workspace where the user is a member
    //    or has a contact record (i.e. has been enrolled/invited).
    // The previous implementation, on finding zero courses for the cookie workspace, fell
    // back to returning EVERY published course in the system — a cross-tenant leak. This
    // scopes the fallback to the user's own workspaces instead.
    const allowedWorkspaceIds = new Set<string>();

    if (overrideWorkspaceId) {
      allowedWorkspaceIds.add(overrideWorkspaceId);
    } else {
      const cookieWorkspaceId = await getCurrentWorkspaceId();
      if (cookieWorkspaceId) allowedWorkspaceIds.add(cookieWorkspaceId);

      if (user) {
        const [{ data: memberships }, { data: contacts }] = await Promise.all([
          adminClient.from('workspace_members').select('workspace_id').eq('user_id', user.id),
          user.email
            ? adminClient.from('contacts').select('workspace_id').eq('email', user.email)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        (memberships || []).forEach((m: any) => m.workspace_id && allowedWorkspaceIds.add(m.workspace_id));
        (contacts || []).forEach((c: any) => c.workspace_id && allowedWorkspaceIds.add(c.workspace_id));
      }
    }

    const byId = new Map<string, any>();

    // Discovery set: published courses in the workspaces this user may browse.
    if (allowedWorkspaceIds.size > 0) {
      const { data: courses, error } = await adminClient
        .from('courses')
        .select('*')
        .eq('published', true)
        .in('workspace_id', Array.from(allowedWorkspaceIds));

      if (error) throw error;
      for (const c of courses || []) byId.set(c.id, c);
    }

    // Always also include courses this student is ALREADY enrolled in — regardless of the
    // course's publish status OR which workspace it's in. A student's login spans every
    // workspace they're a contact of, and enrolments can predate a course being published
    // (published=true / status='draft' is a real state). Without this the catalog shows
    // "No courses available" to a student who is genuinely enrolled — see the dashboard,
    // which already spans all of the user's contacts by email. You can only ever reach a
    // course here that you're personally enrolled in, so this is not a cross-tenant leak.
    if (user?.email) {
      const { data: myContacts } = await adminClient
        .from('contacts')
        .select('id')
        .eq('email', user.email);
      const myContactIds = (myContacts || []).map((c: any) => c.id);

      if (myContactIds.length > 0) {
        const { data: myEnrollments } = await adminClient
          .from('enrollments')
          .select('course_id')
          .in('contact_id', myContactIds);
        const enrolledCourseIds = Array.from(
          new Set((myEnrollments || []).map((e: any) => e.course_id).filter(Boolean))
        );
        const missingIds = enrolledCourseIds.filter((id) => !byId.has(id));

        if (missingIds.length > 0) {
          const { data: enrolledCourses } = await adminClient
            .from('courses')
            .select('*')
            .in('id', missingIds);
          for (const c of enrolledCourses || []) byId.set(c.id, c);
        }
      }
    }

    const courses = Array.from(byId.values());

    // Batch 6 (G9) — attach real category name/color to each course (category_id itself is
    // already on the row via select('*') above) and return the workspace(s)' own category
    // list for the catalog's filter dropdown. A course with no category, or whose category
    // was deleted (ON DELETE SET NULL), simply gets no categoryName — the catalog treats that
    // as "Uncategorized", never hides it or errors.
    const courseWorkspaceIds = Array.from(new Set(courses.map((c: any) => c.workspace_id).filter(Boolean)));
    let categories: { id: string; name: string; color: string }[] = [];
    if (courseWorkspaceIds.length > 0) {
      const { data: cats } = await adminClient
        .from('course_categories')
        .select('id, name, color, workspace_id')
        .in('workspace_id', courseWorkspaceIds)
        .order('position', { ascending: true });
      categories = cats || [];
    }
    const categoryById = new Map(categories.map((c: any) => [c.id, c]));
    for (const c of courses as any[]) {
      const cat = c.category_id ? categoryById.get(c.category_id) : null;
      c.categoryName = cat?.name || null;
      c.categoryColor = cat?.color || null;
    }

    return {
      data: courses,
      categories: categories.map(({ id, name, color }) => ({ id, name, color })),
    };
  } catch (err: any) {
    logger.error({ err }, 'student_enrollments.marketplace_courses.fetch.failed');
    return { error: 'Failed to fetch marketplace courses.' };
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
    const { data: enrollmentsRaw, error: enrollError } = await adminClient
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        active,
        last_active_at,
        last_lesson_id,
        last_position_seconds,
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

    // Deactivated enrolments must drop off the student's dashboard, not just the roster.
    const enrollments = (enrollmentsRaw || []).filter((e: any) => isEnrolmentActive(e));

    // 2. Fetch real lesson COMPLETIONS for these contacts (admin client bypasses RLS).
    // completed_at IS NOT NULL is load-bearing: the player heartbeat also writes
    // course_progress rows with completed_at:null purely to remember a video's playback
    // position — those must never count toward progress %.
    const { data: progressLogs, error: progressError } = await adminClient
      .from('course_progress')
      .select('course_id, lesson_id')
      .not('completed_at', 'is', null)
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
          // Real "last activity" signal written by the player heartbeat
          // (PATCH /api/enrolments/:id/activity). last_active_at defaults to enrolled_at
          // on enrolment and is bumped on every heartbeat, so ranking by it degrades
          // gracefully to "most recently enrolled" for a student with no activity yet.
          // last_lesson_id / last_position_seconds drive the player's ?restore= resume.
          lastActiveAt: e.last_active_at || e.enrolled_at,
          lastLessonId: e.last_lesson_id || null,
          lastPositionSeconds: e.last_position_seconds || 0,
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
    logger.error({ err }, 'student_enrollments.courses_with_progress.fetch.failed');
    return { error: 'Failed to fetch course progress.' };
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
    logger.error({ err, courseId }, 'student_enrollments.checkout_session.create.failed');
    return { error: 'Failed to create checkout session' };
  }
}

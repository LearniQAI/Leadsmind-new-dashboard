import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getCourseLandingData, getCourseLandingDataByDomain } from '@/app/actions/courseLanding';
import LandingPageRenderer from '@/components/courses/landing-pages/LandingPageRenderer';
import { getUser } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { isEnrolmentActive } from '@/lib/lms/enrolment';
import { createAdminClient } from '@/lib/supabase/server';

interface PageProps {
  params: {
    slug: string;
  };
  searchParams: {
    preview?: string;
  };
}

export default async function PublicCourseLandingPage({ params, searchParams }: PageProps) {
  const isPreview = searchParams.preview === 'true';

  // Custom-Domain Course Serving pass — src/middleware.ts sets this request header only when
  // it rewrote a request from a verified (status='active') custom domain, carrying the real
  // domain_configurations.id it resolved. Same page, same LandingPageRenderer either way —
  // only the lookup differs: domain-scoped (courses.domain_id + url_path) instead of the
  // global slug this route otherwise uses for the default leadsmind.io domain.
  const domainConfigId = headers().get('x-domain-config-id');
  const result = domainConfigId
    ? await getCourseLandingDataByDomain(domainConfigId, params.slug, isPreview)
    : await getCourseLandingData(params.slug, isPreview);

  if ('error' in result && result.error) {
    notFound();
  }
  const { course, modules, lessons } = result as { course: any; modules: any[]; lessons: any[] };

  // Real viewer enrolment state for the purchase card's Enroll/Buy vs Continue Learning vs
  // Access-paused states. Resolved against the COURSE's own workspace_id, not whatever
  // workspace the visitor's active_workspace_id cookie happens to point at — the same
  // cross-workspace mismatch bug already fixed in studentProgress.ts's resolveCourseContext.
  // getOrCreateStudentContact() returns null for a signed-out visitor, so this is a no-op for
  // the anonymous case the marketing page mainly serves.
  let viewerState: { enrolled: boolean; active: boolean } | null = null;
  if (!isPreview) {
    const user = await getUser();
    if (user && course?.workspace_id) {
      const contactId = await getOrCreateStudentContact(course.workspace_id);
      if (contactId) {
        const adminClient = createAdminClient();
        const { data: enrollment } = await adminClient
          .from('enrollments')
          .select('status, active')
          .eq('course_id', course.id)
          .eq('contact_id', contactId)
          .maybeSingle();
        if (enrollment) {
          viewerState = { enrolled: true, active: isEnrolmentActive(enrollment) };
        }
      }
    }
  }

  return (
    <LandingPageRenderer
      course={course}
      modules={modules}
      lessons={lessons}
      previewMode={isPreview}
      viewerState={viewerState}
    />
  );
}

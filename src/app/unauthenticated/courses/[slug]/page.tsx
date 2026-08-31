import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getCourseLandingData, getCourseLandingDataByDomain } from '@/app/actions/courseLanding';
import LandingPageRenderer from '@/components/courses/landing-pages/LandingPageRenderer';

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

  return (
    <LandingPageRenderer
      course={course}
      modules={modules}
      lessons={lessons}
      previewMode={isPreview}
    />
  );
}

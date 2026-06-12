import React from 'react';
import { notFound } from 'next/navigation';
import { getCourseLandingData } from '@/app/actions/courseLanding';
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
  const { course, modules, lessons, error } = await getCourseLandingData(params.slug, isPreview);

  if (error || !course) {
    notFound();
  }

  return (
    <LandingPageRenderer
      course={course}
      modules={modules}
      lessons={lessons}
      previewMode={isPreview}
    />
  );
}

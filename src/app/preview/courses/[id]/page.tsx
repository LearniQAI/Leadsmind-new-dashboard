import React from 'react';
import { notFound } from 'next/navigation';
import { resolveCoursePreview } from '@/lib/lms/resolveCoursePreview';
import PreviewLessonClient from '@/components/lms/PreviewLessonClient';

// Course Start Method 3 (free preview lessons, then paywall) — the genuinely anonymous
// (no session at all) entry point. Deliberately NOT under src/app/student/, whose layout.tsx
// hard-gates every route with requireAuth(); this route has its own (root) layout and does
// its own, narrower gate: resolveCoursePreview() only ever returns a real lesson's content
// when that lesson is is_preview, otherwise the client renders the real paywall. No contact,
// no progress, no enrollment is read or written here.
//
// The authenticated player at /student/courses/[id] redirects a signed-out visitor here, and
// the landing page's "Preview" badges link straight here.

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
  searchParams: { lessonId?: string };
}

export default async function AnonymousCoursePreviewPage({ params, searchParams }: PageProps) {
  const res = await resolveCoursePreview(params.id, searchParams.lessonId);
  if (!res) notFound();

  return (
    <PreviewLessonClient
      course={res.course}
      modules={res.modules}
      lessons={res.lessons}
      activeLesson={res.activeLesson}
      pricing={res.pricing}
      isSignedIn={false}
    />
  );
}

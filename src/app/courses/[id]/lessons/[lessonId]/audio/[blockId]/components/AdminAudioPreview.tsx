"use client";

import React from 'react';
import { Headphones } from 'lucide-react';
import AudioDrivePlayer from '@/app/student/courses/[id]/components/AudioDrivePlayer';
import { getCourseTheme } from '@/lib/courses/courseThemeTokens';
import type { CourseInfo, LessonInfo } from './useAudioAuthoringData';

interface AdminAudioPreviewProps {
  assetId: string | null;
  contentBlockId: string;
  courseId: string;
  lessonId: string;
  course: CourseInfo | null;
  lesson: LessonInfo | null;
  completionThreshold: number | null;
}

// "Dogfooding the real component" (the PRD's own instruction): this is NOT a second, lighter
// player mocked up for the admin screen — it's the exact AudioDrivePlayer Part A shipped. The
// enclosing AudioPlayerProvider is mounted ONE level up, by this route's page.tsx, wrapping
// BOTH this preview and the timeline/transcript/chapter editors — they all share the same
// playhead through the same provider instance (scrubbing the preview moves the timeline editors
// and vice versa). It is NOT wrapped here, and must not be — a provider local to just this
// component would isolate its playback state from the editors next to it, breaking that sync.
// Completely independent from the provider mounted at /student/layout.tsx; this route tree
// never touches that one.
export default function AdminAudioPreview({
  assetId,
  contentBlockId,
  courseId,
  lessonId,
  course,
  lesson,
  completionThreshold,
}: AdminAudioPreviewProps) {
  const theme = getCourseTheme(course?.landing_page_settings?.template);

  if (!assetId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-dash-border bg-dash-surface text-center">
        <Headphones size={24} className="!text-dash-textMuted" />
        <p className="max-w-[220px] text-[12px] !text-dash-textMuted">
          Paste and validate a Drive link to see the live student preview here.
        </p>
      </div>
    );
  }

  return (
    <AudioDrivePlayer
      assetId={assetId}
      contentBlockId={contentBlockId}
      courseId={courseId}
      lessonId={lessonId}
      title={lesson?.title || 'Lesson'}
      courseTitle={course?.title}
      artworkUrl={course?.thumbnail_url}
      completionThreshold={completionThreshold}
      isAlreadyCompleted={false}
      onComplete={() => {}}
      theme={theme}
    />
  );
}

"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCourseTheme, CourseThemeTokens } from '@/lib/courses/courseThemeTokens';

// Lesson Builder Part 2: gives canvas-placed LessonBlockNode components access to which
// lesson they belong to, without threading lessonId through every node's own serialized
// Craft.js props (it's the same for every block node on this page, so it's context, not
// per-node state).
//
// Part 3, Step 0 typography decision: rather than a third, disconnected font system,
// templates inherit the active course's real Signal/Ember/Grove theme typography (already
// real, registered Tailwind classes — font-signalHeading/font-emberBody/etc, confirmed live
// in tailwind.config.js). `theme` is resolved here (fetched once per lesson-builder session
// from the course row) and consumed by Heading/Paragraph via their optional `useThemeFont`
// prop — additive only, never changes behavior for the Website/Funnel Builder's own usage of
// those same shared components.
interface LessonBuilderContextValue {
  lessonId: string | null;
  courseId: string | null;
  theme: CourseThemeTokens | null;
}

const LessonBuilderContext = createContext<LessonBuilderContextValue>({ lessonId: null, courseId: null, theme: null });

export const LessonBuilderProvider = ({
  lessonId,
  courseId,
  children,
}: {
  lessonId: string | null;
  courseId: string | null;
  children: React.ReactNode;
}) => {
  const [theme, setTheme] = useState<CourseThemeTokens | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('courses')
      .select('landing_page_settings')
      .eq('id', courseId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTheme(getCourseTheme(data?.landing_page_settings?.template));
      });
    return () => { cancelled = true; };
  }, [courseId]);

  return (
    <LessonBuilderContext.Provider value={{ lessonId, courseId, theme }}>{children}</LessonBuilderContext.Provider>
  );
};

export const useLessonBuilder = () => useContext(LessonBuilderContext);

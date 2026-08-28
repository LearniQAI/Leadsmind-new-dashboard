"use client";

import React, { createContext, useContext } from 'react';

// Lesson Builder Part 2: gives canvas-placed LessonBlockNode components access to which
// lesson they belong to, without threading lessonId through every node's own serialized
// Craft.js props (it's the same for every block node on this page, so it's context, not
// per-node state).
interface LessonBuilderContextValue {
  lessonId: string | null;
  courseId: string | null;
}

const LessonBuilderContext = createContext<LessonBuilderContextValue>({ lessonId: null, courseId: null });

export const LessonBuilderProvider = ({
  lessonId,
  courseId,
  children,
}: {
  lessonId: string | null;
  courseId: string | null;
  children: React.ReactNode;
}) => (
  <LessonBuilderContext.Provider value={{ lessonId, courseId }}>{children}</LessonBuilderContext.Provider>
);

export const useLessonBuilder = () => useContext(LessonBuilderContext);

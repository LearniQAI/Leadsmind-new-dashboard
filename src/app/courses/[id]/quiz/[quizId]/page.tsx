import React from 'react';
import { notFound } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getCourse } from '@/app/actions/lms';
import { createServerClient } from '@/lib/supabase/server';
import QuizWorkbenchClient from './QuizWorkbenchClient';

interface PageProps {
  params: {
    id: string;      // courseId
    quizId: string;  // quizId, really the lesson id — see the shape built below
  };
}

// Three Deferred Items, Item 3 — this used to try the legacy lms_quizzes table first
// (getQuizById) and only fall back to the real course_lessons-based shape if that returned
// nothing. Confirmed live that fallback ALWAYS ran for every real lesson quiz (lms_quizzes had
// 0 real rows workspace-wide), so the legacy lookup was dead weight on every single page load,
// not a real code path — removed, this is now the one real lookup.
export default async function QuizWorkbenchPage({ params }: PageProps) {
  const courseId = params.id;
  const quizId = params.quizId;

  const courseRes = await getCourse(courseId);
  if (courseRes.error || !courseRes.data) {
    notFound();
  }
  const course = courseRes.data;

  const supabase = await createServerClient();
  const { data: lesson } = await supabase
    .from('course_lessons')
    .select('*')
    .eq('id', quizId)
    .single();

  if (!lesson) {
    notFound();
  }

  const quiz = {
    id: lesson.id,
    title: lesson.title,
    lesson_id: lesson.id,
    course_id: lesson.course_id,
    module_id: lesson.module_id,
    description: lesson.content?.text || '',
    content: lesson.content || {}
  };

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] !text-dash-text">
        <QuizWorkbenchClient
          course={course}
          quiz={quiz}
        />
      </div>
    </Wrapper>
  );
}

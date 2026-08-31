import React from 'react';
import { notFound } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getCourse } from '@/app/actions/lms';
import { createServerClient } from '@/lib/supabase/server';
import QuizWorkbenchClient from '../../quiz/[quizId]/QuizWorkbenchClient';

interface PageProps {
  params: {
    id: string;
    moduleId: string;
  };
}

// Module-Level Quiz — the module-scoped counterpart to /courses/[id]/quiz/[quizId]/page.tsx,
// reusing the exact same QuizWorkbenchClient (Step 2: same question-authoring experience, not
// a different one) via its moduleId prop instead of a lesson-shaped `quiz` object.
export default async function ModuleQuizWorkbenchPage({ params }: PageProps) {
  const courseId = params.id;
  const moduleId = params.moduleId;

  const courseRes = await getCourse(courseId);
  if (courseRes.error || !courseRes.data) {
    notFound();
  }
  const course = courseRes.data;

  const supabase = await createServerClient();
  const { data: courseModule } = await supabase
    .from('course_modules')
    .select('*')
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .eq('workspace_id', course.workspace_id)
    .maybeSingle();

  if (!courseModule) {
    notFound();
  }

  // Shaped just enough to satisfy QuizWorkbenchClient's `quiz` prop for display purposes
  // (header title, workspace_id fallback) — the module-scope branches inside it never read
  // quiz.content/quiz.module_id/etc, only quiz.title and quiz.workspace_id.
  const quiz = {
    id: courseModule.id,
    title: courseModule.title,
    workspace_id: course.workspace_id,
  };

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] !text-dash-text">
        <QuizWorkbenchClient course={course} quiz={quiz} moduleId={moduleId} />
      </div>
    </Wrapper>
  );
}

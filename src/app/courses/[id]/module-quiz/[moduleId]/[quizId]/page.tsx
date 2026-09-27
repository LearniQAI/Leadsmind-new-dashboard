import React from 'react';
import { notFound } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getCourse } from '@/app/actions/lms';
import { createServerClient } from '@/lib/supabase/server';
import QuizWorkbenchClient from '../../../quiz/[quizId]/QuizWorkbenchClient';

interface PageProps {
  params: {
    id: string;
    moduleId: string;
    quizId: string;
  };
}

// Module-Level Quiz builder for ONE quiz of a module (a module can hold several; the list is
// /courses/[id]/module-quiz/[moduleId]). Reuses the exact same QuizWorkbenchClient as
// /courses/[id]/quiz/[quizId] (same question-authoring experience) via its moduleId prop, with
// `quiz` being the module_quizzes row.
export default async function ModuleQuizWorkbenchPage({ params }: PageProps) {
  const { id: courseId, moduleId, quizId } = params;

  const courseRes = await getCourse(courseId);
  if (courseRes.error || !courseRes.data) {
    notFound();
  }
  const course = courseRes.data;

  const supabase = await createServerClient();
  const { data: courseModule } = await supabase
    .from('course_modules')
    .select('id')
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .eq('workspace_id', course.workspace_id)
    .maybeSingle();
  if (!courseModule) {
    notFound();
  }

  const { data: moduleQuiz } = await supabase
    .from('module_quizzes')
    .select('id, module_id, title, status, workspace_id')
    .eq('id', quizId)
    .eq('module_id', moduleId)
    .eq('workspace_id', course.workspace_id)
    .maybeSingle();
  if (!moduleQuiz) {
    notFound();
  }

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] !text-dash-text">
        <QuizWorkbenchClient course={course} quiz={moduleQuiz} moduleId={moduleId} />
      </div>
    </Wrapper>
  );
}

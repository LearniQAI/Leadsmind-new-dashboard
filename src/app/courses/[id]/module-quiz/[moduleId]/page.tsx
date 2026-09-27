import React from 'react';
import { notFound } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getCourse } from '@/app/actions/lms';
import { listModuleQuizzes } from '@/app/actions/moduleQuizzes';
import { createServerClient } from '@/lib/supabase/server';
import ModuleQuizListClient from './ModuleQuizListClient';

interface PageProps {
  params: {
    id: string;
    moduleId: string;
  };
}

// A module's quizzes. A module can hold any number of quizzes (module_quizzes); the course
// module row's "Module Quiz" button lands here, and each quiz opens in the builder at
// /courses/[id]/module-quiz/[moduleId]/[quizId].
export default async function ModuleQuizzesPage({ params }: PageProps) {
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
    .select('id, title, position')
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .eq('workspace_id', course.workspace_id)
    .maybeSingle();
  if (!courseModule) {
    notFound();
  }

  const quizzesRes = await listModuleQuizzes(moduleId);

  return (
    <Wrapper>
      <div className="p-6 max-w-5xl mx-auto font-body min-h-[calc(100vh-80px)] !text-dash-text">
        <ModuleQuizListClient
          course={{ id: course.id, title: course.title }}
          courseModule={courseModule}
          initialQuizzes={quizzesRes.data || []}
          loadError={quizzesRes.error || null}
        />
      </div>
    </Wrapper>
  );
}

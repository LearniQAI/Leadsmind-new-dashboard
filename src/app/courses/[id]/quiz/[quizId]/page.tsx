import React from 'react';
import { notFound } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getCourse } from '@/app/actions/lms';
import { getQuizById } from '@/app/actions/quizzes';
import QuizWorkbenchClient from './QuizWorkbenchClient';

interface PageProps {
  params: {
    id: string;      // courseId
    quizId: string;  // quizId
  };
}

export default async function QuizWorkbenchPage({ params }: PageProps) {
  const courseId = params.id;
  const quizId = params.quizId;

  // Try fetching course and quiz from legacy tables
  const [courseRes, quizRes] = await Promise.all([
    getCourse(courseId),
    getQuizById(quizId)
  ]);

  if (courseRes.error || !courseRes.data) {
    notFound();
  }

  const course = courseRes.data;
  let quiz = quizRes.data || null;

  if (!quiz) {
    // Backward compatibility: Check if it's a new course_lessons node representing a quiz
    const { createServerClient } = await import('@/lib/supabase/server');
    const supabase = await createServerClient();
    const { data: lesson } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('id', quizId)
      .single();

    if (lesson) {
      quiz = {
        id: lesson.id,
        title: lesson.title,
        lesson_id: lesson.id,
        course_id: lesson.course_id,
        module_id: lesson.module_id,
        description: lesson.content?.text || '',
        content: lesson.content || {}
      };
    }
  }

  if (!quiz) {
    notFound();
  }

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] text-white">
        <QuizWorkbenchClient 
          course={course} 
          quiz={quiz} 
        />
      </div>
    </Wrapper>
  );
}

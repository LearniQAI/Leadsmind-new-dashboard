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

  const [courseRes, quizRes] = await Promise.all([
    getCourse(courseId),
    getQuizById(quizId)
  ]);

  if (courseRes.error || !courseRes.data || quizRes.error || !quizRes.data) {
    notFound();
  }

  const course = courseRes.data;
  const quiz = quizRes.data;

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

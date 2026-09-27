import React from 'react';
import { notFound } from 'next/navigation';
import StudentQuizClient from '../../../quiz/[quizId]/StudentQuizClient';
import ModuleQuizShell from '../ModuleQuizShell';
import { loadStudentModuleQuizContext, ModuleQuizLocked } from '../moduleQuizContext';
import { buildClientQuestion } from '@/lib/lms/quizGrading';

interface StudentModuleQuizPageProps {
  params: { id: string; moduleId: string; quizId: string };
}

// Module-Level Quiz — one specific quiz of a module (a module can hold several). Reuses
// StudentQuizClient (the quiz-taking flow) inside the in-course chrome (ModuleQuizShell → the
// same SyllabusSidebar the lesson player uses). Only a quiz the student can see (published,
// with questions) opens; submitModuleQuizAttempt enforces the same rule server-side.
export default async function StudentModuleQuizPage({ params }: StudentModuleQuizPageProps) {
  const { id: courseId, moduleId, quizId } = params;

  const ctx = await loadStudentModuleQuizContext(courseId, moduleId);
  const quiz = ctx.quizzes.find((q) => q.id === quizId);
  if (!quiz) notFound();

  let body: React.ReactNode;
  if (!ctx.completion.allComplete) {
    body = <ModuleQuizLocked courseId={courseId} moduleTitle={ctx.courseModule.title} completion={ctx.completion} />;
  } else {
    const [questionsRes, settingsRes, attemptsRes] = await Promise.all([
      ctx.adminClient.from('module_quiz_questions').select('*').eq('quiz_id', quiz.id).order('position', { ascending: true }),
      ctx.adminClient.from('module_quiz_settings').select('*').eq('quiz_id', quiz.id).maybeSingle(),
      ctx.adminClient.from('module_quiz_attempts').select('id').eq('quiz_id', quiz.id).eq('student_id', ctx.contactId),
    ]);

    body = (
      <StudentQuizClient
        courseId={courseId}
        quiz={{ id: quiz.id, title: quiz.title }}
        questions={(questionsRes.data || []).map(buildClientQuestion)}
        settings={settingsRes.data || {}}
        attemptsCount={attemptsRes.data?.length || 0}
        hasPassedRemedial={false}
        moduleId={moduleId}
      />
    );
  }

  return <ModuleQuizShell {...ctx.shellProps}>{body}</ModuleQuizShell>;
}

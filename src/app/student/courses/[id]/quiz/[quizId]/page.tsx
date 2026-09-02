import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, getCurrentProfile } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import StudentQuizClient from './StudentQuizClient';
import ModuleQuizShell from '../../module-quiz/[moduleId]/ModuleQuizShell';
import { buildClientQuestion } from '@/lib/lms/quizGrading';

interface StudentQuizPageProps {
  params: { id: string; quizId: string };
}

export default async function StudentQuizPage({ params }: StudentQuizPageProps) {
  const courseId = params.id;
  const quizId = params.quizId;
  await requireAuth();

  const adminClient = createAdminClient();

  const { data: course } = await adminClient.from('courses').select('*').eq('id', courseId).single();
  if (!course) notFound();

  const contactId = await getOrCreateStudentContact(course.workspace_id);
  if (!contactId) redirect('/student/marketplace');

  const { data: enrollment } = await adminClient
    .from('enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('contact_id', contactId)
    .maybeSingle();
  if (!enrollment) redirect(`/student/courses/${courseId}`);

  const { data: lesson } = await adminClient.from('course_lessons').select('*').eq('id', quizId).single();
  if (!lesson || lesson.lesson_type !== 'quiz' || lesson.is_active === false) notFound();

  const [questionsRes, settingsRes, attemptsRes, remedialRes, modulesRes, lessonsRes, progressRes, profile] =
    await Promise.all([
      adminClient.from('quiz_questions').select('*').eq('lesson_id', quizId).order('position', { ascending: true }),
      adminClient.from('quiz_settings').select('*').eq('lesson_id', quizId).maybeSingle(),
      adminClient.from('quiz_attempts').select('id').eq('lesson_id', quizId).eq('student_id', contactId),
      adminClient.from('lms_remedial_assignments').select('status').eq('enrollment_id', enrollment.id).eq('lesson_id', quizId).maybeSingle(),
      adminClient.from('course_modules').select('*').eq('course_id', courseId).eq('is_active', true).order('position', { ascending: true }),
      adminClient.from('course_lessons').select('*').eq('course_id', courseId).eq('is_active', true).order('position', { ascending: true }),
      adminClient.from('course_progress').select('lesson_id').eq('contact_id', contactId).eq('course_id', courseId).not('completed_at', 'is', null),
      getCurrentProfile(),
    ]);

  const modules = modulesRes.data || [];
  const moduleIds = modules.map((m: any) => m.id);
  const { data: mqData } = moduleIds.length
    ? await adminClient.from('module_quiz_questions').select('module_id').in('module_id', moduleIds)
    : { data: [] as any[] };
  const withQuiz = new Set((mqData || []).map((q: any) => q.module_id));
  for (const m of modules) m.has_module_quiz = withQuiz.has(m.id);

  const activeModuleIds = new Set(modules.map((m: any) => m.id));
  const lessons = (lessonsRes.data || []).filter((l: any) => activeModuleIds.has(l.module_id));
  const completedLessonIds = (progressRes.data || []).map((p: any) => p.lesson_id);

  const pf = (profile?.firstName || '').trim();
  const pl = (profile?.lastName || '').trim();
  const studentName = (pf && pl && pf !== pl ? `${pf} ${pl}` : pf || pl) || null;

  return (
    <ModuleQuizShell
      course={course}
      modules={modules}
      lessons={lessons}
      completedLessonIds={completedLessonIds}
      enrollment={enrollment}
      studentName={studentName}
      activeModuleId={lesson.module_id}
    >
      <StudentQuizClient
        courseId={courseId}
        quiz={lesson}
        questions={(questionsRes.data || []).map(buildClientQuestion)}
        settings={settingsRes.data || {}}
        attemptsCount={attemptsRes.data?.length || 0}
        hasPassedRemedial={remedialRes.data?.status === 'passed'}
      />
    </ModuleQuizShell>
  );
}

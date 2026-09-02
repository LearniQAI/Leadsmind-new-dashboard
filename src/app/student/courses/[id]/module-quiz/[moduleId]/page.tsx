import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, getCurrentProfile } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { getModuleCompletionStatus } from '@/lib/lms/moduleCompletion';
import StudentQuizClient from '../../quiz/[quizId]/StudentQuizClient';
import ModuleQuizShell from './ModuleQuizShell';

interface StudentModuleQuizPageProps {
  params: { id: string; moduleId: string };
}

// Module-Level Quiz — reuses StudentQuizClient (the quiz-taking flow), now inside the real
// in-course chrome (ModuleQuizShell → the same SyllabusSidebar the lesson player uses)
// instead of the generic /student portal nav.
export default async function StudentModuleQuizPage({ params }: StudentModuleQuizPageProps) {
  const courseId = params.id;
  const moduleId = params.moduleId;
  await requireAuth();

  const adminClient = createAdminClient();

  const { data: course } = await adminClient
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
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

  const { data: courseModule } = await adminClient
    .from('course_modules')
    .select('*')
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .single();
  if (!courseModule || courseModule.is_active === false) notFound();

  // In-course sidebar data (same shape the lesson player's page.tsx builds).
  const [modulesRes, lessonsRes, progressRes, profile] = await Promise.all([
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
  const moduleIdsWithQuiz = new Set((mqData || []).map((q: any) => q.module_id));
  for (const m of modules) m.has_module_quiz = moduleIdsWithQuiz.has(m.id);

  const activeModuleIds = new Set(modules.map((m: any) => m.id));
  const lessons = (lessonsRes.data || []).filter((l: any) => activeModuleIds.has(l.module_id));
  const completedLessonIds = (progressRes.data || []).map((p: any) => p.lesson_id);

  const pf = (profile?.firstName || '').trim();
  const pl = (profile?.lastName || '').trim();
  const studentName = (pf && pl && pf !== pl ? `${pf} ${pl}` : pf || pl) || null;

  const completion = await getModuleCompletionStatus(contactId, moduleId);

  let body: React.ReactNode;

  if (!completion.allComplete) {
    body = (
      <div className="rounded-2xl border border-dash-border bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-500/15">
          <Lock size={24} />
        </div>
        <h2 className="mt-4 font-display text-[17px] font-semibold !text-dash-text">
          Complete the module first
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed !text-dash-textMuted">
          You&apos;ve completed {completion.completedLessons} of {completion.totalLessons} lessons in
          &ldquo;{courseModule.title}&rdquo;. Finish every lesson to unlock this module&apos;s quiz.
        </p>
        <Link
          href={`/student/courses/${courseId}`}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-dash-accent px-5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-dash-accent/90"
        >
          Back to course
        </Link>
      </div>
    );
  } else {
    const [questionsRes, settingsRes, attemptsRes] = await Promise.all([
      adminClient.from('module_quiz_questions').select('*').eq('module_id', moduleId).order('position', { ascending: true }),
      adminClient.from('module_quiz_settings').select('*').eq('module_id', moduleId).maybeSingle(),
      adminClient.from('module_quiz_attempts').select('id').eq('module_id', moduleId).eq('student_id', contactId),
    ]);

    body = (
      <StudentQuizClient
        courseId={courseId}
        quiz={{ id: courseModule.id, title: `${courseModule.title} Quiz` }}
        questions={questionsRes.data || []}
        settings={settingsRes.data || {}}
        attemptsCount={attemptsRes.data?.length || 0}
        hasPassedRemedial={false}
        moduleId={moduleId}
      />
    );
  }

  return (
    <ModuleQuizShell
      course={course}
      modules={modules}
      lessons={lessons}
      completedLessonIds={completedLessonIds}
      enrollment={enrollment}
      studentName={studentName}
      activeModuleId={moduleId}
    >
      {body}
    </ModuleQuizShell>
  );
}

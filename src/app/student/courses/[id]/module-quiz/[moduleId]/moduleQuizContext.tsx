import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, getCurrentProfile } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { getModuleCompletionStatus, type ModuleCompletionStatus } from '@/lib/lms/moduleCompletion';
import { attachStudentModuleQuizzes } from '@/lib/lms/moduleQuizzes';

// Shared by the module's quiz list (/module-quiz/[moduleId]) and the quiz-taking page
// (/module-quiz/[moduleId]/[quizId]): the enrolment checks, the in-course sidebar data for
// ModuleQuizShell, and the all-lessons-complete gate.
export async function loadStudentModuleQuizContext(courseId: string, moduleId: string) {
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
  await attachStudentModuleQuizzes(adminClient, modules);

  const activeModuleIds = new Set(modules.map((m: any) => m.id));
  const lessons = (lessonsRes.data || []).filter((l: any) => activeModuleIds.has(l.module_id));
  const completedLessonIds = (progressRes.data || []).map((p: any) => p.lesson_id);

  const pf = (profile?.firstName || '').trim();
  const pl = (profile?.lastName || '').trim();
  const studentName = (pf && pl && pf !== pl ? `${pf} ${pl}` : pf || pl) || null;

  const completion = await getModuleCompletionStatus(contactId, moduleId);
  const thisModule = modules.find((m: any) => m.id === moduleId);
  const quizzes: { id: string; title: string }[] = thisModule?.module_quizzes || [];

  return {
    adminClient,
    course,
    contactId,
    courseModule,
    completion,
    quizzes,
    shellProps: { course, modules, lessons, completedLessonIds, enrollment, studentName, activeModuleId: moduleId },
  };
}

export function ModuleQuizLocked({
  courseId,
  moduleTitle,
  completion,
}: {
  courseId: string;
  moduleTitle: string;
  completion: ModuleCompletionStatus;
}) {
  return (
    <div className="rounded-2xl border border-dash-border bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-500/15">
        <Lock size={24} />
      </div>
      <h2 className="mt-4 font-display text-[17px] font-semibold !text-dash-text">Complete the module first</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed !text-dash-textMuted">
        You&apos;ve completed {completion.completedLessons} of {completion.totalLessons} lessons in
        &ldquo;{moduleTitle}&rdquo;. Finish every lesson to unlock this module&apos;s quizzes.
      </p>
      <Link
        href={`/student/courses/${courseId}`}
        className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-dash-accent px-5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-dash-accent/90"
      >
        Back to course
      </Link>
    </div>
  );
}

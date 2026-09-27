import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Clock, HelpCircle } from 'lucide-react';
import ModuleQuizShell from './ModuleQuizShell';
import { loadStudentModuleQuizContext, ModuleQuizLocked } from './moduleQuizContext';

interface StudentModuleQuizzesPageProps {
  params: { id: string; moduleId: string };
}

// A module's quizzes, for a student. A module can hold several quizzes (module_quizzes); this
// page lists the ones the student can see and must pass. With exactly one it goes straight to
// that quiz, so the single-quiz experience (and every existing link here) is unchanged.
export default async function StudentModuleQuizzesPage({ params }: StudentModuleQuizzesPageProps) {
  const courseId = params.id;
  const moduleId = params.moduleId;

  const ctx = await loadStudentModuleQuizContext(courseId, moduleId);

  if (ctx.completion.allComplete && ctx.quizzes.length === 1) {
    redirect(`/student/courses/${courseId}/module-quiz/${moduleId}/${ctx.quizzes[0].id}`);
  }

  let body: React.ReactNode;
  if (!ctx.completion.allComplete) {
    body = <ModuleQuizLocked courseId={courseId} moduleTitle={ctx.courseModule.title} completion={ctx.completion} />;
  } else if (ctx.quizzes.length === 0) {
    body = (
      <div className="rounded-2xl border border-dash-border bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <h2 className="font-display text-[17px] font-semibold !text-dash-text">No quizzes in this module</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed !text-dash-textMuted">
          There&apos;s nothing to take here right now.
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
    const { data: attempts } = await ctx.adminClient
      .from('module_quiz_attempts')
      .select('quiz_id, passed, grade_status')
      .eq('student_id', ctx.contactId)
      .in('quiz_id', ctx.quizzes.map((q) => q.id));

    const statusOf = (quizId: string): 'passed' | 'pending' | 'attempted' | 'new' => {
      const rows = (attempts || []).filter((a: any) => a.quiz_id === quizId);
      if (rows.some((a: any) => a.passed)) return 'passed';
      if (rows.some((a: any) => a.grade_status === 'pending_review')) return 'pending';
      return rows.length ? 'attempted' : 'new';
    };
    const passedCount = ctx.quizzes.filter((q) => statusOf(q.id) === 'passed').length;

    body = (
      <div className="rounded-2xl border border-dash-border bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">Module quizzes</span>
        <h2 className="mt-1 font-display text-[19px] font-semibold !text-dash-text">{ctx.courseModule.title}</h2>
        <p className="mt-1 text-[12px] !text-dash-textMuted">
          Pass every quiz to complete this module &middot; {passedCount} of {ctx.quizzes.length} passed
        </p>
        <ul className="mt-5 space-y-2">
          {ctx.quizzes.map((q) => {
            const status = statusOf(q.id);
            return (
              <li key={q.id}>
                <Link
                  href={`/student/courses/${courseId}/module-quiz/${moduleId}/${q.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-dash-border px-4 py-3 transition-colors hover:bg-dash-surface"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {status === 'passed' ? (
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                    ) : status === 'pending' ? (
                      <Clock size={16} className="shrink-0 text-amber-600" />
                    ) : (
                      <HelpCircle size={16} className="shrink-0 text-sky-600" />
                    )}
                    <span className="truncate text-[13px] font-semibold !text-dash-text">{q.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] !text-dash-textMuted">
                    {status === 'passed'
                      ? 'Passed'
                      : status === 'pending'
                        ? 'Awaiting review'
                        : status === 'attempted'
                          ? 'Not passed yet'
                          : 'Not started'}
                    <ChevronRight size={14} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return <ModuleQuizShell {...ctx.shellProps}>{body}</ModuleQuizShell>;
}

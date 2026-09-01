import React from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ListChecks,
  Trophy,
  FileEdit,
  CircleCheck,
  CircleX,
  Clock3,
  MessageSquareText,
  BookOpen,
} from 'lucide-react';
import { getEnrolledCoursesWithProgress } from '@/app/actions/studentEnrollments';
import { getStudentResults } from '@/app/actions/studentResults';
import { getStudentQuizStats } from '@/app/actions/studentProgress';
import { Progress } from '@/components/ui/progress';
import { DashCard, DashEmptyState } from '@/components/dashboard-ui';

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ASSIGNMENT_STATUS: Record<
  'pending' | 'passed' | 'failed',
  { label: string; pill: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending review',
    pill: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    icon: <Clock3 />,
  },
  passed: {
    label: 'Passed',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    icon: <CircleCheck />,
  },
  failed: {
    label: 'Needs revision',
    pill: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    icon: <CircleX />,
  },
};

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dash-border pb-2.5">
      <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] !text-dash-text">
        {title}
      </h2>
      {meta && <span className="text-[12px] font-medium !text-dash-textMuted">{meta}</span>}
    </div>
  );
}

export default async function StudentResultsPage() {
  const [enrolledRes, resultsRes, quizStatsRes] = await Promise.all([
    getEnrolledCoursesWithProgress(),
    getStudentResults(),
    getStudentQuizStats(),
  ]);

  const courses = enrolledRes.data || [];
  const { quizHistory, assignments } = resultsRes.data;
  const quizStats = quizStatsRes.data;
  const completedCourses = courses.filter((c: any) => (c.progressPercentage || 0) >= 100).length;

  const stats = [
    {
      label: 'Courses completed',
      value: `${completedCourses}/${courses.length}`,
      icon: GraduationCap,
      tint: 'bg-sky-50 text-sky-600 ring-sky-500/15',
    },
    {
      label: 'Quizzes passed',
      value: quizStats.quizzesPassed,
      icon: ListChecks,
      tint: 'bg-emerald-50 text-emerald-600 ring-emerald-500/15',
    },
    {
      label: 'Avg. quiz score',
      value: `${quizStats.avgQuizScore}%`,
      icon: Trophy,
      tint: 'bg-amber-50 text-amber-600 ring-amber-500/15',
    },
    {
      label: 'Assignments submitted',
      value: assignments.length,
      icon: FileEdit,
      tint: 'bg-violet-50 text-violet-600 ring-violet-500/15',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-9">
      {/* Header */}
      <header className="space-y-3 border-b border-dash-border pb-7">
        <nav className="flex items-center gap-2 text-[12px] font-medium tracking-tight !text-dash-textMuted">
          <Link
            href="/student"
            className="inline-flex items-center gap-0.5 transition-colors hover:!text-dash-text"
          >
            <ChevronLeft size={13} /> Dashboard
          </Link>
          <span className="!text-dash-border">/</span>
          <span className="font-semibold !text-dash-text">My results</span>
        </nav>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-dash-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] !text-dash-accent">
              Student portal
            </span>
          </div>
          <h1 className="font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] !text-dash-text md:text-[36px]">
            My results
          </h1>
          <p className="text-[13px] leading-relaxed !text-dash-textMuted">
            Your progress, quiz scores, and assignment status across every course.
          </p>
        </div>
      </header>

      {/* Stat strip */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <DashCard key={s.label} padding="none" className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted">
                  {s.label}
                </span>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset ${s.tint} [&_svg]:size-4`}
                >
                  <Icon />
                </span>
              </div>
              <div className="mt-3 font-display text-[28px] font-semibold leading-none tracking-tight !text-dash-text">
                {s.value}
              </div>
            </DashCard>
          );
        })}
      </section>

      {/* Course progress */}
      <section className="space-y-4">
        <SectionHead
          title="Course progress"
          meta={courses.length > 0 ? `${courses.length} enrolled` : undefined}
        />
        {courses.length > 0 ? (
          <DashCard padding="none" interactive={false}>
            <div className="divide-y divide-dash-border">
              {courses.map((c: any) => {
                const pct = c.progressPercentage || 0;
                const done = pct >= 100;
                return (
                  <Link
                    key={c.id}
                    href={`/student/courses/${c.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-dash-surface/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[13px] font-semibold !text-dash-text">
                          {c.title}
                        </span>
                        <span className="shrink-0 text-[12px] font-semibold !text-dash-text tabular-nums">
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={pct} className="h-1.5 flex-1 bg-dash-surface" />
                        <span className="shrink-0 text-[11px] font-medium !text-dash-textMuted">
                          {c.completedLessons ?? 0}/{c.totalLessons} lessons
                        </span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                        done
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : 'bg-sky-50 text-sky-700 ring-sky-600/20'
                      }`}
                    >
                      {done ? 'Completed' : 'In progress'}
                    </span>
                    <ChevronRight size={15} className="shrink-0 !text-dash-textMuted" />
                  </Link>
                );
              })}
            </div>
          </DashCard>
        ) : (
          <DashCard padding="default" interactive={false} className="border-dashed">
            <DashEmptyState
              icon={BookOpen}
              title="No courses yet"
              description="Enrol from the catalog to start building your results."
              actionLabel="Browse catalog"
              actionHref="/student/marketplace"
            />
          </DashCard>
        )}
      </section>

      {/* Quiz history */}
      <section className="space-y-4">
        <SectionHead
          title="Quiz history"
          meta={quizHistory.length > 0 ? `${quizHistory.length} attempt${quizHistory.length === 1 ? '' : 's'}` : undefined}
        />
        {quizHistory.length > 0 ? (
          <DashCard padding="none" interactive={false}>
            <div className="divide-y divide-dash-border">
              {quizHistory.map((q) => (
                <div key={q.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset [&_svg]:size-4 ${
                      q.passed
                        ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/15'
                        : 'bg-rose-50 text-rose-500 ring-rose-500/15'
                    }`}
                  >
                    {q.passed ? <CircleCheck /> : <CircleX />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold !text-dash-text">{q.title}</div>
                    <div className="truncate text-[11.5px] !text-dash-textMuted">
                      {q.courseTitle || 'Course unavailable'} · {fmtDate(q.submittedAt)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-[15px] font-semibold !text-dash-text tabular-nums">
                      {q.scorePct}%
                    </div>
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wide ${
                        q.passed ? 'text-emerald-600' : 'text-rose-500'
                      }`}
                    >
                      {q.passed ? 'Passed' : 'Failed'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DashCard>
        ) : (
          <DashCard padding="default" interactive={false} className="border-dashed">
            <DashEmptyState
              icon={ListChecks}
              title="No quizzes taken yet"
              description="Lesson and module quiz results will appear here once you attempt one."
            />
          </DashCard>
        )}
      </section>

      {/* Assignments */}
      <section className="space-y-4">
        <SectionHead
          title="Assignments"
          meta={assignments.length > 0 ? `${assignments.length} submitted` : undefined}
        />
        {assignments.length > 0 ? (
          <DashCard padding="none" interactive={false}>
            <div className="divide-y divide-dash-border">
              {assignments.map((a) => {
                const meta = ASSIGNMENT_STATUS[a.status];
                const href = a.courseId
                  ? `/student/courses/${a.courseId}${a.lessonId ? `?lessonId=${a.lessonId}` : ''}`
                  : null;
                const Row = (
                  <>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset [&_svg]:size-4 ${meta.pill}`}
                    >
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold !text-dash-text">
                        {a.lessonTitle}
                      </div>
                      <div className="truncate text-[11.5px] !text-dash-textMuted">
                        {a.courseTitle || 'Course unavailable'} · submitted {fmtDate(a.submittedAt)}
                        {a.gradedAt ? ` · graded ${fmtDate(a.gradedAt)}` : ''}
                      </div>
                    </div>
                    {a.hasFeedback && (
                      <span className="hidden shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20 sm:inline-flex [&_svg]:size-3">
                        <MessageSquareText /> Feedback
                      </span>
                    )}
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${meta.pill}`}
                    >
                      {meta.label}
                    </span>
                    {href && <ChevronRight size={15} className="shrink-0 !text-dash-textMuted" />}
                  </>
                );
                return href ? (
                  <Link
                    key={a.id}
                    href={href}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-dash-surface/60"
                  >
                    {Row}
                  </Link>
                ) : (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                    {Row}
                  </div>
                );
              })}
            </div>
          </DashCard>
        ) : (
          <DashCard padding="default" interactive={false} className="border-dashed">
            <DashEmptyState
              icon={FileEdit}
              title="No assignments submitted yet"
              description="Assignments you submit inside a lesson will be tracked here across every course."
            />
          </DashCard>
        )}
      </section>
    </div>
  );
}

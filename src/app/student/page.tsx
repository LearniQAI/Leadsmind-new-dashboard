import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Award,
  CheckCircle2,
  ChevronRight,
  Play,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth';
import { getEnrolledCoursesWithProgress } from '@/app/actions/studentEnrollments';
import { getStudentQuizStats } from '@/app/actions/studentProgress';
import { Progress } from '@/components/ui/progress';
import { DashCard, DashButton, DashEmptyState } from '@/components/dashboard-ui';
import ContinueLearningBanner from '@/components/lms/ContinueLearningBanner';

export default async function StudentDashboardPage() {
  const profile = await getCurrentProfile();
  const enrolledRes = await getEnrolledCoursesWithProgress();
  const courses = enrolledRes.data || [];

  const totalCourses = courses.length;
  const avgProgress =
    totalCourses > 0
      ? Math.round(
          courses.reduce((acc: number, c: any) => acc + c.progressPercentage, 0) / totalCourses
        )
      : 0;

  // Combined lesson-level + module-level quiz stats for the current student, keyed on the
  // resolved contact id(s) — not the auth user id. See getStudentQuizStats for the full
  // root-cause of the two stacked bugs this replaces.
  const { data: quizStats } = await getStudentQuizStats();
  const passedQuizzes = quizStats.quizzesPassed;
  const averageScore = quizStats.avgQuizScore;

  // Name can arrive duplicated (first === last); show it once.
  const first = (profile?.firstName || '').trim();
  const last = (profile?.lastName || '').trim();
  const displayName = first && last && first !== last ? `${first} ${last}` : first || last || 'there';

  const stats = [
    {
      label: 'Enrolled courses',
      value: totalCourses,
      icon: BookOpen,
      tint: 'bg-sky-50 text-sky-600 ring-sky-500/15',
    },
    {
      label: 'Avg. progress',
      value: `${avgProgress}%`,
      icon: TrendingUp,
      tint: 'bg-violet-50 text-violet-600 ring-violet-500/15',
    },
    {
      label: 'Quizzes passed',
      value: passedQuizzes,
      icon: CheckCircle2,
      tint: 'bg-emerald-50 text-emerald-600 ring-emerald-500/15',
    },
    {
      label: 'Avg. quiz score',
      value: `${averageScore}%`,
      icon: Award,
      tint: 'bg-amber-50 text-amber-600 ring-amber-500/15',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-9">
      {/* Header */}
      <header className="flex flex-col gap-5 border-b border-dash-border pb-7 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-dash-accent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] !text-dash-accent">
              Student portal
            </span>
          </div>
          <h1 className="font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] !text-dash-text md:text-[36px]">
            Welcome back, {displayName}
          </h1>
          <p className="text-[13px] leading-relaxed !text-dash-textMuted">
            Pick up where you left off, or explore something new.
          </p>
        </div>
        <DashButton asChild variant="primary">
          <Link href="/student/marketplace">
            Explore catalog <ChevronRight size={14} />
          </Link>
        </DashButton>
      </header>

      <ContinueLearningBanner courses={courses} />

      {/* Metrics */}
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

      {/* Enrolled courses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-dash-border pb-2.5">
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] !text-dash-text">
            My courses
          </h2>
          {courses.length > 0 && (
            <span className="text-[12px] font-medium !text-dash-textMuted">
              {courses.length} enrolled
            </span>
          )}
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {courses.map((course: any) => {
              const pct = course.progressPercentage || 0;
              const done = pct >= 100;
              return (
                <DashCard
                  key={course.id}
                  padding="none"
                  className="group flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                >
                  {/* Cover */}
                  <div className="relative h-36 shrink-0 overflow-hidden border-b border-dash-border bg-dash-surface">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-dash-accent/10 to-dash-accent/5">
                        <BookOpen size={40} className="!text-dash-accent/40" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-lg border border-white/60 bg-white/90 px-2 py-0.5 text-[11px] font-semibold !text-dash-text backdrop-blur-sm">
                      {course.totalLessons} {course.totalLessons === 1 ? 'lesson' : 'lessons'}
                    </span>
                    {done && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        <GraduationCap size={11} /> Completed
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                    <div>
                      <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight !text-dash-text">
                        {course.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed !text-dash-textMuted">
                        {course.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[12px] font-medium !text-dash-textMuted">
                        <span>
                          {course.completedLessons ?? 0}/{course.totalLessons} lessons
                        </span>
                        <span className="font-semibold !text-dash-text">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5 bg-dash-surface" />
                    </div>

                    <DashButton
                      asChild
                      variant={done ? 'secondary' : 'primary'}
                      className="w-full"
                    >
                      <Link href={`/student/courses/${course.id}`}>
                        <Play size={12} className="fill-current" />
                        {done ? 'Review course' : pct > 0 ? 'Resume learning' : 'Start course'}
                      </Link>
                    </DashButton>
                  </div>
                </DashCard>
              );
            })}
          </div>
        ) : (
          <DashCard padding="default" interactive={false} className="border-dashed">
            <DashEmptyState
              icon={BookOpen}
              title="No enrolled courses yet"
              description="You're not registered in any course. Browse the catalog to find a track to start."
              actionLabel="Browse catalog"
              actionHref="/student/marketplace"
            />
          </DashCard>
        )}
      </section>
    </div>
  );
}

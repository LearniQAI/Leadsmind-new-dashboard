import React from 'react';
import Link from 'next/link';
import {
  BookOpen, Calendar, Award, CheckCircle2, ChevronRight, Play
} from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth';
import { getEnrolledCoursesWithProgress } from '@/app/actions/studentEnrollments';
import { Progress } from '@/components/ui/progress';
import { DashCard, DashButton, DashEmptyState } from '@/components/dashboard-ui';

export default async function StudentDashboardPage() {
  const profile = await getCurrentProfile();
  const enrolledRes = await getEnrolledCoursesWithProgress();
  const courses = enrolledRes.data || [];

  // Aggregated student stats
  const totalCourses = courses.length;
  const completedLessons = courses.reduce((acc: number, c: any) => acc + c.completedLessons, 0);
  const avgProgress = totalCourses > 0 
    ? Math.round(courses.reduce((acc: number, c: any) => acc + c.progressPercentage, 0) / totalCourses) 
    : 0;

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Header Welcomer banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-dash-border pb-6">
        <div>
          <h1 className="text-3xl font-space-grotesk font-black !text-dash-text tracking-tight">
            Portal <span className="!text-dash-accent">Dashboard</span>
          </h1>
          <p className="text-[13px] font-medium !text-dash-textMuted mt-1">
            Welcome back, {profile?.firstName || 'Student'} {profile?.lastName || ''}
          </p>
        </div>
        <DashButton asChild variant="primary">
          <Link href="/student/marketplace">
            Explore Catalog <ChevronRight size={14} />
          </Link>
        </DashButton>
      </div>

      {/* Metrics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashCard padding="default" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-dash-accent/10 !text-dash-accent flex items-center justify-center flex-shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="text-[28px] font-bold !text-dash-text leading-none">{totalCourses}</div>
            <div className="text-[13px] font-medium !text-dash-textMuted mt-1">Enrolled Courses</div>
          </div>
        </DashCard>

        <DashCard padding="default" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple/10 !text-purple flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-[28px] font-bold !text-dash-text leading-none">{completedLessons}</div>
            <div className="text-[13px] font-medium !text-dash-textMuted mt-1">Lessons Completed</div>
          </div>
        </DashCard>

        <DashCard padding="default" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green/10 !text-green flex items-center justify-center flex-shrink-0">
            <Award size={18} />
          </div>
          <div>
            <div className="text-[28px] font-bold !text-dash-text leading-none">{avgProgress}%</div>
            <div className="text-[13px] font-medium !text-dash-textMuted mt-1">Average Progress</div>
          </div>
        </DashCard>
      </div>

      {/* Enrolled Courses Grid */}
      <div className="space-y-5">
        <h3 className="text-sm font-bold !text-dash-text block border-b border-dash-border pb-2">
          My Enrolled Courses
        </h3>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course: any) => (
              <DashCard
                key={course.id}
                padding="none"
                className="overflow-hidden flex flex-col"
              >
                {/* Image block preview */}
                <div className="h-40 relative bg-dash-surface border-b border-dash-border shrink-0 flex items-center justify-center overflow-hidden">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-dash-accent/10 flex items-center justify-center">
                      <BookOpen size={48} className="!text-dash-accent/40" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold !text-dash-text border border-dash-border">
                    {course.totalLessons} {course.totalLessons === 1 ? 'Lesson' : 'Lessons'}
                  </div>
                </div>

                {/* Info and Progress */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-base font-bold !text-dash-text tracking-tight line-clamp-1">{course.title}</h4>
                    <p className="text-xs !text-dash-textMuted line-clamp-2 mt-1.5 leading-relaxed">{course.description}</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-[12px] font-medium !text-dash-textMuted">
                      <span>Progress</span>
                      <span className="font-bold !text-dash-text">{course.progressPercentage}%</span>
                    </div>
                    <Progress value={course.progressPercentage} className="h-2 bg-dash-surface" />
                  </div>

                  <div className="pt-2">
                    <DashButton asChild variant="secondary" className="w-full">
                      <Link href={`/student/courses/${course.id}`}>
                        <Play size={12} className="fill-current" /> Resume Learning
                      </Link>
                    </DashButton>
                  </div>
                </div>
              </DashCard>
            ))}
          </div>
        ) : (
          <DashCard padding="default" interactive={false} className="border-dashed">
            <DashEmptyState
              icon={BookOpen}
              title="No enrolled courses"
              description="You are not registered in any course yet. Visit the catalog to explore available training tracks."
              actionLabel="Browse course catalog"
              actionHref="/student/marketplace"
            />
          </DashCard>
        )}
      </div>
    </div>
  );
}

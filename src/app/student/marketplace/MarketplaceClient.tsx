'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronRight,
  CheckCircle2,
  ShoppingBag,
  Loader2,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { enrollStudent } from '@/app/actions/studentEnrollments';
import { DashCard } from '@/components/dashboard-ui';

interface MarketplaceClientProps {
  courses: any[];
  enrolledCourseIds: string[];
  userRole?: string | null;
  activeWorkspaceId?: string | null;
}

export default function MarketplaceClient({
  courses,
  enrolledCourseIds,
  userRole,
  activeWorkspaceId,
}: MarketplaceClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingCourseId, setLoadingCourseId] = useState<string | null>(null);

  const handleEnroll = (courseId: string) => {
    setLoadingCourseId(courseId);
    startTransition(async () => {
      try {
        const res = await enrollStudent(courseId);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('Successfully enrolled in course!');
          router.push(`/student/courses/${courseId}`);
        }
      } catch {
        toast.error('Failed to enroll in course');
      } finally {
        setLoadingCourseId(null);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course: any) => {
        const isEnrolled = enrolledCourseIds.includes(course.id);
        const isLoading = loadingCourseId === course.id && isPending;
        const isCourseAdmin = userRole === 'admin' && course.workspace_id === activeWorkspaceId;
        const isFree = !(course.price > 0);

        return (
          <DashCard
            key={course.id}
            padding="none"
            className="group flex h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
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
              <span
                className={`absolute bottom-3 right-3 rounded-lg border px-2 py-0.5 text-[11px] font-bold backdrop-blur-sm ${
                  isFree
                    ? 'border-emerald-500/20 bg-emerald-50/90 text-emerald-700'
                    : 'border-white/60 bg-white/90 !text-dash-text'
                }`}
              >
                {isFree ? 'FREE' : `$${course.price}`}
              </span>
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col justify-between gap-4 p-5">
              <div>
                <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight !text-dash-text">
                  {course.title}
                </h3>
                <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed !text-dash-textMuted">
                  {course.description || 'No description provided.'}
                </p>
              </div>

              {isCourseAdmin ? (
                <button
                  onClick={() => router.push(`/courses/${course.id}`)}
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dash-border bg-white text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface [&_svg]:size-3.5"
                >
                  <Settings className="!text-dash-accent" /> Manage course
                </button>
              ) : isEnrolled ? (
                <button
                  onClick={() => router.push(`/student/courses/${course.id}`)}
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 [&_svg]:size-3.5"
                >
                  <CheckCircle2 /> Enrolled — open
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (course.price > 0) {
                      router.push(`/student/checkout/${course.id}`);
                    } else {
                      handleEnroll(course.id);
                    }
                  }}
                  disabled={isLoading}
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-dash-accent text-[12px] font-semibold text-white transition-colors hover:bg-dash-accent/90 disabled:opacity-60 [&_svg]:size-3.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" /> Enrolling…
                    </>
                  ) : course.price > 0 ? (
                    <>
                      <ShoppingBag /> Buy &amp; enrol
                    </>
                  ) : (
                    <>
                      Enrol now <ChevronRight />
                    </>
                  )}
                </button>
              )}
            </div>
          </DashCard>
        );
      })}
    </div>
  );
}

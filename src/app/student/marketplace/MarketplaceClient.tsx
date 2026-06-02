'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, ChevronRight, CheckCircle2, ShoppingBag, Loader2, Settings 
} from 'lucide-react';
import { toast } from 'sonner';
import { enrollStudent } from '@/app/actions/studentEnrollments';

interface MarketplaceClientProps {
  courses: any[];
  enrolledCourseIds: string[];
  userRole?: string | null;
  activeWorkspaceId?: string | null;
}

export default function MarketplaceClient({ courses, enrolledCourseIds, userRole, activeWorkspaceId }: MarketplaceClientProps) {
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
          toast.success("Successfully enrolled in course!");
          router.push(`/student/courses/${courseId}`);
        }
      } catch {
        toast.error("Failed to enroll in course");
      } finally {
        setLoadingCourseId(null);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course: any) => {
        const isEnrolled = enrolledCourseIds.includes(course.id);
        const isLoading = loadingCourseId === course.id && isPending;
        const isCourseAdmin = userRole === 'admin' && course.workspace_id === activeWorkspaceId;

        return (
          <div 
            key={course.id}
            className="bg-[#080f28] border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col h-full"
          >
            {/* Thumbnail */}
            <div className="h-44 relative bg-gradient-to-br from-indigo-950 to-slate-900 border-b border-white/5 shrink-0 flex items-center justify-center overflow-hidden">
              {course.thumbnail_url ? (
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 flex items-center justify-center">
                  <BookOpen size={40} className="text-white/25" />
                </div>
              )}
              {/* Price card */}
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-emerald-400 border border-emerald-500/10">
                {course.price > 0 ? `$${course.price}` : 'FREE'}
              </div>
            </div>

            {/* Course Info */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white tracking-tight leading-snug line-clamp-1">{course.title}</h4>
                <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{course.description || "No description provided."}</p>
              </div>

              <div className="pt-2">
                {isCourseAdmin ? (
                  <button 
                    onClick={() => router.push(`/courses/${course.id}`)}
                    className="w-full bg-[#111d47] border border-white/10 hover:bg-[#1a2d6c] text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Settings size={13} className="text-primary" /> Manage Course (Admin)
                  </button>
                ) : isEnrolled ? (
                  <button 
                    onClick={() => router.push(`/student/courses/${course.id}`)}
                    className="w-full bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 size={13} className="text-emerald-400" /> Already Enrolled
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
                    className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-lg shadow-primary/15"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Registering...
                      </>
                    ) : course.price > 0 ? (
                      <>
                        <ShoppingBag size={13} /> Buy & Register
                      </>
                    ) : (
                      <>
                        Enroll Now <ChevronRight size={13} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

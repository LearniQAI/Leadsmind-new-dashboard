import React from 'react';
import Link from 'next/link';
import { 
  BookOpen, Calendar, Award, CheckCircle2, ChevronRight, Play 
} from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth';
import { getEnrolledCoursesWithProgress } from '@/app/actions/studentEnrollments';
import { Progress } from '@/components/ui/progress';

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-space-grotesk font-black uppercase text-white tracking-tight">
            Portal <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-1">
            Welcome back, {profile?.firstName || 'Student'} {profile?.lastName || ''}
          </p>
        </div>
        <Link 
          href="/student/marketplace" 
          className="bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-6 shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          Explore Catalog <ChevronRight size={14} />
        </Link>
      </div>

      {/* Metrics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#080f28] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Enrolled Courses</span>
            <span className="text-2xl font-space-grotesk font-black text-white block mt-0.5">{totalCourses}</span>
          </div>
        </div>

        <div className="bg-[#080f28] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Lessons Completed</span>
            <span className="text-2xl font-space-grotesk font-black text-white block mt-0.5">{completedLessons}</span>
          </div>
        </div>

        <div className="bg-[#080f28] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Award size={20} />
          </div>
          <div>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Average Progress</span>
            <span className="text-2xl font-space-grotesk font-black text-white block mt-0.5">{avgProgress}%</span>
          </div>
        </div>
      </div>

      {/* Enrolled Courses Grid */}
      <div className="space-y-5">
        <h3 className="text-xs font-black uppercase text-white tracking-widest block border-b border-white/5 pb-2">
          My Enrolled Courses
        </h3>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course: any) => (
              <div 
                key={course.id}
                className="bg-[#080f28] border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all hover:-translate-y-0.5 duration-300 flex flex-col"
              >
                {/* Image block preview */}
                <div className="h-40 relative bg-gradient-to-br from-indigo-950 to-slate-900 border-b border-white/5 shrink-0 flex items-center justify-center overflow-hidden">
                  {course.thumbnail_url ? (
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
                      <BookOpen size={48} className="text-white/20" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider text-white border border-white/5">
                    {course.totalLessons} {course.totalLessons === 1 ? 'Lesson' : 'Lessons'}
                  </div>
                </div>

                {/* Info and Progress */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight line-clamp-1">{course.title}</h4>
                    <p className="text-xs text-white/50 line-clamp-2 mt-1.5 leading-relaxed">{course.description}</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-[10px] font-mono text-white/40 uppercase tracking-widest">
                      <span>Progress</span>
                      <span className="font-bold text-white">{course.progressPercentage}%</span>
                    </div>
                    <Progress value={course.progressPercentage} className="h-2 bg-[#04091a]" />
                  </div>

                  <div className="pt-2">
                    <Link 
                      href={`/student/courses/${course.id}`}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Play size={12} className="fill-current text-white" /> Resume Learning
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#080f28] rounded-2xl border border-dashed border-white/5 space-y-4">
            <div className="w-16 h-16 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center mx-auto text-white/30">
              <BookOpen size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">No Enrolled Courses</h4>
              <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
                You are not registered in any course yet. Visit the catalog to explore available training tracks.
              </p>
            </div>
            <Link 
              href="/student/marketplace" 
              className="bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-6 inline-flex items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-95 mt-2"
            >
              Browse Course Catalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

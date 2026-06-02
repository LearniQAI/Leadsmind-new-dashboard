import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { getCompletedLessons } from '@/app/actions/studentProgress';
import StudentPlayerClient from './StudentPlayerClient';

interface StudentCoursePlayerPageProps {
  params: {
    id: string;
  };
}

export default async function StudentCoursePlayerPage({ params }: StudentCoursePlayerPageProps) {
  const courseId = params.id;
  const user = await requireAuth();

  const adminClient = createAdminClient();

  // 1. Fetch course details using admin client to bypass RLS
  const { data: course } = await adminClient
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (!course) {
    notFound();
  }

  // 2. Fetch student contact and enrollment using admin client to bypass RLS
  const contactId = await getOrCreateStudentContact(course.workspace_id);
  if (!contactId) {
    redirect('/student/marketplace');
  }

  const { data: enrollment } = await adminClient
    .from('enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('contact_id', contactId)
    .maybeSingle();

  // Redirect to marketplace if not registered
  if (!enrollment) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-[#080f28] border border-white/5 p-8 rounded-2xl text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={30} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-space-grotesk font-black uppercase text-white tracking-wider">Access Restricted</h3>
          <p className="text-xs text-white/50 leading-relaxed">
            You are not registered in the course: <strong className="text-white">"{course.title}"</strong>. Please enroll in the course via the catalog before starting.
          </p>
        </div>
        <Link 
          href="/student/marketplace"
          className="bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-8 inline-flex items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-95 w-full"
        >
          View Marketplace Catalog
        </Link>
      </div>
    );
  }

  // 3. Fetch modules and lessons using admin client to bypass RLS
  const [modulesRes, lessonsRes, progressRes] = await Promise.all([
    adminClient.from('course_modules').select('*').eq('course_id', courseId).order('position', { ascending: true }),
    adminClient.from('course_lessons').select('*').eq('course_id', courseId).order('position', { ascending: true }),
    getCompletedLessons(courseId)
  ]);

  const modules = modulesRes.data || [];
  const lessons = lessonsRes.data || [];
  const completedLessonIds = progressRes.data || [];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Back to Dashboard bar */}
      <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono uppercase tracking-widest shrink-0">
        <Link href="/student" className="hover:text-white transition-all flex items-center gap-0.5">
          <ChevronLeft size={12} /> Dashboard
        </Link>
        <span>/</span>
        <span className="text-white/60">{course.title}</span>
      </div>

      <StudentPlayerClient 
        course={course}
        modules={modules}
        lessons={lessons}
        initialCompletedLessonIds={completedLessonIds}
        enrollment={enrollment}
      />
    </div>
  );
}

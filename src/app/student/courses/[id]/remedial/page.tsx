import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { generateRemedialAssignment } from '../../../../../../libs/services/src/ai/remedial-prompter';
import RemedialClient from './RemedialClient';
import { logger } from '@/shared/logger';

interface RemedialPageProps {
  params: {
    id: string; // courseId
  };
  searchParams: {
    lessonId?: string;
  };
}

export default async function RemedialPage({ params, searchParams }: RemedialPageProps) {
  const courseId = params.id;
  const lessonId = searchParams.lessonId;

  if (!lessonId) {
    redirect(`/student/courses/${courseId}`);
  }

  const user = await requireAuth();
  const adminClient = createAdminClient();

  // 1. Fetch course details
  const { data: course } = await adminClient
    .from('courses')
    .select('id, title, workspace_id')
    .eq('id', courseId)
    .single();

  if (!course) {
    notFound();
  }

  // 2. Fetch student contact and enrollment
  const contactId = await getOrCreateStudentContact(course.workspace_id);
  if (!contactId) {
    redirect('/student/marketplace');
  }

  const { data: enrollment } = await adminClient
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('contact_id', contactId)
    .maybeSingle();

  if (!enrollment) {
    redirect(`/student/courses/${courseId}`);
  }

  // 3. Fetch lesson to verify it exists
  const { data: lesson } = await adminClient
    .from('course_lessons')
    .select('id, title')
    .eq('id', lessonId)
    .single();

  if (!lesson) {
    notFound();
  }

  // 4. Query existing remedial assignment
  let { data: assignment } = await adminClient
    .from('lms_remedial_assignments')
    .select('*')
    .eq('enrollment_id', enrollment.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  // If none exists, trigger AI generation immediately
  if (!assignment) {
    logger.info({ courseId, lessonId }, 'remedial_page.assignment.generating');
    const result = await generateRemedialAssignment(contactId, courseId, lessonId, enrollment.id);
    if (result.success && result.assignment) {
      assignment = result.assignment;
    } else {
      throw new Error(result.error || 'Failed to generate remedial assignment');
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8 text-white min-h-[calc(100vh-80px)] font-body">
      <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono uppercase tracking-widest">
        <Link href={`/student/courses/${courseId}`} className="hover:text-white transition-all flex items-center gap-0.5">
          <ChevronLeft size={12} /> Back to Course Player
        </Link>
      </div>

      <RemedialClient
        course={course}
        lesson={lesson}
        assignment={assignment}
      />
    </div>
  );
}

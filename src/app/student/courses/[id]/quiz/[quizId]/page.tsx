import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import StudentQuizClient from './StudentQuizClient';

interface StudentQuizPageProps {
  params: {
    id: string;      // courseId
    quizId: string;  // quizId
  };
}

export default async function StudentQuizPage({ params }: StudentQuizPageProps) {
  const courseId = params.id;
  const quizId = params.quizId;
  const user = await requireAuth();

  const adminClient = createAdminClient();

  // 1. Fetch course details using admin client to bypass RLS
  const { data: course } = await adminClient
    .from('courses')
    .select('id, workspace_id')
    .eq('id', courseId)
    .single();

  if (!course) {
    notFound();
  }

  // 2. Fetch student contact and verify enrollment using admin client to bypass RLS
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

  // 3. Fetch quiz lesson nodes using admin client to bypass RLS
  const { data: lesson } = await adminClient
    .from('course_lessons')
    .select('*')
    .eq('id', quizId)
    .single();

  if (!lesson || lesson.lesson_type !== 'quiz') {
    notFound();
  }

  // 4. Fetch questions, settings, attempts, and remedial status using admin client to bypass RLS
  const [questionsRes, settingsRes, attemptsRes, remedialRes] = await Promise.all([
    adminClient.from('quiz_questions').select('*').eq('lesson_id', quizId).order('position', { ascending: true }),
    adminClient.from('quiz_settings').select('*').eq('lesson_id', quizId).maybeSingle(),
    adminClient.from('quiz_attempts').select('id').eq('lesson_id', quizId).eq('student_id', contactId),
    adminClient.from('lms_remedial_assignments').select('status').eq('enrollment_id', enrollment.id).eq('lesson_id', quizId).maybeSingle()
  ]);

  const questions = questionsRes.data || [];
  const settings = settingsRes.data || {};
  const attemptsCount = attemptsRes.data?.length || 0;
  const hasPassedRemedial = remedialRes.data?.status === 'passed';

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Back to course viewer bar */}
      <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono uppercase tracking-widest">
        <Link href={`/student/courses/${courseId}`} className="hover:text-white transition-all flex items-center gap-0.5">
          <ChevronLeft size={12} /> Back to Course Player
        </Link>
      </div>

      <StudentQuizClient
        courseId={courseId}
        quiz={lesson}
        questions={questions}
        settings={settings}
        attemptsCount={attemptsCount}
        hasPassedRemedial={hasPassedRemedial}
      />
    </div>
  );
}

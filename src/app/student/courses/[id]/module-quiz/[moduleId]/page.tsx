import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Lock } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { getModuleCompletionStatus } from '@/lib/lms/moduleCompletion';
import StudentQuizClient from '../../quiz/[quizId]/StudentQuizClient';

interface StudentModuleQuizPageProps {
  params: {
    id: string;       // courseId
    moduleId: string;
  };
}

// Module-Level Quiz — the module-scoped counterpart to
// /student/courses/[id]/quiz/[quizId]/page.tsx, reusing the exact same StudentQuizClient
// (Step 3: reuse the existing quiz-taking flow) via its moduleId prop.
export default async function StudentModuleQuizPage({ params }: StudentModuleQuizPageProps) {
  const courseId = params.id;
  const moduleId = params.moduleId;
  const user = await requireAuth();

  const adminClient = createAdminClient();

  const { data: course } = await adminClient
    .from('courses')
    .select('id, workspace_id')
    .eq('id', courseId)
    .single();

  if (!course) {
    notFound();
  }

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

  const { data: courseModule } = await adminClient
    .from('course_modules')
    .select('*')
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .single();

  if (!courseModule || courseModule.is_active === false) {
    notFound();
  }

  // Step 3 access-timing decision, enforced here (not just in the submit action) so a
  // student sees a real, explanatory screen instead of an empty/broken quiz.
  const completion = await getModuleCompletionStatus(contactId, moduleId);

  const backBar = (
    <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono uppercase tracking-widest">
      <Link href={`/student/courses/${courseId}`} className="hover:text-white transition-all flex items-center gap-0.5">
        <ChevronLeft size={12} /> Back to Course Player
      </Link>
    </div>
  );

  if (!completion.allComplete) {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        {backBar}
        <div className="bg-[#080f28] border border-white/5 p-8 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Lock size={28} />
          </div>
          <h2 className="text-lg font-space-grotesk font-black uppercase text-white tracking-tight">
            Complete the module first
          </h2>
          <p className="text-xs text-white/50 leading-relaxed">
            You've completed {completion.completedLessons} of {completion.totalLessons} lessons in
            "{courseModule.title}". Finish every lesson to unlock this module's quiz.
          </p>
          <Link
            href={`/student/courses/${courseId}`}
            className="inline-flex items-center justify-center w-full bg-primary hover:bg-primary/95 text-white h-11 rounded-xl uppercase tracking-wider text-[10px] font-black"
          >
            Back to Course Player
          </Link>
        </div>
      </div>
    );
  }

  const [questionsRes, settingsRes, attemptsRes] = await Promise.all([
    adminClient.from('module_quiz_questions').select('*').eq('module_id', moduleId).order('position', { ascending: true }),
    adminClient.from('module_quiz_settings').select('*').eq('module_id', moduleId).maybeSingle(),
    adminClient.from('module_quiz_attempts').select('id').eq('module_id', moduleId).eq('student_id', contactId),
  ]);

  const questions = questionsRes.data || [];
  const settings = settingsRes.data || {};
  const attemptsCount = attemptsRes.data?.length || 0;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {backBar}

      <StudentQuizClient
        courseId={courseId}
        quiz={{ id: courseModule.id, title: `${courseModule.title} Quiz` }}
        questions={questions}
        settings={settings}
        attemptsCount={attemptsCount}
        hasPassedRemedial={false}
        moduleId={moduleId}
      />
    </div>
  );
}

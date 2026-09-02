import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, getCurrentProfile } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { getCompletedLessons } from '@/app/actions/studentProgress';
import { isEnrolmentActive } from '@/lib/lms/enrolment';
import StudentPlayerClient from './StudentPlayerClient';
import { flattenLessonCanvas } from '@/lib/lms/flattenLessonCanvas';

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

  // Access gate — content is served ONLY to a currently-active enrolment. A row that exists
  // but has been deactivated by an admin (active:false / status:'inactive' etc.) must not
  // open the player: previously this check was just `if (!enrollment)`, so a deactivated
  // student kept full read access to every lesson via the URL while showing as "removed" in
  // the admin roster. isEnrolmentActive() is the same predicate the mark-complete action uses.
  if (!enrollment || !isEnrolmentActive(enrollment)) {
    const wasEnrolled = !!enrollment;
    return (
      <div className="mx-auto mt-24 max-w-md rounded-2xl border border-dash-border bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-inset ring-rose-500/15">
          <ShieldAlert size={26} />
        </div>
        <h3 className="mt-4 font-display text-[16px] font-semibold !text-dash-text">
          {wasEnrolled ? 'Access paused' : 'Not enrolled'}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed !text-dash-textMuted">
          {wasEnrolled ? (
            <>Your enrolment in <strong className="!text-dash-text">{course.title}</strong> is no longer active. Contact the course team if you think this is a mistake.</>
          ) : (
            <>You're not enrolled in <strong className="!text-dash-text">{course.title}</strong>. Enrol from the catalog to start.</>
          )}
        </p>
        <Link
          href="/student/marketplace"
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-dash-accent px-6 text-[13px] font-semibold text-white transition-colors hover:bg-dash-accent/90"
        >
          Browse catalog
        </Link>
      </div>
    );
  }

  // 3. Fetch modules and lessons using admin client to bypass RLS
  const [modulesRes, lessonsRes, progressRes] = await Promise.all([
    adminClient.from('course_modules').select('*').eq('course_id', courseId).eq('is_active', true).order('position', { ascending: true }),
    adminClient.from('course_lessons').select('*').eq('course_id', courseId).eq('is_active', true).order('position', { ascending: true }),
    getCompletedLessons(courseId)
  ]);

  const modules = modulesRes.data || [];

  // Flag which modules actually have a module-level quiz configured (>= 1 real question) so
  // the syllabus sidebar can show an entry point only for those — the module-quiz route
  // (/student/courses/[id]/module-quiz/[moduleId]) is otherwise reachable by URL only.
  // Matches the module-quiz page's own behaviour: it renders from module_quiz_questions and
  // treats a missing module_quiz_settings row as defaults, so questions are the real signal.
  const moduleIds = modules.map((m) => m.id);
  const { data: moduleQuizQ } = moduleIds.length
    ? await adminClient.from('module_quiz_questions').select('module_id').in('module_id', moduleIds)
    : { data: [] as any[] };
  const modulesWithQuiz = new Set((moduleQuizQ || []).map((r: any) => r.module_id));
  for (const m of modules) m.has_module_quiz = modulesWithQuiz.has(m.id);

  const activeModuleIds = new Set(modules.map((m) => m.id));
  // A lesson can be individually active but its parent module deactivated — exclude those too,
  // otherwise the lesson (and its content_blocks below) would still ship to the client even
  // though its module never renders, defeating the point of deactivation.
  const lessons = (lessonsRes.data || []).filter((l) => activeModuleIds.has(l.module_id));
  const completedLessonIds = progressRes.data || [];

  // 4. Attach ordered content_blocks per lesson (PRD Section 4 block system).
  const lessonIds = lessons.map((l) => l.id);
  const { data: contentBlocksData } = lessonIds.length
    ? await adminClient
        .from('content_blocks')
        .select('*')
        .in('lesson_id', lessonIds)
        .order('position', { ascending: true })
    : { data: [] as any[] };

  const blocksByLesson = new Map<string, any[]>();
  for (const block of contentBlocksData || []) {
    const list = blocksByLesson.get(block.lesson_id) || [];
    list.push(block);
    blocksByLesson.set(block.lesson_id, list);
  }

  // 5. Canvas Lesson Builder content lives in `pages.content` (linked by course_lesson_id),
  // NOT in content_blocks. Flatten each lesson's tree to an ordered render list so the
  // student sees the real authored lesson instead of only legacy/orphan content_blocks rows.
  const { data: lessonPages } = lessonIds.length
    ? await adminClient
        .from('pages')
        .select('course_lesson_id, content')
        .in('course_lesson_id', lessonIds)
    : { data: [] as any[] };

  const canvasByLesson = new Map<string, ReturnType<typeof flattenLessonCanvas>>();
  for (const pg of lessonPages || []) {
    if (!pg.course_lesson_id) continue;
    const items = flattenLessonCanvas(pg.content);
    if (items.length > 0) canvasByLesson.set(pg.course_lesson_id, items);
  }

  const lessonsWithBlocks = lessons.map((l) => ({
    ...l,
    contentBlocks: blocksByLesson.get(l.id) || [],
    canvasItems: canvasByLesson.get(l.id) || null,
  }));

  // Real logged-in student name — same resolution as the main dashboard greeting.
  const profile = await getCurrentProfile();
  const pf = (profile?.firstName || '').trim();
  const pl = (profile?.lastName || '').trim();
  const studentName = (pf && pl && pf !== pl ? `${pf} ${pl}` : pf || pl) || null;

  return (
    <StudentPlayerClient
      course={course}
      modules={modules}
      lessons={lessonsWithBlocks}
      initialCompletedLessonIds={completedLessonIds}
      enrollment={enrollment}
      studentName={studentName}
    />
  );
}

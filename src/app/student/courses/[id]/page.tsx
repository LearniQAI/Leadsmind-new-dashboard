import { orderCourseLessons, resolveContinueLearning } from '@/lib/lms/continueLearning';
import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser, getCurrentProfile } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { getCompletedLessons } from '@/app/actions/studentProgress';
import { isEnrolmentActive } from '@/lib/lms/enrolment';
import { attachStudentModuleQuizzes } from '@/lib/lms/moduleQuizzes';
import StudentPlayerClient from './StudentPlayerClient';
import PreviewLessonClient from '@/components/lms/PreviewLessonClient';
import { resolveCoursePreview } from '@/lib/lms/resolveCoursePreview';
import { flattenLessonCanvas } from '@/lib/lms/flattenLessonCanvas';

interface StudentCoursePlayerPageProps {
  params: {
    id: string;
  };
  searchParams: {
    lessonId?: string;
  };
}

export default async function StudentCoursePlayerPage({ params, searchParams }: StudentCoursePlayerPageProps) {
  const courseId = params.id;
  // requireAuth() -> getUser() (nullable). This route still lives under student/layout.tsx,
  // which hard-gates on requireAuth(), so a genuinely anonymous visitor never actually
  // reaches here — they're sent to /preview/courses/[id] (its own route, its own gate). This
  // getUser() nullability matters for the belt-and-braces redirect just below and so the
  // logged-in-but-not-enrolled branch can render the real Method 3 preview/paywall inline.
  const user = await getUser();
  if (!user) {
    const qs = searchParams.lessonId ? `?lessonId=${searchParams.lessonId}` : '';
    redirect(`/preview/courses/${courseId}${qs}`);
  }

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

  // 2. Fetch student contact and enrollment using admin client to bypass RLS. Both are
  // null for a genuinely anonymous visitor — getOrCreateStudentContact() already returns
  // null when there's no signed-in user (see studentEnrollments.ts), so this never creates a
  // contact for someone just previewing.
  const contactId = user ? await getOrCreateStudentContact(course.workspace_id) : null;

  const { data: enrollment } = contactId
    ? await adminClient
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('contact_id', contactId)
        .maybeSingle()
    : { data: null as any };

  // Access gate — content is served ONLY to a currently-active enrolment. A row that exists
  // but has been deactivated by an admin (active:false / status:'inactive' etc.) must not
  // open the player: previously this check was just `if (!enrollment)`, so a deactivated
  // student kept full read access to every lesson via the URL while showing as "removed" in
  // the admin roster. isEnrolmentActive() is the same predicate the mark-complete action uses.
  const wasEnrolled = !!enrollment;
  const hasAccess = wasEnrolled && isEnrolmentActive(enrollment);

  if (!hasAccess) {
    // A REAL enrollment that exists but is deactivated (cancelled/suspended/pending_approval/
    // etc.) is a genuinely different state from "never enrolled" — keep this exact existing
    // card, unchanged, rather than folding it into the new preview/paywall branch below.
    if (wasEnrolled) {
      return (
        <div className="mx-auto mt-24 max-w-md rounded-2xl border border-dash-border bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-inset ring-rose-500/15">
            <ShieldAlert size={26} />
          </div>
          <h3 className="mt-4 font-display text-[16px] font-semibold !text-dash-text">Access paused</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed !text-dash-textMuted">
            Your enrolment in <strong className="!text-dash-text">{course.title}</strong> is no longer active. Contact the course team if you think this is a mistake.
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

    // Signed in, but no active enrollment for this course — Course Start Method 3: the same
    // real read-only preview / real paywall an anonymous visitor gets at /preview/courses/[id],
    // rendered inline here since this viewer is authenticated (student/layout.tsx is happy).
    // resolveCoursePreview() fetches ONLY the one requested lesson's content, and ONLY when
    // it's genuinely is_preview. No progress/completion/contact write happens on this branch.
    const previewRes = await resolveCoursePreview(courseId, searchParams.lessonId);
    if (!previewRes) notFound();
    return (
      <PreviewLessonClient
        course={previewRes.course}
        modules={previewRes.modules}
        lessons={previewRes.lessons}
        activeLesson={previewRes.activeLesson}
        pricing={previewRes.pricing}
        isSignedIn
      />
    );
  }

  // 3. Fetch modules and lessons using admin client to bypass RLS
  const [modulesRes, lessonsRes, progressRes] = await Promise.all([
    adminClient.from('course_modules').select('*').eq('course_id', courseId).eq('is_active', true).in('publish_status', ['published', 'coming_soon']).order('position', { ascending: true }),
    adminClient.from('course_lessons').select('*').eq('course_id', courseId).eq('is_active', true).order('position', { ascending: true }),
    getCompletedLessons(courseId)
  ]);

  // Students only see PUBLISHED (and locked coming_soon) modules — DRAFT and INACTIVE are hidden (studentVisibility.ts).
  const modules = modulesRes.data || [];

  // Attach each module's student-visible quizzes (published, with questions) so the syllabus
  // sidebar lists one entry per quiz and the player knows whether a module has any.
  await attachStudentModuleQuizzes(adminClient, modules);

  const activeModuleIds = new Set(modules.map((m) => m.id));
  // A lesson can be individually active but its parent module deactivated — exclude those too,
  // otherwise the lesson (and its content_blocks below) would still ship to the client even
  // though its module never renders, defeating the point of deactivation.
  // Course order is module.position THEN lesson.position: lesson positions restart in every module,
  // so ordering by lesson.position alone (the query above) interleaves modules in "Next lesson".
  const lessons = orderCourseLessons(modules, (lessonsRes.data || []).filter((l) => activeModuleIds.has(l.module_id))).map((o) => o.lesson);
  const completedLessonIds = progressRes.data || [];
  // Where to open: the in-progress lesson if there is one, else the first incomplete in current order.
  const resolution = resolveContinueLearning({
    modules,
    lessons,
    completedLessonIds,
    lastLessonId: enrollment?.last_lesson_id,
  });

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
      initialLessonId={resolution.target?.lessonId ?? null}
      enrollment={enrollment}
      studentName={studentName}
    />
  );
}

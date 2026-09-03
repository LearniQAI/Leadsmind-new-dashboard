import { createAdminClient } from '@/lib/supabase/server';
import { flattenLessonCanvas } from '@/lib/lms/flattenLessonCanvas';
import { getPricingView } from '@/components/courses/landing-pages/landingHelpers';

// Course Start Method 3 (free preview lessons, then paywall) — shared resolver for the
// "no active enrollment" render, used by BOTH:
//   - the anonymous preview route (/preview/courses/[id])
//   - the authenticated player page's not-enrolled branch (student/courses/[id])
// It fetches ONLY the one requested lesson's real content, and ONLY when that lesson is
// genuinely is_preview — a paid lesson's content never leaves the server for a viewer with
// no access. Everything it returns is safe to hand to PreviewLessonClient.

export interface CoursePreviewResolution {
  course: any;
  modules: { id: string; title: string; position: number | null }[];
  lessons: { id: string; title: string; module_id: string; position: number | null; is_preview: boolean }[];
  activeLesson: any | null; // full content when previewable; null => render the paywall
  pricing: ReturnType<typeof getPricingView>;
}

export async function resolveCoursePreview(
  courseId: string,
  requestedLessonId?: string
): Promise<CoursePreviewResolution | null> {
  const adminClient = createAdminClient();

  const { data: course } = await adminClient.from('courses').select('*').eq('id', courseId).maybeSingle();
  if (!course) return null;

  const [{ data: lessonMeta }, { data: moduleMeta }] = await Promise.all([
    adminClient
      .from('course_lessons')
      .select('id, title, module_id, position, is_preview')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('position', { ascending: true }),
    adminClient
      .from('course_modules')
      .select('id, title, position')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('position', { ascending: true }),
  ]);

  const lessons = lessonMeta || [];
  const modules = moduleMeta || [];
  const requestedLesson = requestedLessonId
    ? lessons.find((l: any) => l.id === requestedLessonId)
    : lessons.find((l: any) => l.is_preview) || lessons[0];

  let activeLesson: any | null = null;
  if (requestedLesson?.is_preview) {
    const [{ data: contentBlocksData }, { data: lessonPages }] = await Promise.all([
      adminClient
        .from('content_blocks')
        .select('*')
        .eq('lesson_id', requestedLesson.id)
        .order('position', { ascending: true }),
      adminClient.from('pages').select('content').eq('course_lesson_id', requestedLesson.id).maybeSingle(),
    ]);
    const canvasItems = lessonPages?.content ? flattenLessonCanvas(lessonPages.content) : [];
    activeLesson = {
      ...requestedLesson,
      contentBlocks: contentBlocksData || [],
      canvasItems: canvasItems.length > 0 ? canvasItems : null,
    };
  }

  return { course, modules, lessons, activeLesson, pricing: getPricingView(course) };
}

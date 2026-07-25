import { NextRequest, NextResponse } from 'next/server';
import { getCompletedLessons, markLessonComplete, markLessonIncomplete } from '@/app/actions/studentProgress';

export const dynamic = 'force-dynamic';

// This route used to duplicate its own contact-resolution and course_progress upsert/delete
// logic against a hardcoded service-role client, with no enrollment check and no quiz-pass
// validation — a separate path to the same fake-completion/fake-certificate outcome already
// fixed for markLessonComplete(). It now delegates to the canonical studentProgress.ts actions
// (which contain that validation) instead of duplicating them, so there's one implementation of
// "mark a lesson complete," not two that can drift out of sync.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) {
    return NextResponse.json({ error: 'Missing courseId parameter' }, { status: 400 });
  }

  const result = await getCompletedLessons(courseId);
  if ('error' in result && result.error) {
    const status = result.error === 'Not authenticated' ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result.data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { courseId, lessonId } = body;

  if (!courseId || !lessonId) {
    return NextResponse.json({ error: 'Missing courseId or lessonId' }, { status: 400 });
  }

  const result = await markLessonComplete(courseId, lessonId);
  if ('error' in result && result.error) {
    const status = result.error === 'Not authenticated' ? 401
      : result.error === 'Not enrolled in this course' ? 403
      : result.error === 'Lesson not found in this course' ? 404
      : result.error === 'This lesson requires passing its quiz first' ? 403
      : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ data: result });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  const lessonId = searchParams.get('lessonId');

  if (!lessonId || !courseId) {
    return NextResponse.json({ error: 'Missing courseId or lessonId parameter' }, { status: 400 });
  }

  const result = await markLessonIncomplete(courseId, lessonId);
  if ('error' in result && result.error) {
    const status = result.error === 'Not authenticated' ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ success: true });
}

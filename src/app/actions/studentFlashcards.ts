'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getStudentContactIds, getOrCreateStudentContact } from './studentEnrollments';
import { isEnrolmentActive } from '@/lib/lms/enrolment';
import { logger } from '@/shared/logger';

export interface FlashcardCard {
  front: string;
  back: string;
}

export interface FlashcardSetSummary {
  blockId: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  totalCards: number;
  known: number;
  learning: number;
  dueCount: number;
}

export interface FlashcardReviewRow {
  card_index: number;
  status: 'learning' | 'known';
  next_due_at: string | null;
}

export interface FlashcardSetDetail {
  blockId: string;
  courseTitle: string;
  lessonTitle: string;
  cards: FlashcardCard[];
  reviews: FlashcardReviewRow[];
}

// Lightweight resurface schedule (NOT SM-2): "known" waits 3 days, "still learning" comes
// back in minutes, so the next session re-queues everything due plus anything never reviewed.
const DUE_MS = { known: 3 * 24 * 60 * 60 * 1000, learning: 8 * 60 * 1000 };

function normalizeCards(content: any): FlashcardCard[] {
  const raw = Array.isArray(content?.flashcards) ? content.flashcards : [];
  return raw
    .map((c: any) => ({ front: String(c?.front ?? '').trim(), back: String(c?.back ?? '').trim() }))
    .filter((c: FlashcardCard) => c.front || c.back);
}

/** Every flashcard set across every course the student is actively enrolled in. */
export async function getStudentFlashcardSets(): Promise<{ data: FlashcardSetSummary[] }> {
  try {
    const contactIds = await getStudentContactIds();
    if (contactIds.length === 0) return { data: [] };
    const db = createAdminClient();

    const { data: enrollments } = await db
      .from('enrollments')
      .select('course_id, status, active')
      .in('contact_id', contactIds);
    const courseIds = Array.from(
      new Set((enrollments || []).filter((e: any) => isEnrolmentActive(e)).map((e: any) => e.course_id))
    );
    if (courseIds.length === 0) return { data: [] };

    const { data: lessons } = await db
      .from('course_lessons')
      .select('id, title, course_id')
      .in('course_id', courseIds)
      .eq('is_active', true);
    const lessonById = new Map((lessons || []).map((l: any) => [l.id, l]));
    const lessonIds = [...lessonById.keys()];
    if (lessonIds.length === 0) return { data: [] };

    const { data: blocks } = await db
      .from('content_blocks')
      .select('id, lesson_id, content, position')
      .eq('type', 'flashcards')
      .in('lesson_id', lessonIds)
      .order('position', { ascending: true });

    const sets = (blocks || [])
      .map((b: any) => ({ ...b, cards: normalizeCards(b.content) }))
      .filter((b: any) => b.cards.length > 0);
    if (sets.length === 0) return { data: [] };

    const courseRes = await db.from('courses').select('id, title').in('id', courseIds);
    const courseById = new Map((courseRes.data || []).map((c: any) => [c.id, c]));

    const { data: reviews } = await db
      .from('flashcard_reviews')
      .select('content_block_id, card_index, status, next_due_at')
      .in('contact_id', contactIds)
      .in('content_block_id', sets.map((s: any) => s.id));

    const now = Date.now();
    const byBlock = new Map<string, any[]>();
    for (const r of reviews || []) {
      const list = byBlock.get(r.content_block_id) || [];
      list.push(r);
      byBlock.set(r.content_block_id, list);
    }

    const data: FlashcardSetSummary[] = sets.map((s: any): FlashcardSetSummary => {
      const lesson = lessonById.get(s.lesson_id);
      const course = lesson ? courseById.get(lesson.course_id) : null;
      const rs = byBlock.get(s.id) || [];
      const known = rs.filter((r) => r.status === 'known').length;
      const learning = rs.filter((r) => r.status === 'learning').length;
      // "not due" == a 'known' card whose next_due_at is still in the future. Everything else
      // — never reviewed, still 'learning', or a 'known' card past its due date — is due, and
      // this matches exactly what the session's due-queue would pull in.
      const notDue = rs.filter(
        (r) => r.status === 'known' && r.next_due_at && new Date(r.next_due_at).getTime() > now
      ).length;
      return {
        blockId: s.id,
        courseId: lesson?.course_id ?? '',
        courseTitle: course?.title ?? 'Course',
        lessonTitle: lesson?.title ?? 'Lesson',
        totalCards: s.cards.length,
        known,
        learning,
        dueCount: Math.max(0, s.cards.length - notDue),
      };
    });

    // Sets with due cards first, then by course/lesson name.
    data.sort(
      (a, b) =>
        (b.dueCount > 0 ? 1 : 0) - (a.dueCount > 0 ? 1 : 0) ||
        a.courseTitle.localeCompare(b.courseTitle) ||
        a.lessonTitle.localeCompare(b.lessonTitle)
    );
    return { data };
  } catch (err) {
    logger.error({ err }, 'student_flashcards.sets.fetch.failed');
    return { data: [] };
  }
}

// Resolve a flashcards block -> its lesson/course, and verify the current student is actively
// enrolled in that course. Returns the resolved contactId (scoped to the course's workspace)
// plus the block on success.
async function resolveSetForStudent(blockId: string) {
  const db = createAdminClient();
  const { data: block } = await db
    .from('content_blocks')
    .select('id, type, content, lesson_id')
    .eq('id', blockId)
    .maybeSingle();
  if (!block || block.type !== 'flashcards') return { error: 'Flashcard set not found' as const };

  const { data: lesson } = await db
    .from('course_lessons')
    .select('id, title, course_id')
    .eq('id', block.lesson_id)
    .maybeSingle();
  if (!lesson) return { error: 'Flashcard set not found' as const };

  const { data: course } = await db
    .from('courses')
    .select('id, title, workspace_id')
    .eq('id', lesson.course_id)
    .maybeSingle();
  if (!course?.workspace_id) return { error: 'Course not found' as const };

  const contactId = await getOrCreateStudentContact(course.workspace_id);
  if (!contactId) return { error: 'Not enrolled in this course' as const };

  const { data: enrolment } = await db
    .from('enrollments')
    .select('id, status, active')
    .eq('course_id', course.id)
    .eq('contact_id', contactId)
    .maybeSingle();
  if (!enrolment || !isEnrolmentActive(enrolment)) {
    return { error: 'Not enrolled in this course' as const };
  }

  return { db, block, lesson, course, contactId };
}

export async function getFlashcardSet(
  blockId: string
): Promise<{ data: FlashcardSetDetail } | { error: string }> {
  try {
    const ctx = await resolveSetForStudent(blockId);
    if ('error' in ctx) return { error: ctx.error };
    const { db, block, lesson, course, contactId } = ctx;

    const cards = normalizeCards(block.content);
    if (cards.length === 0) return { error: 'This flashcard set has no cards' };

    const { data: reviews } = await db
      .from('flashcard_reviews')
      .select('card_index, status, next_due_at')
      .eq('contact_id', contactId)
      .eq('content_block_id', blockId);

    return {
      data: {
        blockId,
        courseTitle: course.title,
        lessonTitle: lesson.title,
        cards,
        reviews: (reviews || []) as FlashcardReviewRow[],
      },
    };
  } catch (err) {
    logger.error({ err, blockId }, 'student_flashcards.set.fetch.failed');
    return { error: 'Could not load this flashcard set.' };
  }
}

export async function recordFlashcardReview(input: {
  blockId: string;
  cardIndex: number;
  status: 'learning' | 'known';
}): Promise<{ success: true; known: number; learning: number } | { error: string }> {
  try {
    if (input.status !== 'learning' && input.status !== 'known') {
      return { error: 'Invalid status' };
    }
    const ctx = await resolveSetForStudent(input.blockId);
    if ('error' in ctx) return { error: ctx.error };
    const { db, block, contactId } = ctx;

    const cards = normalizeCards(block.content);
    if (!Number.isInteger(input.cardIndex) || input.cardIndex < 0 || input.cardIndex >= cards.length) {
      return { error: 'Card is out of range' };
    }

    const { data: existing } = await db
      .from('flashcard_reviews')
      .select('review_count')
      .eq('contact_id', contactId)
      .eq('content_block_id', input.blockId)
      .eq('card_index', input.cardIndex)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const nextDue = new Date(Date.now() + DUE_MS[input.status]).toISOString();

    const { error: upErr } = await db.from('flashcard_reviews').upsert(
      {
        contact_id: contactId,
        content_block_id: input.blockId,
        card_index: input.cardIndex,
        status: input.status,
        review_count: (existing?.review_count ?? 0) + 1,
        last_reviewed_at: nowIso,
        next_due_at: nextDue,
      },
      { onConflict: 'contact_id,content_block_id,card_index' }
    );
    if (upErr) throw upErr;

    const { data: allRows } = await db
      .from('flashcard_reviews')
      .select('status')
      .eq('contact_id', contactId)
      .eq('content_block_id', input.blockId);
    const known = (allRows || []).filter((r: any) => r.status === 'known').length;
    const learning = (allRows || []).filter((r: any) => r.status === 'learning').length;

    return { success: true, known, learning };
  } catch (err) {
    logger.error({ err, blockId: input.blockId }, 'student_flashcards.review.record.failed');
    return { error: 'Could not save your review. Please try again.' };
  }
}

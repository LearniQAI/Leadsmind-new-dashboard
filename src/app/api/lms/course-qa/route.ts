import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { createAdminClient } from '@/lib/supabase/server';
import { toClientError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { runCreditGuard, consumeAICredit } from '@/lib/ai/creditGuard';
import { embedText } from '@/lib/ai/embeddings';

export const dynamic = 'force-dynamic';

// Personal, per-student cooldown (not per-workspace like the internal-tool AI
// features) — a workspace-wide cooldown makes no sense here since students
// aren't workspace_members, and a student legitimately asks several
// questions in a row while studying. Short enough not to break that flow,
// long enough to stop rapid-fire API hammering.
const COOLDOWN_MS = 15 * 1000;
const ANSWER_MODEL = 'gpt-4o-mini';
const MATCH_THRESHOLD = 0.15; // same calibration already proven for this embedding model by match_help_articles
const MATCH_COUNT = 5;

interface RetrievedChunk {
  id: string;
  lesson_id: string;
  chunk_index: number;
  content_text: string;
  source_reference: { lessonId: string; lessonTitle: string; moduleId: string; moduleTitle: string | null };
  similarity: number;
}

function buildAnswerPrompt(question: string, chunks: RetrievedChunk[]) {
  const contextBlock = chunks
    .map((c, i) => `[Source ${i + 1} — Lesson: "${c.source_reference.lessonTitle}" (Module: "${c.source_reference.moduleTitle || 'N/A'}")]\n${c.content_text}`)
    .join('\n\n');

  const systemInstructions = [
    'You are a course teaching assistant for LeadsMind LMS, answering a student\'s question about ONE specific course.',
    'You must answer ONLY using the provided course content excerpts below. This is a strict, non-negotiable rule.',
    'If the excerpts do not contain enough information to answer the question, say plainly that this course\'s content doesn\'t cover that — do NOT use outside knowledge, do NOT guess, do NOT make up an answer.',
    'Never contradict the provided excerpts. Never invent facts, numbers, or claims not present in them.',
    'Keep the answer concise and directly useful to a student studying this material.',
    '',
    '=== COURSE CONTENT EXCERPTS ===',
    contextBlock,
  ].join('\n');

  return { systemInstructions, userContext: question };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const body = await req.json();
    const courseId = typeof body.courseId === 'string' ? body.courseId : '';
    const question = typeof body.question === 'string' ? body.question.trim() : '';

    if (!courseId) throw new ValidationError('Missing courseId');
    if (!question) throw new ValidationError('Question is required');

    const adminClient = createAdminClient();

    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('id, workspace_id')
      .eq('id', courseId)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) throw new NotFoundError('Course');

    // Real enrollment check — never trust that the caller is enrolled just
    // because they hit this endpoint. Same contact-lookup + enrollments
    // query as the student course page itself.
    const contactId = await getOrCreateStudentContact(course.workspace_id);
    if (!contactId) throw new ForbiddenError('Could not verify your enrollment');

    const { data: enrollment, error: enrollmentError } = await adminClient
      .from('enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('contact_id', contactId)
      .maybeSingle();
    if (enrollmentError) throw enrollmentError;
    if (!enrollment) throw new ForbiddenError('You are not enrolled in this course');

    // 1. Server-side per-(user, course) cooldown.
    const { data: lastInteraction, error: lastError } = await adminClient
      .from('course_qa_interactions')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;

    if (lastInteraction) {
      const elapsedMs = Date.now() - new Date(lastInteraction.created_at).getTime();
      if (elapsedMs < COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          { error: 'Please wait a moment before asking another question.', code: 'COOLDOWN_ACTIVE', retryAfterSeconds },
          { status: 429 }
        );
      }
    }

    // 2. Credit/rate-limit guard, scoped to the course's own workspace.
    const guardResult = await runCreditGuard(course.workspace_id);
    if (guardResult.ok === false) {
      return NextResponse.json(guardResult.body as object, { status: guardResult.status });
    }

    // 3. Embed the question (call #1 of up to 2).
    const questionEmbedding = await embedText(question);
    if (!questionEmbedding) {
      return NextResponse.json(
        { error: 'Failed to process your question. Please try again.', code: 'EMBEDDING_FAILED' },
        { status: 502 }
      );
    }

    // 4. Vector similarity search scoped to this course only.
    const { data: chunks, error: matchError } = await adminClient.rpc('match_course_content_chunks', {
      query_embedding: questionEmbedding,
      p_course_id: courseId,
      match_threshold: MATCH_THRESHOLD,
      match_count: MATCH_COUNT,
    });
    if (matchError) throw matchError;

    const retrievedChunks: RetrievedChunk[] = chunks || [];

    // No relevant content found — the real, expected "I don't know" path.
    // Only 1 real API call was made (the embedding), so charge 1 credit.
    if (retrievedChunks.length === 0) {
      const answer = "I don't have information about that in this course. Try asking about a topic covered in the lessons.";
      const { data: inserted, error: insertError } = await adminClient
        .from('course_qa_interactions')
        .insert({
          workspace_id: course.workspace_id,
          user_id: user.id,
          course_id: courseId,
          question,
          answer,
          source_chunks_used: [],
          grounded: false,
          model_used: ANSWER_MODEL,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      await consumeAICredit(course.workspace_id, 1);
      return NextResponse.json(inserted);
    }

    // 5. Grounded answer generation (call #2).
    const { systemInstructions, userContext } = buildAnswerPrompt(question, retrievedChunks);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: ANSWER_MODEL,
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContext },
      ],
      temperature: 0.2,
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json(
        { error: 'The AI did not return an answer. Please try again.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      );
    }

    const sourceChunksUsed = retrievedChunks.map(c => ({
      lessonId: c.source_reference.lessonId,
      lessonTitle: c.source_reference.lessonTitle,
      moduleId: c.source_reference.moduleId,
      moduleTitle: c.source_reference.moduleTitle,
      similarity: Math.round(c.similarity * 1000) / 1000,
    }));

    const { data: inserted, error: insertError } = await adminClient
      .from('course_qa_interactions')
      .insert({
        workspace_id: course.workspace_id,
        user_id: user.id,
        course_id: courseId,
        question,
        answer,
        source_chunks_used: sourceChunksUsed,
        grounded: true,
        model_used: ANSWER_MODEL,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    await consumeAICredit(course.workspace_id, 2);
    return NextResponse.json(inserted);
  } catch (error: any) {
    logger.error({ err: error }, 'lms.course_qa.generate.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    if (!courseId) throw new ValidationError('Missing courseId');

    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 50);
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('course_qa_interactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return NextResponse.json({ interactions: data ?? [] });
  } catch (error: any) {
    logger.error({ err: error }, 'lms.course_qa.list.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

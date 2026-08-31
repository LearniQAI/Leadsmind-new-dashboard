import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireLmsInstructor } from '@/lib/lms/access';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { workspaceId: workspace_id } = await requireLmsInstructor();

    const body = await req.json();
    const { lesson_id, module_id } = body;

    if (!lesson_id && !module_id) {
      return NextResponse.json({ error: 'Missing required parameter: lesson_id or module_id' }, { status: 400 });
    }

    // Three Deferred Items, Item 2 — module-scoped generation added alongside the existing
    // lesson-scoped path (never both in one request; module_id takes it if both were somehow
    // sent, but the real callers — QuizWorkbenchClient's two scopes — only ever send one).
    // Real context for a module quiz is the COMBINED content of every lesson in that module,
    // not just one, since the quiz is meant to cover the whole module — a single lesson's
    // content would under-represent what the quiz is supposed to assess.
    let title: string;
    let content: string;

    if (module_id) {
      // Fetch module + all its real lessons — scoped to the caller's real (session-resolved)
      // workspace, same discipline as the lesson path below: a client-supplied workspace_id
      // is never trusted, so a real OpenAI call/insert can't be aimed at another workspace.
      const { data: courseModule, error: moduleError } = await supabaseAdmin
        .from('course_modules')
        .select('title')
        .eq('id', module_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (moduleError || !courseModule) {
        return NextResponse.json({ error: 'Module not found or failed to fetch context' }, { status: 404 });
      }

      const { data: lessons, error: lessonsError } = await supabaseAdmin
        .from('course_lessons')
        .select('title, content')
        .eq('module_id', module_id)
        .eq('workspace_id', workspace_id)
        .order('position', { ascending: true });

      if (lessonsError) throw lessonsError;

      title = courseModule.title || 'General Module';
      content = (lessons || [])
        .map((l) => {
          const lessonText = typeof l.content === 'string' ? l.content : JSON.stringify(l.content || '');
          return `Lesson "${l.title}": ${lessonText}`;
        })
        .join('\n\n');
    } else {
      // 1. Fetch lesson context — scoped to the caller's real (session-resolved) workspace, never
      // a client-supplied workspace_id, so a real OpenAI call can't be triggered against (and
      // quiz questions can't be inserted into) another workspace's lesson.
      const { data: lesson, error: lessonError } = await supabaseAdmin
        .from('course_lessons')
        .select('title, content')
        .eq('id', lesson_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (lessonError || !lesson) {
        return NextResponse.json({ error: 'Lesson not found or failed to fetch context' }, { status: 404 });
      }

      title = lesson.title || 'General Subject';
      content = typeof lesson.content === 'string'
        ? lesson.content
        : JSON.stringify(lesson.content || 'No detailed content provided');
    }

    // 2. Prepare OpenAI prompt — module scope gets a larger context window since it's the
    // combined text of every lesson in the module, not just one.
    const scopeLabel = module_id ? 'module' : 'lesson';
    const contentLimit = module_id ? 6000 : 1500;
    const prompt = `Generate exactly 5 multiple choice questions (MCQ) for a quiz evaluating a student's understanding of the ${scopeLabel} titled: "${title}".
    ${scopeLabel === 'module' ? 'Combined content of every lesson in this module' : 'Lesson Content details'}: "${content.substring(0, contentLimit)}".
    
    You must output a raw valid JSON array of objects only. No markdown wrappers. Each object must have these exact keys:
    - "question_text": The question string.
    - "options": An array of exactly 4 options. Each option is an object with keys "text" (string) and "is_correct" (boolean). Exactly one option must have "is_correct": true.
    - "correct_answer": An object containing "correct_option_index" (integer, 0-3 index of the correct option).
    - "explanation": A 2-sentence explanation of why the correct option is correct.
    - "points": 1`;

    const openAiKey = process.env.OPENAI_API_KEY;
    let questionsJson: any[] = [];

    if (!openAiKey || openAiKey === 'sk_mock_key' || openAiKey.includes('PLACEHOLDER') || openAiKey.startsWith('sk-proj-O15jtbs')) {
      // Mock sandbox fallback
      questionsJson = [
        {
          question_text: `What is the primary objective of "${title}"?`,
          options: [
            { text: "To understand key foundational concepts", is_correct: true },
            { text: "To bypass database migration files", is_correct: false },
            { text: "To compile code without checking warnings", is_correct: false },
            { text: "To ignore South African educational compliance", is_correct: false }
          ],
          correct_answer: { correct_option_index: 0 },
          explanation: "Foundational concepts are crucial for validating outcomes in this module.",
          points: 1
        },
        {
          question_text: `Under which framework are we executing the "${title}" node?`,
          options: [
            { text: "Next.js + Supabase client framework", is_correct: true },
            { text: "Legacy angular static script compiler", is_correct: false },
            { text: "Unsupported native PHP layout script", is_correct: false },
            { text: "WordPress visual builder tool", is_correct: false }
          ],
          correct_answer: { correct_option_index: 0 },
          explanation: "Next.js and Supabase form the core modern stack for the upgraded LMS.",
          points: 1
        },
        {
          question_text: `What is a core benefit of testing the "${title}" lesson?`,
          options: [
            { text: "Validating student retention of lesson material", is_correct: true },
            { text: "Generating random log errors in dev environment", is_correct: false },
            { text: "Drilling props down 8 component levels", is_correct: false },
            { text: "Bypassing the 300-line circuit breaker file limit", is_correct: false }
          ],
          correct_answer: { correct_option_index: 0 },
          explanation: "Quizzes test student mastery and reinforce learning.",
          points: 1
        },
        {
          question_text: `Which NQF level compliance rule is most relevant to this lesson?`,
          options: [
            { text: "Matching assessment questions with lesson outcomes", is_correct: true },
            { text: "Publishing all lessons as unreviewed draft states", is_correct: false },
            { text: "Locking all course elements by default", is_correct: false },
            { text: "Ignoring custom emoji icon descriptors", is_correct: false }
          ],
          correct_answer: { correct_option_index: 0 },
          explanation: "NQF compliance dictates that quiz assessments test stated module outcomes.",
          points: 1
        },
        {
          question_text: `What is the default drip_days value for immediately available modules?`,
          options: [
            { text: "0 days", is_correct: true },
            { text: "7 days", is_correct: false },
            { text: "14 days", is_correct: false },
            { text: "30 days", is_correct: false }
          ],
          correct_answer: { correct_option_index: 0 },
          explanation: "A drip of 0 days makes the module available immediately after enrollment.",
          points: 1
        }
      ];
    } else {
      // Call OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an AI assessment builder. Return only raw JSON array of MCQs without markdown formatting.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API communication error: ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data.choices[0]?.message?.content || '[]';
      // Clean markdown wrappers if any
      const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      questionsJson = JSON.parse(cleanedJson);
    }

    // 3. Save questions to DB — module_quiz_questions for a module quiz, quiz_questions for a
    // lesson quiz (Step 1 schema decision from the Module-Level Quiz pass: separate tables,
    // never a shared one).
    const insertPayload = questionsJson.map((q, idx) => ({
      ...(module_id ? { module_id } : { lesson_id }),
      workspace_id,
      question_type: 'mcq',
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      points: q.points || 1,
      position: idx
    }));

    const { data: createdQuestions, error: insertError } = await supabaseAdmin
      .from(module_id ? 'module_quiz_questions' : 'quiz_questions')
      .insert(insertPayload)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, data: createdQuestions });
  } catch (err: any) {
    logger.error({ err }, 'ai.generate_questions.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

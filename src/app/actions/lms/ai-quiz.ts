import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import OpenAI from 'openai';

// Task 61: Build AI-generated new quizzes beyond existing remedial questions
export async function generateQuizFromTranscript(lessonId: string, transcriptText: string, questionCount: number = 5) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: 'OpenAI API key is missing from environment.' };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
      You are an expert course creator. Read the following lesson transcript and generate a ${questionCount}-question multiple choice quiz.
      Return ONLY a raw JSON array of objects with this exact structure:
      [{ "question": "string", "options": ["A", "B", "C", "D"], "correctAnswer": "Exact string of correct option", "explanation": "Why it is correct" }]
      
      Transcript:
      ${transcriptText}
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const generatedQuestions = JSON.parse(completion.choices[0].message.content || '{"questions": []}');
    const questionsArray = generatedQuestions.questions || generatedQuestions;

    const { data: quiz, error: dbError } = await supabase
      .from('quizzes')
      .insert({
        lesson_id: lessonId,
        pass_mark_pct: 60,
        ai_generated: true,
        questions: questionsArray
      })
      .select()
      .single();

    if (dbError) throw dbError;
    return { success: true, data: quiz };
  } catch (error: any) {
    logger.error({ err: error, lessonId }, 'lms.ai_quiz_generation.failed');
    return { success: false, error: 'Failed to generate AI quiz.' };
  }
}

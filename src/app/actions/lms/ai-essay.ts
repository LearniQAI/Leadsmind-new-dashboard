'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import OpenAI from 'openai';

export async function gradeStudentEssay(attemptId: string, studentEssay: string, gradingRubric: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    if (!process.env.OPENAI_API_KEY) return { success: false, error: 'OpenAI API key is missing from environment.' };

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `You are an expert, strict but fair teacher grading a student's essay. 
      Read the student's essay below and grade it against the provided Rubric.
      You must return ONLY a raw JSON object with this exact structure:
      {
        "score_pct": number,
        "passed": boolean,
        "feedback_for_student": "A 2-paragraph encouraging but constructive critique",
        "private_notes_for_teacher": "A 1-paragraph summary of why the student lost points"
      }
      Grading Rubric / Criteria: ${gradingRubric}
      Student Essay: ${studentEssay}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const aiGrading = JSON.parse(completion.choices[0].message.content || '{}');

    const { data: gradedAttempt, error: dbError } = await supabase
      .from('quiz_attempts')
      .update({
        score_pct: aiGrading.score_pct,
        passed: aiGrading.passed,
        grading_feedback: aiGrading.feedback_for_student,
        teacher_notes: aiGrading.private_notes_for_teacher,
        graded_by: 'AI'
      })
      .eq('id', attemptId)
      .select().single();

    if (dbError) throw dbError;
    return { success: true, data: gradedAttempt };
  } catch (error: any) {
    logger.error({ err: error, attemptId }, 'lms.ai_essay_grading.failed');
    return { success: false, error: 'Failed to grade essay with AI.' };
  }
}

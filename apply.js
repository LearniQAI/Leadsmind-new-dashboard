const fs = require('fs');
const path = require('path');

// 1. Create the LMS Supabase SQL Schema
const supabaseDir = path.join(process.cwd(), 'src', 'supabase');
if (!fs.existsSync(supabaseDir)) fs.mkdirSync(supabaseDir, { recursive: true });

const sqlSchema = `-- LeadsMind LMS Schema (Based on PRD Section 10)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  cover_image TEXT,
  color_theme TEXT,
  template_id UUID,
  tutor_id UUID,
  certificate_template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER DEFAULT 1,
  unlock_type TEXT DEFAULT 'immediate' -- drip_days, drip_date, quiz_gated
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_blocks JSONB DEFAULT '[]'::jsonb,
  video_provider TEXT, -- youtube, vimeo, wistia, bunny, aws
  video_ref TEXT
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  timer_seconds INTEGER,
  pass_mark_pct INTEGER DEFAULT 60,
  max_retries INTEGER,
  ai_generated BOOLEAN DEFAULT false,
  questions JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  score_pct NUMERIC,
  passed BOOLEAN,
  attempt_number INTEGER DEFAULT 1,
  locked_out BOOLEAN DEFAULT false
);
`;
fs.writeFileSync(path.join(supabaseDir, 'lms_schema.sql'), sqlSchema);

// 2. Create the AI Quiz Generator Engine (Task 61)
const LMS_API_DIR = path.join(process.cwd(), 'src', 'app', 'actions', 'lms');
if (!fs.existsSync(LMS_API_DIR)) fs.mkdirSync(LMS_API_DIR, { recursive: true });

const aiQuizTs = `import { createServerClient } from '@/lib/supabase/server';
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

    const prompt = \`
      You are an expert course creator. Read the following lesson transcript and generate a \${questionCount}-question multiple choice quiz.
      Return ONLY a raw JSON array of objects with this exact structure:
      [{ "question": "string", "options": ["A", "B", "C", "D"], "correctAnswer": "Exact string of correct option", "explanation": "Why it is correct" }]
      
      Transcript:
      \${transcriptText}
    \`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const generatedQuestions = JSON.parse(completion.choices[0].message.content || '{"questions": []}');
    const questionsArray = generatedQuestions.questions || generatedQuestions;

    // Save the AI generated quiz directly to the database as a draft (PRD Section 2)
    const { data: quiz, error: dbError } = await supabase
      .from('quizzes')
      .insert({
        lesson_id: lessonId,
        pass_mark_pct: 60, // Default from PRD
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
`;
fs.writeFileSync(path.join(LMS_API_DIR, 'ai-quiz.ts'), aiQuizTs);

console.log("SUCCESS! LMS Database Schema and AI Quiz Generator (Task 61) built.");
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Mock WebSocket to prevent Supabase realtime crash in Node 20
if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ValidationQuestion {
  questionText: string;
  questionType: 'mcq' | 'true_false';
  options: string[];
  correctAnswer: number | boolean;
  explanation: string;
}

export interface RemedialContent {
  methodologyA: string;
  methodologyB: string;
  methodologyC: string;
  validationQuestions: ValidationQuestion[];
}

/**
 * Connects generative language processes to user performance details, failed attempts, and CRM parameters,
 * generating a personalized remedial assignment matching strict JSON schemas.
 */
export async function generateRemedialAssignment(
  contactId: string,
  courseId: string,
  lessonId: string,
  enrollmentId: string
) {
  try {
    console.log(`[Remedial Prompter] Building context model for contact ${contactId} on lesson ${lessonId}...`);

    // 1. Ingest student details & test mistakes
    const [contactRes, attemptsRes, lessonRes] = await Promise.all([
      supabaseAdmin.from('contacts').select('*').eq('id', contactId).maybeSingle(),
      supabaseAdmin
        .from('quiz_attempts')
        .select('*')
        .eq('student_id', contactId)
        .eq('lesson_id', lessonId)
        .order('submitted_at', { ascending: false }),
      supabaseAdmin.from('course_lessons').select('*').eq('id', lessonId).maybeSingle()
    ]);

    if (contactRes.error) throw contactRes.error;
    if (attemptsRes.error) throw attemptsRes.error;
    if (lessonRes.error) throw lessonRes.error;

    const contact = contactRes.data;
    const attempts = attemptsRes.data || [];
    const lesson = lessonRes.data;

    if (!contact) throw new Error('Student contact profile not found');
    if (!lesson) throw new Error('Lesson node not found');

    // 2. Extract specific mistakes & wrong options from quiz metadata
    const mistakes: any[] = [];
    attempts.forEach(att => {
      const meta = att.metadata || {};
      const snapshots = meta.response_snapshots || {};
      Object.keys(snapshots).forEach(qId => {
        const snap = snapshots[qId];
        if (snap && !snap.is_correct) {
          mistakes.push({
            questionText: snap.question_text,
            studentAnswer: snap.student_answer,
            questionType: snap.type
          });
        }
      });
    });

    // Extract CRM business profiling sectors
    const businessSector = contact.source || 'Lead Finder';
    const crmTags = contact.tags || [];
    const studentName = `${contact.first_name || 'Student'} ${contact.last_name || ''}`.trim();

    console.log(`[Remedial Prompter] Ingested ${mistakes.length} mistakes. Business profile tags: ${crmTags.join(', ')}`);

    // 3. Multimodal Prompt Construction
    const systemPrompt = `You are a professional educational AI coach built inside the LeadsMind LMS.
Your task is to review a student's quiz failures, understand their misconceptions, and generate custom remedial training content and 5 validation questions.
You must output a clean JSON object matching this structure EXACTLY:
{
  "methodologyA": "Plain-text direct instructional explanation covering the concepts failed, in clear terms.",
  "methodologyB": "A practical industry case study aligned with their CRM profile details and business sectors.",
  "methodologyC": "A conceptual comparison relying entirely on visual logic analogies (e.g. metaphors, flow comparisons).",
  "validationQuestions": [
    {
      "questionText": "Question text here",
      "questionType": "mcq",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}
For true_false questions, set options to [] and correctAnswer to true or false.
Ensure the validation questions test the same operational categories as the failed items but DO NOT duplicate past questionnaire items.
Ensure all markdown is clean.`;

    const userPrompt = `Student Name: ${studentName}
CRM Profile / Source: ${businessSector}
CRM Tags: ${crmTags.join(', ')}
Lesson Title: "${lesson.title}"
Failed Quiz Attempts count: ${attempts.length}

Mistakes / Failed Questions logged in past attempts:
${mistakes.length > 0 
  ? mistakes.map((m, idx) => `${idx + 1}. [Failed Question]: "${m.questionText}" | [Student's Wrong Choice]: "${m.studentAnswer}"`).join('\n')
  : 'Misunderstood general overview of the lesson content.'
}

Please generate the remedial JSON response.`;

    // 4. OpenAI Invocation
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // structured outputs config
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const rawJson = response.choices[0].message.content || '{}';
    const parsedData = JSON.parse(rawJson) as RemedialContent;

    // 5. Persist Remedial Assignment in database
    const { data: assignment, error: insertErr } = await supabaseAdmin
      .from('lms_remedial_assignments')
      .upsert({
        enrollment_id: enrollmentId,
        contact_id: contactId,
        course_id: courseId,
        lesson_id: lessonId,
        incorrect_attempts_count: attempts.length,
        methodology_a_text: parsedData.methodologyA,
        methodology_b_case_study: parsedData.methodologyB,
        methodology_c_analogy: parsedData.methodologyC,
        validation_questions: parsedData.validationQuestions || [],
        status: 'pending',
        restore_progress_percent: 0, // placeholder
        restore_video_timestamp: 0, // placeholder
        updated_at: new Date().toISOString()
      }, { onConflict: 'enrollment_id,lesson_id' }) // upsert if already assigned
      .select()
      .single();

    if (insertErr) throw insertErr;

    console.log(`[Remedial Prompter] Created assignment record ID: ${assignment.id}`);
    return { success: true, assignment };

  } catch (err: any) {
    console.error('[Remedial Prompter Error]:', err);
    return { error: err.message };
  }
}

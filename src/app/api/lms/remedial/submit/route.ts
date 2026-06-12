import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mock WebSocket to prevent Supabase realtime crash in Node 20
if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { assignmentId, answers } = await req.json();

    if (!assignmentId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing required parameters: assignmentId, answers array' },
        { status: 400 }
      );
    }

    // 1. Fetch assignment record
    const { data: assignment, error: fetchErr } = await supabaseAdmin
      .from('lms_remedial_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!assignment) {
      return NextResponse.json({ error: 'Remedial assignment not found' }, { status: 404 });
    }

    const questions = assignment.validation_questions || [];
    if (questions.length === 0) {
      return NextResponse.json({ error: 'No validation questions found in this assignment' }, { status: 400 });
    }

    // 2. Grade validation answers
    let correctCount = 0;
    questions.forEach((q: any, idx: number) => {
      const studentAns = answers[idx];
      const correctAns = q.correctAnswer;
      if (studentAns === correctAns) {
        correctCount++;
      }
    });

    const totalQuestions = questions.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= 80; // passing standard of 80% (4 out of 5 questions)

    // 3. Update assignment state
    const newAttemptsCount = (assignment.incorrect_attempts_count || 0) + 1;
    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };

    if (passed) {
      updatePayload.status = 'passed';
    } else {
      updatePayload.incorrect_attempts_count = newAttemptsCount;
    }

    const { error: updateErr } = await supabaseAdmin
      .from('lms_remedial_assignments')
      .update(updatePayload)
      .eq('id', assignmentId);

    if (updateErr) throw updateErr;

    // 4. If passed, mark the lesson as completed in course_progress
    if (passed) {
      const { error: progressErr } = await supabaseAdmin
        .from('course_progress')
        .upsert({
          contact_id: assignment.contact_id,
          course_id: assignment.course_id,
          lesson_id: assignment.lesson_id,
          completed_at: new Date().toISOString()
        }, { onConflict: 'contact_id,lesson_id' });

      if (progressErr) {
        console.error('[Remedial Submit] Progress completion write error:', progressErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      passed,
      score: scorePercentage,
      correctCount,
      totalQuestions
    });

  } catch (err: any) {
    console.error('[API Remedial Submit Error]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

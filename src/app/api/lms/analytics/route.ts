import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

// Task 59: Build a student-facing learning analytics dashboard (Backend)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    // 1. Get all Quiz Attempts & Scores for this student
    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(lesson_id, pass_mark_pct)')
      .eq('student_id', studentId);

    // 2. Get all Certificates Earned by this student
    // (Fails gracefully if the certificates table isn't fully populated yet)
    const { data: certificates } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', studentId)
      .catch(() => ({ data: [] })); 

    // 3. Crunch the numbers for the Analytics UI
    const totalQuizzesTaken = quizAttempts?.length || 0;
    const passedQuizzes = quizAttempts?.filter(a => a.passed)?.length || 0;
    
    // Calculate the student's average score across all courses
    const averageScore = totalQuizzesTaken > 0
      ? Math.round(quizAttempts!.reduce((acc, curr) => acc + Number(curr.score_pct || 0), 0) / totalQuizzesTaken)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_quizzes_taken: totalQuizzesTaken,
          passed_quizzes: passedQuizzes,
          average_score_pct: averageScore,
          certificates_earned: certificates?.length || 0
        },
        recent_activity: quizAttempts?.slice(0, 5) || [],
        certificates: certificates || []
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load student analytics' }, { status: 500 });
  }
}

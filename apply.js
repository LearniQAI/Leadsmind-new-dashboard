const fs = require('fs');
const path = require('path');

const LMS_API_DIR = path.join(process.cwd(), 'src', 'app', 'api', 'lms', 'analytics');
if (!fs.existsSync(LMS_API_DIR)) fs.mkdirSync(LMS_API_DIR, { recursive: true });

const analyticsRouteTs = `import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

// Task 59: Build a student-facing learning analytics dashboard
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });

    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    // 1. Fetch all assigned courses
    const { data: assignments } = await supabase
      .from('student_portal_assignments')
      .select('lesson_id')
      .eq('student_id', studentId);

    // 2. Fetch all quiz attempts 
    // FIX: Replaced the .catch() with the proper Supabase await structure to satisfy TypeScript
    const { data: quizAttempts, error: quizError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', studentId);

    // 3. Crunch the numbers for the Analytics UI
    const totalQuizzesTaken = quizAttempts?.length || 0;
    const passedQuizzes = quizAttempts?.filter(q => q.passed)?.length || 0;
    
    let averageScore = 0;
    if (totalQuizzesTaken > 0) {
      const totalScore = quizAttempts?.reduce((sum, q) => sum + Number(q.score_pct || 0), 0) || 0;
      averageScore = Math.round(totalScore / totalQuizzesTaken);
    }

    const totalLessonsAssigned = assignments?.length || 0;
    const completionRate = totalLessonsAssigned > 0 
      ? Math.round((passedQuizzes / totalLessonsAssigned) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        total_quizzes_taken: totalQuizzesTaken,
        quizzes_passed: passedQuizzes,
        average_score_pct: averageScore,
        course_completion_rate_pct: completionRate,
        needs_help: averageScore < 60
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 });
  }
}
`;
fs.writeFileSync(path.join(LMS_API_DIR, 'route.ts'), analyticsRouteTs);

console.log("SUCCESS! LMS Analytics TypeScript error fixed.");
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Calculates and persists the weighted struggle score (0-100) for a student in a course.
 */
export async function evaluateStudentStruggle(
  contactId: string,
  courseId: string,
  workspaceId: string
) {
  try {
    console.log(`[Struggle Processor] Evaluating student ${contactId} in course ${courseId}...`);
    
    // Initialize points and reasons
    let quizFailureRatePoints = 0;
    let scoreVectorPoints = 0;
    let passingDeltaPoints = 0;
    let timeMultiplierPoints = 0;
    let dropoutTrendsPoints = 0;
    let idleDaysPoints = 0;
    const reasons: string[] = [];

    // Fetch quiz attempts and course lessons to compile stats
    const [attemptsRes, lessonsRes, progressRes, enrollmentRes] = await Promise.all([
      supabaseAdmin
        .from('quiz_attempts')
        .select('*')
        .eq('student_id', contactId)
        .order('submitted_at', { ascending: true }),
      supabaseAdmin
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId),
      supabaseAdmin
        .from('course_progress')
        .select('*')
        .eq('contact_id', contactId)
        .eq('course_id', courseId),
      supabaseAdmin
        .from('enrollments')
        .select('*')
        .eq('contact_id', contactId)
        .eq('course_id', courseId)
        .maybeSingle()
    ]);

    const attempts = attemptsRes.data || [];
    const lessons = lessonsRes.data || [];
    const progress = progressRes.data || [];
    const enrollment = enrollmentRes.data;

    // 1. Quiz Failure Rate (Max 30 Points)
    // Identify quiz failures by lesson
    const failedCounts: Record<string, number> = {};
    attempts.forEach(att => {
      if (!att.passed) {
        failedCounts[att.lesson_id] = (failedCounts[att.lesson_id] || 0) + 1;
      }
    });

    const maxFailuresOnSingleQuiz = Object.values(failedCounts).reduce((max, val) => Math.max(max, val), 0);
    if (maxFailuresOnSingleQuiz >= 2) {
      quizFailureRatePoints = 30;
      reasons.push(`Failing identical quiz assessment benchmark $\\ge 2$ times.`);
    } else if (maxFailuresOnSingleQuiz === 1) {
      quizFailureRatePoints = 15;
      reasons.push('Failing a quiz assessment benchmark once.');
    }

    // 2. Score Vector Performance (Max 25 Points)
    // Detect declining performance or flat-low scores
    if (attempts.length >= 2) {
      let declining = false;
      let consistentlyLow = true;
      for (let i = 1; i < attempts.length; i++) {
        if (attempts[i].score < attempts[i - 1].score) {
          declining = true;
        }
        if (attempts[i].score >= 60) {
          consistentlyLow = false;
        }
      }
      if (attempts[0].score >= 60) consistentlyLow = false;

      if (declining) {
        scoreVectorPoints = 25;
        reasons.push('Declining performance vector detected across consecutive quiz attempts.');
      } else if (consistentlyLow) {
        scoreVectorPoints = 20;
        reasons.push('Flat-low performance vector detected (scores consistently below 60%).');
      }
    }

    // 3. Passing Level Delta Margin (Max 20 Points)
    // Proportional to difference between highest score and passing standard (assumed 70%)
    if (attempts.length > 0) {
      const highestScore = attempts.reduce((max, att) => Math.max(max, att.score || 0), 0);
      const passingStandard = 70;
      if (highestScore < passingStandard) {
        const delta = passingStandard - highestScore;
        passingDeltaPoints = Math.min(20, Math.round(delta * 0.5));
        reasons.push(`Score margin is ${delta}% below the required passing standard.`);
      }
    }

    // 4. Time Multiplier Variance (Max 15 Points)
    // Spent >= 3x median watch time
    for (const prog of progress) {
      const lesson = lessons.find(l => l.id === prog.lesson_id);
      if (!lesson) continue;

      // Query median progress_seconds for this lesson among other students
      const { data: others } = await supabaseAdmin
        .from('course_progress')
        .select('progress_seconds')
        .eq('lesson_id', prog.lesson_id);

      const times = (others || []).map(o => o.progress_seconds || 0).filter(t => t > 0);
      times.sort((a, b) => a - b);
      let median = 120; // default baseline median of 2 minutes
      if (times.length > 0) {
        median = times[Math.floor(times.length / 2)];
      }

      const studentTime = prog.progress_seconds || 0;
      if (studentTime >= 3 * median && median > 0) {
        timeMultiplierPoints = 15;
        reasons.push(`Spent anomalous time on "${lesson.title}" (${Math.round(studentTime / 60)}m vs median ${Math.round(median / 60)}m).`);
        break;
      } else if (studentTime >= 2 * median && median > 0) {
        timeMultiplierPoints = 10;
        reasons.push(`Spent above-average time on "${lesson.title}" (${Math.round(studentTime / 60)}m vs median ${Math.round(median / 60)}m).`);
        break;
      }
    }

    // 5. Drop-out Trends & Idle Days (Max 10 Points Each)
    // Dropout Trends (Max 10): Stopped watching in 40%–80% completeness range
    let midLessonAbandonment = false;
    for (const prog of progress) {
      const lesson = lessons.find(l => l.id === prog.lesson_id);
      if (!lesson || lesson.lesson_type !== 'video' || prog.completed_at) continue;

      // Extract video duration from lesson metadata or content
      const duration = Number(lesson.content?.duration || 600); // default 10 minutes
      const watched = prog.progress_seconds || 0;
      const ratio = watched / duration;
      if (ratio >= 0.4 && ratio <= 0.8) {
        midLessonAbandonment = true;
        reasons.push(`Mid-lesson abandonment trend on video lecture "${lesson.title}" (stopped at ${Math.round(ratio * 100)}%).`);
        break;
      }
    }
    if (midLessonAbandonment) {
      dropoutTrendsPoints = 10;
    }

    // Idle Days (Max 10): last active relative to now
    if (enrollment) {
      const lastActive = new Date(enrollment.last_active_at || enrollment.enrolled_at || enrollment.created_at);
      const diffMs = Date.now() - lastActive.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays > 7) {
        idleDaysPoints = 10;
        reasons.push('Long-term activity drop-off (inactive for over 7 days).');
      } else if (diffDays > 3) {
        idleDaysPoints = 5;
        reasons.push('Short-term activity drop-off (inactive for over 3 days).');
      }
    }

    // Aggregate struggle score
    const totalScore = Math.min(
      100,
      quizFailureRatePoints +
      scoreVectorPoints +
      passingDeltaPoints +
      timeMultiplierPoints +
      dropoutTrendsPoints +
      idleDaysPoints
    );

    // Persist scores
    const { error: upsertErr } = await supabaseAdmin
      .from('lms_student_struggle_scores')
      .upsert({
        workspace_id: workspaceId,
        contact_id: contactId,
        course_id: courseId,
        score: totalScore,
        quiz_failure_rate_points: quizFailureRatePoints,
        score_vector_points: scoreVectorPoints,
        passing_delta_points: passingDeltaPoints,
        time_multiplier_points: timeMultiplierPoints,
        dropout_trends_points: dropoutTrendsPoints,
        reasons,
        updated_at: new Date().toISOString()
      }, { onConflict: 'contact_id,course_id' });

    if (upsertErr) throw upsertErr;

    console.log(`[Struggle Processor] Completed evaluation for ${contactId}. Score: ${totalScore}`);
    
    // Trigger struggle webhook or automation event if score is high
    if (totalScore >= 80) {
      try {
        const { emitLMSEvent } = await import('../events/lms-event-bus');
        await emitLMSEvent('struggling_detected', {
          workspaceId,
          contactId,
          courseId,
          metadata: { score: totalScore }
        });
      } catch (telemetryErr) {
        console.error('[Struggle Telemetry Event Trigger Error]:', telemetryErr);
      }
    }

    return { success: true, score: totalScore };
  } catch (err: any) {
    console.error('[Struggle Processor Error]:', err);
    return { error: err.message };
  }
}

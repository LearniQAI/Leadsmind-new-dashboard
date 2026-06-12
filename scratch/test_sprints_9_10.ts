import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Mock WebSocket to prevent Supabase Realtime Client Node 20 crash
if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSprints9And10() {
  // Dynamically import struggle processor and scanner to ensure dotenv is fully loaded first
  const { evaluateStudentStruggle } = await import('../libs/core/src/analytics/struggle-processor');
  const { scanForAbandonment } = await import('../libs/workers/src/crons/abandonment-scanner');
  console.log('--- Testing Sprints 9 & 10 Telemetry, Cron & Struggle Analytics ---');

  try {
    // 1. Fetch reference records starting from courses table
    const { data: courses, error: courseError } = await supabase.from('courses').select('id, title, workspace_id').limit(1);
    if (courseError || !courses || courses.length === 0) {
      throw new Error(`Failed to fetch course: ${courseError?.message}`);
    }
    const course = courses[0];
    const courseId = course.id;
    const workspaceId = course.workspace_id;
    console.log(`Using Course: ${course.title} (ID: ${courseId})`);
    console.log(`Using Workspace ID: ${workspaceId}`);

    // 2. Create or fetch a test student contact
    const testEmail = `struggling.student.test+${Date.now()}@example.com`;
    const { data: contact, error: contactError } = await supabase.from('contacts').insert({
      workspace_id: workspaceId,
      first_name: 'Test',
      last_name: 'Struggler',
      email: testEmail
    }).select().single();

    if (contactError || !contact) {
      throw new Error(`Failed to create test contact: ${contactError?.message}`);
    }
    const contactId = contact.id;
    console.log(`Created test contact: ${contact.email} (ID: ${contactId})`);

    // 3. Create active enrollment
    const { data: enrollment, error: enrollError } = await supabase.from('enrollments').insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      course_id: courseId,
      active: true,
      payment_status: 'paid',
      access_type: 'full',
      enrolled_at: new Date().toISOString(),
      last_active_at: new Date().toISOString()
    }).select().single();

    if (enrollError || !enrollment) {
      throw new Error(`Failed to create enrollment: ${enrollError?.message}`);
    }
    console.log(`Created active enrollment (ID: ${enrollment.id})`);

    // Create a mock lesson for quiz & media steps
    const { data: lessons, error: lessonError } = await supabase.from('course_lessons').select('id, lesson_type').eq('course_id', courseId);
    if (lessonError) {
      throw new Error(`Failed to fetch course lessons: ${lessonError.message}`);
    }

    let lessonId = '';
    if (lessons && lessons.length > 0) {
      lessonId = lessons[0].id;
      console.log(`Using existing lesson ID: ${lessonId} (${lessons[0].lesson_type})`);
    } else {
      const { data: newLesson, error: newLessonErr } = await supabase.from('course_lessons').insert({
        course_id: courseId,
        module_id: '00000000-0000-0000-0000-000000000000', // assuming dummy or fetch module
        title: 'Introduction Lecture',
        lesson_type: 'video',
        content: { video_url: 'https://vimeo.com/123456', duration: 600 }
      }).select().single();
      if (newLessonErr || !newLesson) {
        throw new Error(`Failed to create lesson: ${newLessonErr?.message}`);
      }
      lessonId = newLesson.id;
      console.log(`Created new mock video lesson: ${lessonId}`);
    }

    // 4. Test Struggle Recalculation: Initial Run (expecting score 0 or minimal)
    console.log('\n--- Evaluating initial struggle score ---');
    const initialRes = await evaluateStudentStruggle(contactId, courseId, workspaceId);
    console.log('Initial evaluation result:', initialRes);

    const { data: initialDbScore } = await supabase
      .from('lms_student_struggle_scores')
      .select('*')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .single();
    console.log('Database score record:', initialDbScore);

    // 5. Mock quiz failure rate (failing same quiz assessment >= 2 times)
    console.log('\n--- Mocking quiz failures to trigger Struggle Score ---');
    const { error: quizErr1 } = await supabase.from('quiz_attempts').insert({
      workspace_id: workspaceId,
      lesson_id: lessonId,
      student_id: contactId,
      score: 45,
      passed: false,
      answers: {},
      submitted_at: new Date(Date.now() - 600000).toISOString()
    });
    const { error: quizErr2 } = await supabase.from('quiz_attempts').insert({
      workspace_id: workspaceId,
      lesson_id: lessonId,
      student_id: contactId,
      score: 50,
      passed: false,
      answers: {},
      submitted_at: new Date().toISOString()
    });

    if (quizErr1 || quizErr2) {
      throw new Error(`Failed to insert mock quiz attempts: ${quizErr1?.message || quizErr2?.message}`);
    }
    console.log('Inserted 2 failed quiz attempts.');

    // 6. Recalculate struggle score with failed quizzes
    console.log('\n--- Re-evaluating struggle score ---');
    const postQuizRes = await evaluateStudentStruggle(contactId, courseId, workspaceId);
    console.log('Post-quiz evaluation result:', postQuizRes);

    const { data: updatedDbScore } = await supabase
      .from('lms_student_struggle_scores')
      .select('*')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .single();
    console.log('Database score record after quiz failures:', updatedDbScore);

    // 7. Mock Time Multiplier Variance (Student progress time >= 3x lesson median)
    // First, let's check others median progress time or mock it.
    // Insert a progress record for student
    console.log('\n--- Mocking anomalous watch duration progress ---');
    const { error: progErr } = await supabase.from('course_progress').upsert({
      contact_id: contactId,
      course_id: courseId,
      lesson_id: lessonId,
      progress_seconds: 1800, // 30 mins
      completed_at: null
    });
    if (progErr) {
      throw new Error(`Failed to insert student course progress: ${progErr.message}`);
    }

    // Let's add other student progress records to define median as 200 seconds
    const { error: otherProgErr } = await supabase.from('course_progress').insert([
      { contact_id: '00000000-0000-0000-0000-000000000001', course_id: courseId, lesson_id: lessonId, progress_seconds: 200, completed_at: null },
      { contact_id: '00000000-0000-0000-0000-000000000002', course_id: courseId, lesson_id: lessonId, progress_seconds: 220, completed_at: null }
    ]);
    if (otherProgErr) {
      console.log('Note: Failed to add other progress records (could be FK validation, continuing anyway)');
    }

    const postTimeRes = await evaluateStudentStruggle(contactId, courseId, workspaceId);
    console.log('Post-time evaluation result:', postTimeRes);

    const { data: finalDbScore } = await supabase
      .from('lms_student_struggle_scores')
      .select('*')
      .eq('contact_id', contactId)
      .eq('course_id', courseId)
      .single();
    console.log('Final Database struggle score details:', finalDbScore);

    // 8. Test Abandonment scanner triggers:
    console.log('\n--- Testing Abandonment Scanning Cron logic ---');
    // Mock the enrollment last_active_at to 4 days ago
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('enrollments').update({
      last_active_at: fourDaysAgo
    }).eq('id', enrollment.id);

    console.log('Enrollment last active time set to 4 days ago. Scanning...');
    const scanRes = await scanForAbandonment();
    console.log('Abandonment scanner scan results:', scanRes);

    // Verify if last_abandonment_email_at was updated (indicating a retention action was triggered)
    const { data: scannedEnrollment } = await supabase.from('enrollments').select('last_abandonment_email_at').eq('id', enrollment.id).single();
    console.log('Scanned Enrollment last_abandonment_email_at:', scannedEnrollment?.last_abandonment_email_at);

    // Clean up mock data
    console.log('\n--- Cleaning up test records ---');
    await supabase.from('quiz_attempts').delete().eq('student_id', contactId);
    await supabase.from('course_progress').delete().eq('contact_id', contactId);
    await supabase.from('enrollments').delete().eq('id', enrollment.id);
    await supabase.from('contacts').delete().eq('id', contactId);
    console.log('Test records clean up successful.');
    
  } catch (err: any) {
    console.error('Test execution failed:', err.message);
  }
}

testSprints9And10();

const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'src', 'app', 'student', 'page.tsx');
let pageCode = fs.readFileSync(pagePath, 'utf8');

if (!pageCode.includes('averageScore')) {
  pageCode = pageCode.replace(
    /import \{ getEnrolledCoursesWithProgress \} from '@\/app\/actions\/studentEnrollments';/,
    "import { getEnrolledCoursesWithProgress } from '@/app/actions/studentEnrollments';\nimport { createServerClient } from '@/lib/supabase/server';\nimport { getCurrentWorkspaceId } from '@/lib/auth';"
  );

  pageCode = pageCode.replace(
    /const avgProgress = totalCourses > 0[\s\S]*?: 0;/,
    `const avgProgress = totalCourses > 0 
    ? Math.round(courses.reduce((acc: number, c: any) => acc + c.progressPercentage, 0) / totalCourses) 
    : 0;

  // Task 59: Fetch Real Learning Analytics
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  const { data: quizAttempts } = await supabase.from('quiz_attempts').select('score_pct, passed').eq('student_id', profile?.id || '');
  
  const totalQuizzes = quizAttempts?.length || 0;
  const passedQuizzes = quizAttempts?.filter(q => q.passed)?.length || 0;
  
  let averageScore = 0;
  if (totalQuizzes > 0) {
    const totalScore = quizAttempts?.reduce((sum, q) => sum + Number(q.score_pct || 0), 0) || 0;
    averageScore = Math.round(totalScore / totalQuizzes);
  }`
  );

  pageCode = pageCode.replace(
    /<DashCard padding="default" className="flex items-center gap-4">\s*<div className="w-10 h-10 rounded-xl bg-purple\/10 !text-purple flex items-center justify-center flex-shrink-0">\s*<CheckCircle2 size=\{18\} \/>\s*<\/div>\s*<div>\s*<div className="text-\[28px\] font-bold !text-dash-text leading-none">\{completedLessons\}<\/div>\s*<div className="text-\[13px\] font-medium !text-dash-textMuted mt-1">Lessons Completed<\/div>\s*<\/div>\s*<\/DashCard>/,
    `<DashCard padding="default" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple/10 !text-purple flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-[28px] font-bold !text-dash-text leading-none">{passedQuizzes}</div>
            <div className="text-[13px] font-medium !text-dash-textMuted mt-1">Quizzes Passed</div>
          </div>
        </DashCard>`
  );

  pageCode = pageCode.replace(
    /<DashCard padding="default" className="flex items-center gap-4">\s*<div className="w-10 h-10 rounded-xl bg-green\/10 !text-green flex items-center justify-center flex-shrink-0">\s*<Award size=\{18\} \/>\s*<\/div>\s*<div>\s*<div className="text-\[28px\] font-bold !text-dash-text leading-none">\{avgProgress\}%<\/div>\s*<div className="text-\[13px\] font-medium !text-dash-textMuted mt-1">Average Progress<\/div>\s*<\/div>\s*<\/DashCard>/,
    `<DashCard padding="default" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green/10 !text-green flex items-center justify-center flex-shrink-0">
            <Award size={18} />
          </div>
          <div>
            <div className="text-[28px] font-bold !text-dash-text leading-none">{averageScore}%</div>
            <div className="text-[13px] font-medium !text-dash-textMuted mt-1">Average Quiz Score</div>
          </div>
        </DashCard>`
  );

  fs.writeFileSync(pagePath, pageCode);
  console.log("SUCCESS! Student Analytics Dashboard (Task 59) wired to UI.");
}
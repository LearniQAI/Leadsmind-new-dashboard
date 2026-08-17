const fs = require('fs');
const path = require('path');

const LMS_API_DIR = path.join(process.cwd(), 'src', 'app', 'api', 'lms', 'transcript');
if (!fs.existsSync(LMS_API_DIR)) fs.mkdirSync(LMS_API_DIR, { recursive: true });

const transcriptRouteTs = `import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { jsPDF } from 'jspdf';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');

    if (!studentId || !courseId) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: course } = await supabase.from('courses').select('name').eq('id', courseId).single();
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('score_pct, passed, quizzes(lesson_id)')
      .eq('student_id', studentId);

    if (error || !attempts) throw new Error('Failed to fetch transcript');

    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Official Student Transcript', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(\`Course: \${course?.name || 'Unknown Course'}\`, 20, 40);
    doc.text(\`Date Issued: \${new Date().toLocaleDateString()}\`, 20, 50);
    
    doc.setFontSize(12);
    let yPos = 70;
    doc.text('Assessment', 20, yPos);
    doc.text('Score', 130, yPos);
    doc.text('Status', 170, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    
    yPos += 10;
    attempts.forEach((attempt, index) => {
      doc.text(\`Assessment \${index + 1}\`, 20, yPos);
      doc.text(\`\${attempt.score_pct || 0}%\`, 130, yPos);
      doc.text(attempt.passed ? 'PASS' : 'FAIL', 170, yPos);
      yPos += 10;
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': \`attachment; filename="transcript-\${studentId}.pdf"\`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
`;
fs.writeFileSync(path.join(LMS_API_DIR, 'route.ts'), transcriptRouteTs);
console.log("SUCCESS! Student Transcript Generator built.");
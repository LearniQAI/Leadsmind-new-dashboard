import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { jsPDF } from 'jspdf';

// Task 58: Build student transcript generation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');

    if (!studentId || !courseId) {
      return NextResponse.json({ error: 'Missing studentId or courseId' }, { status: 400 });
    }

    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    // 1. Fetch Course and Student Info
    const { data: course } = await supabase.from('courses').select('name').eq('id', courseId).single();
    
    // 2. Fetch all quiz attempts for this student in this course
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('score_pct, passed, quizzes(lesson_id)')
      .eq('student_id', studentId);

    if (error || !attempts) throw new Error('Failed to fetch transcript data');

    // 3. Generate the PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text('Official Student Transcript', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`Course: ${course?.name || 'Unknown Course'}`, 20, 40);
    doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 20, 50);
    
    // Grades Table
    doc.setFontSize(12);
    let yPos = 70;
    doc.text('Assessment', 20, yPos);
    doc.text('Score', 130, yPos);
    doc.text('Status', 170, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    
    yPos += 10;
    
    attempts.forEach((attempt, index) => {
      doc.text(`Assessment ${index + 1}`, 20, yPos);
      doc.text(`${attempt.score_pct || 0}%`, 130, yPos);
      doc.text(attempt.passed ? 'PASS' : 'FAIL', 170, yPos);
      yPos += 10;
    });

    // 4. Return the PDF as a downloadable file
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="transcript-${studentId}.pdf"`
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate transcript' }, { status: 500 });
  }
}

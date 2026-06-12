import { NextRequest, NextResponse } from 'next/server';
import { generateRemedialAssignment } from '../../../../../../libs/services/src/ai/remedial-prompter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { contactId, courseId, lessonId, enrollmentId } = await req.json();

    if (!contactId || !courseId || !lessonId || !enrollmentId) {
      return NextResponse.json(
        { error: 'Missing required parameters: contactId, courseId, lessonId, enrollmentId' },
        { status: 400 }
      );
    }

    const res = await generateRemedialAssignment(contactId, courseId, lessonId, enrollmentId);

    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      assignment: res.assignment
    });

  } catch (err: any) {
    console.error('[API Remedial Generate Error]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

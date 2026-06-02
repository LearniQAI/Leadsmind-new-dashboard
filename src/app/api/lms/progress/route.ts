import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId } from '@/lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resolveContactId(email: string, workspaceId: string) {
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('id')
    .eq('email', email)
    .eq('workspace_id', workspaceId)
    .limit(1)
    .maybeSingle();

  if (contact) return contact.id;

  const { data: newContact } = await supabaseAdmin
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      email,
      first_name: 'Student',
      last_name: ''
    })
    .select('id')
    .single();

  return newContact?.id || null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId parameter' }, { status: 400 });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace context' }, { status: 400 });
    }

    const contactId = await resolveContactId(user.email ?? '', workspaceId);
    if (!contactId) {
      return NextResponse.json({ data: [] });
    }

    const { data: progress, error } = await supabaseAdmin
      .from('course_progress')
      .select('lesson_id')
      .eq('contact_id', contactId)
      .eq('course_id', courseId);

    if (error) throw error;

    return NextResponse.json({ data: (progress || []).map((p: any) => p.lesson_id) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseId, lessonId } = body;

    if (!courseId || !lessonId) {
      return NextResponse.json({ error: 'Missing courseId or lessonId' }, { status: 400 });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace context' }, { status: 400 });
    }

    const contactId = await resolveContactId(user.email ?? '', workspaceId);
    if (!contactId) {
      return NextResponse.json({ error: 'Contact profile failed to resolve' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('course_progress')
      .upsert({
        workspace_id: workspaceId,
        contact_id: contactId,
        course_id: courseId,
        lesson_id: lessonId
      }, { onConflict: 'contact_id,lesson_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId parameter' }, { status: 400 });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace context' }, { status: 400 });
    }

    const contactId = await resolveContactId(user.email ?? '', workspaceId);
    if (!contactId) {
      return NextResponse.json({ error: 'Contact profile failed to resolve' }, { status: 500 });
    }

    const { error } = await supabaseAdmin
      .from('course_progress')
      .delete()
      .eq('contact_id', contactId)
      .eq('lesson_id', lessonId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

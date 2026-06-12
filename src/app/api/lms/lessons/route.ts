import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get('moduleId');
    const id = searchParams.get('id');

    if (id) {
      const { data: lesson, error } = await supabaseAdmin
        .from('course_lessons')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json({ data: lesson });
    }

    if (!moduleId) {
      return NextResponse.json({ error: 'Missing moduleId or id parameter' }, { status: 400 });
    }

    const { data: lessons, error } = await supabaseAdmin
      .from('course_lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('position', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: lessons });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      module_id,
      course_id,
      workspace_id,
      title,
      lesson_type,
      content = {},
      position = 0,
      is_preview = false,
      access_level = 'enrolled'
    } = body;

    if (!module_id || !course_id || !workspace_id || !title || !lesson_type) {
      return NextResponse.json({ error: 'Missing required fields: module_id, course_id, workspace_id, title, lesson_type' }, { status: 400 });
    }

    const { data: lesson, error } = await supabaseAdmin
      .from('course_lessons')
      .insert({
        module_id,
        course_id,
        workspace_id,
        title,
        lesson_type,
        content,
        position,
        is_preview,
        access_level
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: lesson });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing lesson id parameter' }, { status: 400 });
    }

    const body = await req.json();
    const {
      title,
      lesson_type,
      content,
      position,
      is_preview,
      access_level
    } = body;

    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (lesson_type !== undefined) updatePayload.lesson_type = lesson_type;
    if (content !== undefined) updatePayload.content = content;
    if (position !== undefined) updatePayload.position = position;
    if (is_preview !== undefined) updatePayload.is_preview = is_preview;
    if (access_level !== undefined) updatePayload.access_level = access_level;

    updatePayload.updated_at = new Date().toISOString();

    const { data: lesson, error } = await supabaseAdmin
      .from('course_lessons')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: lesson });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing lesson id parameter' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('course_lessons')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

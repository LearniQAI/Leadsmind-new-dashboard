import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const id = searchParams.get('id');

    if (id) {
      const { data: module, error } = await supabaseAdmin
        .from('course_modules')
        .select('*, lessons:course_lessons(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json({ data: module });
    }

    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId or id parameter' }, { status: 400 });
    }

    const { data: modules, error } = await supabaseAdmin
      .from('course_modules')
      .select('*, lessons:course_lessons(*)')
      .eq('course_id', courseId)
      .order('position', { ascending: true })
      .order('position', { foreignTable: 'course_lessons', ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: modules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      course_id,
      workspace_id,
      title,
      description = '',
      icon = '📚',
      publish_status = 'draft',
      nqf_level = '',
      required_for_completion = true,
      drip_days = 0,
      position = 0
    } = body;

    if (!course_id || !workspace_id || !title) {
      return NextResponse.json({ error: 'Missing required fields: course_id, workspace_id, title' }, { status: 400 });
    }

    const { data: module, error } = await supabaseAdmin
      .from('course_modules')
      .insert({
        course_id,
        workspace_id,
        title,
        description,
        icon,
        publish_status,
        nqf_level,
        required_for_completion,
        drip_days,
        position
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: module });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing module id parameter' }, { status: 400 });
    }

    const body = await req.json();
    const {
      title,
      description,
      icon,
      publish_status,
      nqf_level,
      required_for_completion,
      drip_days,
      position
    } = body;

    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (icon !== undefined) updatePayload.icon = icon;
    if (publish_status !== undefined) updatePayload.publish_status = publish_status;
    if (nqf_level !== undefined) updatePayload.nqf_level = nqf_level;
    if (required_for_completion !== undefined) updatePayload.required_for_completion = required_for_completion;
    if (drip_days !== undefined) updatePayload.drip_days = drip_days;
    if (position !== undefined) updatePayload.position = position;

    updatePayload.updated_at = new Date().toISOString();

    const { data: module, error } = await supabaseAdmin
      .from('course_modules')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: module });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing module id parameter' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('course_modules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

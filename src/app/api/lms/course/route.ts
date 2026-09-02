import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { data: course, error } = await adminClient
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !course) throw new NotFoundError('Course');
    return NextResponse.json({ data: course });
  } catch (err: any) {
    logger.error({ err }, 'lms.course.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing course id parameter' }, { status: 400 });

    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { title, description, price, status, thumbnail_url, certificate_config, category_id } = body;

    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (price !== undefined) updatePayload.price = parseFloat(price) || 0;
    if (thumbnail_url !== undefined) updatePayload.thumbnail_url = thumbnail_url;
    if (status !== undefined) {
      updatePayload.status = status;
      updatePayload.published = (status === 'published');
    }
    // Batch 6 (G9) — category_id is never trusted blindly: null clears it (uncategorized),
    // otherwise it must be a real category in the CALLER'S OWN workspace, same discipline as
    // every other cross-entity reference in this app (e.g. createCourseWithDomain's domainId).
    if (category_id !== undefined) {
      if (category_id === null) {
        updatePayload.category_id = null;
      } else {
        const { data: category } = await adminClient
          .from('course_categories')
          .select('id')
          .eq('id', category_id)
          .eq('workspace_id', workspaceId)
          .maybeSingle();
        if (!category) {
          return NextResponse.json({ error: 'Category not found in this workspace' }, { status: 400 });
        }
        updatePayload.category_id = category_id;
      }
    }
    // Certificate design config (Part 2). null clears the per-course override so the course
    // falls back to the workspace default; an object is stored verbatim (validated client-side
    // + shape-tolerant server-side render).
    if (certificate_config !== undefined) {
      updatePayload.certificate_config =
        certificate_config && typeof certificate_config === 'object' ? certificate_config : null;
    }

    const { data: course, error } = await adminClient
      .from('courses')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data: course });
  } catch (err: any) {
    logger.error({ err }, 'lms.course.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

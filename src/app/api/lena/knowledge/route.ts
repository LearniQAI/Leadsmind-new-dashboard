import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const LENA_TEAM_ROLES = ['admin', 'member'];

// Internal dashboard management of the bot's knowledge base — never called by the public
// chat widget, so full team-member auth applies to every verb.
export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(LENA_TEAM_ROLES);
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('lena_knowledge_base')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ articles: data ?? [] });
  } catch (err: any) {
    logger.error({ err }, 'lena.knowledge.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(LENA_TEAM_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json();
    const { title, content, category, always_include, active } = body;
    if (!title || !content) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from('lena_knowledge_base')
      .insert({ workspace_id: workspaceId, title, content, category, always_include, active })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ article: data });
  } catch (err: any) {
    logger.error({ err }, 'lena.knowledge.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { workspaceId } = await requireWorkspaceRole(LENA_TEAM_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json();
    const { data, error } = await adminClient
      .from('lena_knowledge_base')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ article: data });
  } catch (err: any) {
    logger.error({ err }, 'lena.knowledge.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { workspaceId } = await requireWorkspaceRole(LENA_TEAM_ROLES);
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('lena_knowledge_base')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lena.knowledge.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

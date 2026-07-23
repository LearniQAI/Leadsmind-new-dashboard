import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { ForbiddenError, NotFoundError, UnauthorizedError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

function corsResponse(body: any, init?: ResponseInit) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...(init?.headers || {}),
  };
  return NextResponse.json(body, { ...init, headers });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// GET is intentionally public and unauthenticated — this is what the embeddable widget
// script (lena/embed/[workspaceId]) polls every 1.5s to show a visitor their own
// conversation, with no login. conversationId is a cryptographically random UUID
// (lena_conversations.id default gen_random_uuid()), so it functions as the bearer
// credential here — same accepted pattern as other public, capability-URL-style resources
// in this codebase (e.g. form recovery links, KYC consent links). It only ever returns
// that one conversation's own messages, never anything else.
export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId');
    if (!conversationId) {
      return corsResponse({ error: 'conversationId required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('lena_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Check if agent is actively typing
    let isAgentTyping = false;
    const { data: conv } = await adminClient
      .from('lena_conversations')
      .select('mode, agent_typing_until')
      .eq('id', conversationId)
      .maybeSingle();

    if (conv?.agent_typing_until) {
      isAgentTyping = new Date(conv.agent_typing_until).getTime() > Date.now();
    }

    return corsResponse({
      messages: data ?? [],
      isAgentTyping
    });
  } catch (err: any) {
    logger.error({ err }, 'lena.messages.get.failed');
    const clientError = toClientError(err);
    return corsResponse({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// POST sends a real agent reply — unlike GET, this is only ever called from the internal
// dashboard (ConversationsTab.tsx), never the public widget, so it requires real team auth.
// The conversation's real workspace_id is resolved from its own DB record — a
// client-supplied workspaceId is never trusted for authorization.
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const body = await req.json();
    const { conversationId, content, senderId } = body;

    if (!conversationId || !content) {
      return corsResponse({ error: 'conversationId and content are required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: conversation, error: convErr } = await adminClient
      .from('lena_conversations')
      .select('workspace_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (convErr) throw convErr;
    if (!conversation) throw new NotFoundError('Conversation');

    const supabaseUser = await createServerClient();
    const { data: membership } = await supabaseUser
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', conversation.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) throw new ForbiddenError('You do not have access to this conversation');

    const { data: msg, error: msgError } = await adminClient
      .from('lena_messages')
      .insert({
        conversation_id: conversationId,
        workspace_id: conversation.workspace_id,
        sender_type: 'agent',
        sender_id: senderId,
        content
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Update conversation mode to human when agent responds, and touch updated_at
    await adminClient
      .from('lena_conversations')
      .update({
        mode: 'human',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    return corsResponse({ message: msg });
  } catch (err: any) {
    logger.error({ err }, 'lena.messages.post.failed');
    const clientError = toClientError(err);
    return corsResponse({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { ForbiddenError, NotFoundError, UnauthorizedError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { lenaCorsHeaders, validateAnyLenaEmbedOrigin, validateLenaEmbedOrigin } from '@/lib/lena/embedOrigin';
import { verifyLenaVisitorSession, visitorSessionFromRequest } from '@/lib/lena/publicSession';

export const dynamic = 'force-dynamic';
const respond = (body: unknown, origin: string | null, init?: ResponseInit) => NextResponse.json(body, { ...init, headers: { ...lenaCorsHeaders(origin, 'GET, POST, OPTIONS'), ...(init?.headers || {}) } });

export async function OPTIONS(req: NextRequest) {
  const origin = await validateAnyLenaEmbedOrigin(createAdminClient(), req);
  return new NextResponse(null, { status: origin ? 204 : 403, headers: lenaCorsHeaders(origin, 'GET, POST, OPTIONS') });
}

// A conversation UUID is an identifier, never a credential. Public reads require the
// signed session issued when that specific visitor created the conversation.
export async function GET(req: NextRequest) {
  let origin: string | null = null;
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId');
    const session = verifyLenaVisitorSession(visitorSessionFromRequest(req));
    if (!conversationId) return respond({ error: 'conversationId required' }, null, { status: 400 });
    if (!session || session.conversationId !== conversationId) return respond({ error: 'A valid visitor session is required for this conversation' }, null, { status: 401 });
    const admin = createAdminClient();
    origin = await validateLenaEmbedOrigin(admin, req, session.workspaceId);
    if (!origin || origin !== session.origin) return respond({ error: 'Visitor session is not valid for this origin' }, null, { status: 403 });
    const { data: conversation, error: convError } = await admin.from('lena_conversations').select('mode').eq('id', conversationId).eq('workspace_id', session.workspaceId).eq('visitor_id', session.visitorId).maybeSingle();
    if (convError) throw convError;
    if (!conversation) return respond({ error: 'Conversation not found for this visitor session' }, origin, { status: 404 });
    const { data, error } = await admin.from('lena_messages').select('*').eq('conversation_id', conversationId).eq('workspace_id', session.workspaceId).order('created_at', { ascending: true });
    if (error) throw error;
    // NOTE: lena_conversations has no agent_typing_until column — a live "agent is typing"
    // indicator is unbuilt. Always report false rather than 500ing on a missing column.
    return respond({ messages: data ?? [], isAgentTyping: false }, origin);
  } catch (err: any) {
    logger.error({ err }, 'lena.messages.get.failed');
    const clientError = toClientError(err);
    return respond({ error: clientError.error, code: clientError.code }, origin, { status: clientError.status });
  }
}

// Internal staff replies retain normal authenticated workspace authorization.
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();
    const { conversationId, content, senderId } = await req.json();
    if (!conversationId || !content) return respond({ error: 'conversationId and content are required' }, null, { status: 400 });
    const admin = createAdminClient();
    const { data: conversation, error: convErr } = await admin.from('lena_conversations').select('workspace_id').eq('id', conversationId).maybeSingle();
    if (convErr) throw convErr;
    if (!conversation) throw new NotFoundError('Conversation');
    const server = await createServerClient();
    const { data: membership } = await server.from('workspace_members').select('id').eq('workspace_id', conversation.workspace_id).eq('user_id', user.id).maybeSingle();
    if (!membership) throw new ForbiddenError('You do not have access to this conversation');
    const { data: msg, error: msgError } = await admin.from('lena_messages').insert({ conversation_id: conversationId, workspace_id: conversation.workspace_id, sender_type: 'agent', sender_id: senderId, content }).select().single();
    if (msgError) throw msgError;
    await admin.from('lena_conversations').update({ mode: 'human', updated_at: new Date().toISOString() }).eq('id', conversationId).eq('workspace_id', conversation.workspace_id);
    return respond({ message: msg }, null);
  } catch (err: any) {
    logger.error({ err }, 'lena.messages.post.failed');
    const clientError = toClientError(err);
    return respond({ error: clientError.error, code: clientError.code }, null, { status: clientError.status });
  }
}

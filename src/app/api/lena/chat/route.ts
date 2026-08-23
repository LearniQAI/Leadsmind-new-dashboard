import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fingerprint, ipHash, issueLenaVisitorSession, verifyLenaVisitorSession, visitorSessionFromRequest } from '@/lib/lena/publicSession';
import { lenaCorsHeaders, validateAnyLenaEmbedOrigin, validateLenaEmbedOrigin } from '@/lib/lena/embedOrigin';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const WINDOW_MS = 60_000, MAX_PER_IP = 30, MAX_PER_FINGERPRINT = 10;
const reply = (body: unknown, origin: string | null, init?: ResponseInit) => NextResponse.json(body, { ...init, headers: { ...lenaCorsHeaders(origin, 'POST, OPTIONS'), ...(init?.headers || {}) } });

export async function OPTIONS(req: NextRequest) {
  const origin = await validateAnyLenaEmbedOrigin(supabase, req);
  return new NextResponse(null, { status: origin ? 204 : 403, headers: lenaCorsHeaders(origin, 'POST, OPTIONS') });
}

export async function POST(req: NextRequest) {
  let origin: string | null = null;
  try {
    const body = await req.json();
    const { workspaceId, visitorMessage } = body;
    const requestedConversationId = body.conversationId as string | undefined;
    if (!workspaceId || typeof visitorMessage !== 'string' || !visitorMessage.trim()) return reply({ error: 'workspaceId and visitorMessage are required' }, null, { status: 400 });
    origin = await validateLenaEmbedOrigin(supabase, req, workspaceId);
    if (!origin) return reply({ error: 'This workspace is not provisioned for this embed origin' }, null, { status: 403 });

    const session = verifyLenaVisitorSession(visitorSessionFromRequest(req));
    if (requestedConversationId && (!session || session.workspaceId !== workspaceId || session.conversationId !== requestedConversationId || session.origin !== origin)) {
      return reply({ error: 'A valid visitor session is required for this conversation' }, origin, { status: 401 });
    }

    // Rate-limit before a conversation can be created. UUID and visitorId rotation cannot
    // evade the separate IP and server-derived IP+UA/origin fingerprint buckets.
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const currentIpHash = ipHash(req), currentFingerprint = fingerprint(req, workspaceId, origin);
    const [{ count: ipCount, error: ipError }, { count: fingerprintCount, error: fingerprintError }] = await Promise.all([
      supabase.from('lena_rate_limit_events').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('ip_hash', currentIpHash).gte('created_at', since),
      supabase.from('lena_rate_limit_events').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('fingerprint_hash', currentFingerprint).gte('created_at', since),
    ]);
    if (ipError || fingerprintError) throw ipError || fingerprintError;
    if ((ipCount ?? 0) >= MAX_PER_IP || (fingerprintCount ?? 0) >= MAX_PER_FINGERPRINT) return reply({ error: 'Too many messages — please slow down and try again shortly.' }, origin, { status: 429 });
    const { error: rateError } = await supabase.from('lena_rate_limit_events').insert({ workspace_id: workspaceId, ip_hash: currentIpHash, fingerprint_hash: currentFingerprint });
    if (rateError) throw rateError;

    const visitorId = session?.visitorId || (typeof body.visitorId === 'string' && body.visitorId.length <= 128 ? body.visitorId : crypto.randomUUID());
    let conversationId = requestedConversationId;
    let humanMode = false;
    if (!conversationId) {
      const { data, error } = await supabase.from('lena_conversations').insert({ workspace_id: workspaceId, visitor_id: visitorId, status: 'active', mode: 'ai', lead_captured: false }).select('id').single();
      if (error) throw error;
      conversationId = data.id;
    } else {
      const { data, error } = await supabase.from('lena_conversations').select('mode').eq('id', conversationId).eq('workspace_id', workspaceId).eq('visitor_id', visitorId).maybeSingle();
      if (error) throw error;
      if (!data) return reply({ error: 'Conversation not found for this visitor session' }, origin, { status: 404 });
      humanMode = data.mode === 'human';
    }
    const visitorSession = issueLenaVisitorSession({ workspaceId, visitorId, conversationId, origin });
    const { error: messageError } = await supabase.from('lena_messages').insert({ conversation_id: conversationId, workspace_id: workspaceId, sender_type: 'visitor', sender_id: visitorId, content: visitorMessage.trim() });
    if (messageError) throw messageError;
    if (humanMode) return reply({ reply: null, mode: 'human', leadCaptured: false, conversationId, visitorSession }, origin);

    const { data: kbArticles, error: kbError } = await supabase.from('lena_knowledge_base').select('title, content').eq('workspace_id', workspaceId).eq('active', true);
    if (kbError) throw kbError;
    const { data: history } = await supabase.from('lena_messages').select('sender_type, content').eq('conversation_id', conversationId).eq('workspace_id', workspaceId).order('created_at', { ascending: true }).limit(10);
    const openAiKey = process.env.OPENAI_API_KEY;
    const kbText = kbArticles?.length ? kbArticles.map(a => `Title: ${a.title}\nContent: ${a.content}`).join('\n\n') : 'No knowledge base documents available.';
    let aiReply: string;
    if (!openAiKey) aiReply = "I am LENA. I've received your query, but our AI services are temporarily offline. A support representative will be with you shortly.";
    else {
      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', temperature: .2, messages: [{ role: 'system', content: `You are LENA, a concise professional support assistant. Use only this knowledge base for specific answers and offer a human handoff if unavailable.\n\n${kbText}` }, ...(history || []).slice(0, -1).map(m => ({ role: m.sender_type === 'visitor' ? 'user' : 'assistant', content: m.content })), { role: 'user', content: visitorMessage.trim() }] }) });
      if (!aiRes.ok) throw new Error(`OpenAI API error: ${aiRes.statusText}`);
      const aiData = await aiRes.json(); aiReply = aiData.choices?.[0]?.message?.content || 'I will connect you with a human support agent shortly.';
    }
    await supabase.from('lena_messages').insert({ conversation_id: conversationId, workspace_id: workspaceId, sender_type: 'ai', sender_id: 'lena_bot', content: aiReply });
    const human = !openAiKey || /connect you with a human|transfer you|connect you with an agent|live agent|human agent|chat with human|support representative/i.test(aiReply);
    await supabase.from('lena_conversations').update(human ? { status: 'waiting_agent', mode: 'human', updated_at: new Date().toISOString() } : { updated_at: new Date().toISOString() }).eq('id', conversationId).eq('workspace_id', workspaceId);
    return reply({ reply: aiReply, mode: human ? 'human' : 'ai', conversationId, visitorSession }, origin);
  } catch (error) {
    console.error('[LENA Visitor API Error]:', error);
    return reply({ error: 'Unable to process the LENA message' }, origin, { status: 500 });
  }
}

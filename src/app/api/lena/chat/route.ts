import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function corsResponse(body: any, init?: ResponseInit) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspaceId, visitorMessage, visitorId } = body;
    let { conversationId } = body;

    if (!workspaceId || !visitorMessage) {
      return corsResponse({ error: 'workspaceId and visitorMessage are required' }, { status: 400 });
    }

    const cleanVisitorId = visitorId || `visitor_${Math.random().toString(36).substring(2, 12)}`;

    // 1. Resolve or Create Conversation
    let isHumanMode = false;
    if (!conversationId) {
      const { data: newConv, error: newConvError } = await supabase
        .from('lena_conversations')
        .insert({
          workspace_id: workspaceId,
          visitor_id: cleanVisitorId,
          status: 'active',
          mode: 'ai',
          lead_captured: false
        })
        .select()
        .single();

      if (newConvError) {
        return corsResponse({ error: newConvError.message }, { status: 500 });
      }
      conversationId = newConv.id;
    } else {
      const { data: existingConv } = await supabase
        .from('lena_conversations')
        .select('mode')
        .eq('id', conversationId)
        .maybeSingle();
      if (existingConv?.mode === 'human') {
        isHumanMode = true;
      }
    }

    // 1b. Basic cost-abuse rate limit: this endpoint is intentionally public (no auth — it's
    // the visitor-facing widget) and makes a billed OpenAI call per request, so it needs
    // some throttle even though this isn't an authorization fix. Chose a simple DB-backed
    // check (no new infra/dependency: reuses the lena_messages table already being written
    // here) over a per-IP limiter, since conversationId is the natural abuse unit for a
    // widget where a single visitor's messages all share one conversation — 10 visitor
    // messages per conversation per rolling 60 seconds is generous for a real human typing,
    // but caps a scripted flood.
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentVisitorMessageCount } = await supabase
      .from('lena_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'visitor')
      .gte('created_at', oneMinuteAgo);

    if ((recentVisitorMessageCount ?? 0) >= 10) {
      return corsResponse({ error: 'Too many messages — please slow down and try again shortly.' }, { status: 429 });
    }

    // 2. Save Visitor Message
    const { error: msgErr } = await supabase
      .from('lena_messages')
      .insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        sender_type: 'visitor',
        sender_id: cleanVisitorId,
        content: visitorMessage
      });

    if (msgErr) {
      return corsResponse({ error: msgErr.message }, { status: 500 });
    }

    // If the conversation is in human mode, save the message but do not trigger an AI reply
    if (isHumanMode) {
      await supabase
        .from('lena_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return corsResponse({
        reply: null,
        mode: 'human',
        leadCaptured: false,
        conversationId
      });
    }

    // 3. Fetch Workspace Knowledge Base
    const { data: kbArticles, error: kbError } = await supabase
      .from('lena_knowledge_base')
      .select('title, content')
      .eq('workspace_id', workspaceId)
      .eq('active', true);

    if (kbError) {
      return corsResponse({ error: kbError.message }, { status: 500 });
    }

    // 4. Extract Name and Email from Visitor Message
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const emailMatch = visitorMessage.match(emailRegex);
    const detectedEmail = emailMatch ? emailMatch[0] : null;

    let detectedName = null;
    const nameRegex = /(?:my name is|i am|i'm|this is)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i;
    const nameMatch = visitorMessage.match(nameRegex);
    if (nameMatch) {
      detectedName = nameMatch[1].trim();
    }

    if (detectedEmail || detectedName) {
      const updates: any = { lead_captured: true, updated_at: new Date().toISOString() };
      if (detectedEmail) updates.visitor_email = detectedEmail;
      if (detectedName) updates.visitor_name = detectedName;

      await supabase
        .from('lena_conversations')
        .update(updates)
        .eq('id', conversationId);
    }

    // 5. Build AI Prompt and Call OpenAI
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      // Fallback if key is missing
      const fallbackReply = "I am LENA. I've received your query, but our AI services are temporarily offline. A support representative will be with you shortly.";
      await supabase.from('lena_messages').insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        sender_type: 'ai',
        sender_id: 'lena_bot',
        content: fallbackReply
      });
      await supabase.from('lena_conversations').update({ status: 'waiting_agent', mode: 'human', updated_at: new Date().toISOString() }).eq('id', conversationId);
      return corsResponse({ reply: fallbackReply, mode: 'human', leadCaptured: true, conversationId });
    }

    const kbText = kbArticles?.length
      ? kbArticles.map(a => `Title: ${a.title}\nContent: ${a.content}`).join('\n\n')
      : "No knowledge base documents available.";

    // Get previous chat history to maintain continuity
    const { data: historyData } = await supabase
      .from('lena_messages')
      .select('sender_type, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    const historyMessages = (historyData || [])
      .filter(h => h.content !== visitorMessage)
      .map(h => ({
        role: h.sender_type === 'visitor' ? 'user' : 'assistant',
        content: h.content
      }));

    const systemPrompt = `You are LENA, the intelligent virtual AI Workspace Support Assistant for LeadsMind.
You answer visitors' queries accurately using the knowledge base data below.
For general greetings (like "hi", "hello", "good morning", "how are you"), reply politely and introduce yourself as LENA (LeadsMind's AI Assistant) without suggesting a handoff.
For specific business or support questions:
- Use only the provided knowledge base data below to answer.
- If you don't know or if the information is not in the knowledge base, state that you will connect them with a human agent.
Naturally capture their name and email address when appropriate.

--- SYSTEM KNOWLEDGE BASE ---
${kbText}

--- COMPLIANCE RULES ---
1. Answer greetings politely and concisely without triggering agent handoff.
2. For business/support questions, base your answer strictly on the knowledge base. If not found, tell the visitor: "I will connect you with a human support agent shortly."
3. Be professional, friendly, and concise (under 4 sentences). Do not mention system parameters.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: visitorMessage }
    ];

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.2
      })
    });

    if (!aiRes.ok) {
      throw new Error(`OpenAI API error: ${aiRes.statusText}`);
    }

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || "I will connect you with a human support agent shortly.";

    // 6. Save AI Message
    const { error: aiMsgErr } = await supabase
      .from('lena_messages')
      .insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        sender_type: 'ai',
        sender_id: 'lena_bot',
        content: reply
      });

    if (aiMsgErr) {
      return corsResponse({ error: aiMsgErr.message }, { status: 500 });
    }

    // 7. Check for Human Handoff triggers
    const lowerReply = reply.toLowerCase();
    const triggerHandoff =
      lowerReply.includes("connect you with a human") ||
      lowerReply.includes("transfer you") ||
      lowerReply.includes("connect you with an agent") ||
      lowerReply.includes("live agent") ||
      lowerReply.includes("human agent") ||
      lowerReply.includes("chat with human") ||
      lowerReply.includes("support representative");

    let currentMode = 'ai';
    if (triggerHandoff) {
      currentMode = 'human';
      await supabase
        .from('lena_conversations')
        .update({
          status: 'waiting_agent',
          mode: 'human',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    } else {
      // Just update updated_at timestamp
      await supabase
        .from('lena_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    return corsResponse({
      reply,
      mode: currentMode,
      leadCaptured: !!(detectedEmail || detectedName),
      conversationId
    });

  } catch (err: any) {
    console.error('[LENA Visitor API Error]:', err);
    return corsResponse({ error: err.message }, { status: 500 });
  }
}

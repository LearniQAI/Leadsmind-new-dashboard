import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId');
    if (!conversationId) {
      return corsResponse({ error: 'conversationId required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('lena_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return corsResponse({ error: error.message }, { status: 500 });
    }

    // Check if agent is actively typing
    let isAgentTyping = false;
    const { data: conv } = await supabase
      .from('lena_conversations')
      .select('mode, agent_typing_until')
      .eq('id', conversationId)
      .maybeSingle();

    if (conv?.mode === 'human' && conv?.agent_typing_until) {
      isAgentTyping = new Date(conv.agent_typing_until).getTime() > Date.now();
    }

    return corsResponse({ 
      messages: data ?? [],
      isAgentTyping
    });
  } catch (err: any) {
    return corsResponse({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, workspaceId, content, senderId } = body;

    if (!conversationId || !workspaceId || !content) {
      return corsResponse({ error: 'conversationId, workspaceId, and content are required' }, { status: 400 });
    }

    const { data: msg, error: msgError } = await supabase
      .from('lena_messages')
      .insert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        sender_type: 'agent',
        sender_id: senderId,
        content
      })
      .select()
      .single();

    if (msgError) {
      return corsResponse({ error: msgError.message }, { status: 500 });
    }

    // Update conversation mode to human when agent responds, and touch updated_at
    await supabase
      .from('lena_conversations')
      .update({
        mode: 'human',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    return corsResponse({ message: msg });
  } catch (err: any) {
    return corsResponse({ error: err.message }, { status: 500 });
  }
}

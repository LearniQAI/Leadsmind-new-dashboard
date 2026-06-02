import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('lena_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, workspaceId, content, senderId } = body;

    if (!conversationId || !workspaceId || !content) {
      return NextResponse.json({ error: 'conversationId, workspaceId, and content are required' }, { status: 400 });
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
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // Update conversation mode to human when agent responds, and touch updated_at
    await supabase
      .from('lena_conversations')
      .update({
        mode: 'human',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    return NextResponse.json({ message: msg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

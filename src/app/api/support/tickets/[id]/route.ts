import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const [ticketRes, messagesRes] = await Promise.all([
      supabase.from('support_tickets').select('*, contact:contacts(*)').eq('id', params.id).single(),
      supabase.from('support_ticket_messages').select('*').eq('ticket_id', params.id).order('created_at', { ascending: true })
    ]);

    if (ticketRes.error) throw ticketRes.error;

    return NextResponse.json({ 
      ticket: ticketRes.data,
      messages: messagesRes.data || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { status, assigned_to, priority } = body;
    
    const supabase = createRouteHandlerClient({ cookies });
    
    const updates: any = {};
    if (status) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (priority) updates.priority = priority;

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

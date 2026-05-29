import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { PublicThreadClient } from './PublicThreadClient';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function PublicThreadPage({
  searchParams
}: {
  searchParams: { id?: string }
}) {
  const ticketId = searchParams.id;
  if (!ticketId) {
    return (
      <div className="min-h-screen bg-[#04091a] text-red-500 font-bold flex items-center justify-center p-6 text-center text-xs font-mono uppercase tracking-wider">
        ❌ Error: Ticket Reference ID is Missing
      </div>
    );
  }

  // Retrieve ticket details
  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('*, contact:contacts(*)')
    .eq('id', ticketId)
    .single();

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#04091a] text-red-500 font-bold flex items-center justify-center p-6 text-center text-xs font-mono uppercase tracking-wider">
        ❌ Error: Ticket reference not found
      </div>
    );
  }

  // Retrieve message history
  const { data: messages } = await supabaseAdmin
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .eq('is_internal_note', false)
    .order('created_at', { ascending: true });

  return (
    <PublicThreadClient 
      ticket={ticket} 
      initialMessages={messages || []} 
    />
  );
}

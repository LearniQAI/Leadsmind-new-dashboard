(global as any).WebSocket = class {};
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log("Starting LENA Chat Typing Diagnostic test...");
  
  // 1. Fetch an active conversation in human mode
  let conv, convErr;
  const res = await supabase
    .from('lena_conversations')
    .select('*')
    .eq('mode', 'human')
    .limit(1)
    .maybeSingle();
  conv = res.data;
  convErr = res.error;

  if (convErr) {
    console.error("Failed to fetch conversation:", convErr.message);
    process.exit(1);
  }

  if (!conv) {
    console.log("No active human conversation found. Fetching any conversation...");
    const { data: anyConv } = await supabase
      .from('lena_conversations')
      .select('*')
      .limit(1)
      .maybeSingle();
      
    if (!anyConv) {
      console.error("No conversations exist in the database! Please create one in the widget first.");
      process.exit(1);
    }
    
    // Set to human mode for testing
    console.log(`Using conversation: ${anyConv.id}. Setting mode to 'human'...`);
    await supabase.from('lena_conversations').update({ mode: 'human' }).eq('id', anyConv.id);
    conv = anyConv;
    conv.mode = 'human';
  } else {
    console.log(`Using active human conversation: ${conv.id}`);
  }

  const typingUntil = new Date(Date.now() + 10000).toISOString();
  console.log(`Updating agent_typing_until to: ${typingUntil}`);

  // 2. Perform PATCH to api
  const apiBase = 'http://localhost:3000'; // or test directly via route logic
  // Let's test the database update first
  const { data: updated, error: updateErr } = await supabase
    .from('lena_conversations')
    .update({ agent_typing_until: typingUntil })
    .eq('id', conv.id)
    .select()
    .single();

  if (updateErr) {
    console.error("Failed to update database directly:", updateErr.message);
  } else {
    console.log("Database updated directly. New value in db:", updated.agent_typing_until);
  }

  // Check messages GET api logic
  const checkUrl = `${apiBase}/api/lena/messages?conversationId=${conv.id}`;
  console.log(`Testing GET logic local execution...`);
  
  // Directly simulate GET messages handler logic
  let isAgentTyping = false;
  const { data: convCheck } = await supabase
    .from('lena_conversations')
    .select('mode, agent_typing_until')
    .eq('id', conv.id)
    .maybeSingle();

  console.log("Verification checks:");
  console.log("  Mode:", convCheck?.mode);
  console.log("  Agent Typing Until:", convCheck?.agent_typing_until);
  console.log("  Is in future?", convCheck?.agent_typing_until ? new Date(convCheck.agent_typing_until).getTime() > Date.now() : false);
}

run().catch(console.error);

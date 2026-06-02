import dotenv from 'dotenv';
import path from 'path';

// Load environment variables immediately before any imports to prevent hoisting issues
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iejtgefkoiyrnyeedigr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Ensure it is configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('==================================================');
  console.log('META CONVERSATIONS FINALIZATION COMPLIANCE TESTS');
  console.log('==================================================');

  // 1. Setup workspace and test contact
  const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
  if (!workspaces || workspaces.length === 0) {
    console.error('No workspaces found.');
    process.exit(1);
  }
  const workspaceId = workspaces[0].id;
  console.log(`Using Workspace ID: ${workspaceId}`);

  // Create clean contact
  const testPhone = '+15559998888';
  // Delete existing to start clean
  await supabase.from('contacts').delete().eq('phone', testPhone).eq('workspace_id', workspaceId);

  const { data: contact, error: contactErr } = await supabase
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      first_name: 'Compliance',
      last_name: 'TestUser',
      phone: testPhone,
      email: 'compliance-test@leadsmind.io',
      opted_in: true,
      opted_out: false
    })
    .select()
    .single();

  if (contactErr || !contact) {
    console.error('Failed to create test contact:', contactErr);
    process.exit(1);
  }
  console.log(`Created test contact: ${contact.id}`);

  // Create conversation
  const { data: conversation, error: convErr } = await supabase
    .from('conversations')
    .insert({
      workspace_id: workspaceId,
      contact_id: contact.id,
      platform: 'whatsapp',
      external_thread_id: 'test_compliance_thread',
      title: 'Compliance Test Conversation',
      last_message_at: new Date().toISOString()
    })
    .select()
    .single();

  if (convErr || !conversation) {
    console.error('Failed to create test conversation:', convErr);
    process.exit(1);
  }
  console.log(`Created test conversation: ${conversation.id}`);

  // Dynamically import Meta Webhook handler
  const { POST: webhookPOST } = await import('../src/app/api/webhooks/meta/route');

  // -----------------------------------------------------------------
  // TEST 1: Inbound WhatsApp message updates 24h compliance window
  // -----------------------------------------------------------------
  console.log('\n[TEST 1] Inbound message updates last_customer_message_at');
  
  const mockPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'mock_waba_789',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '27720000000',
            phone_number_id: 'mock_phone_012'
          },
          contacts: [{
            profile: { name: 'Compliance TestUser' },
            wa_id: '15559998888'
          }],
          messages: [{
            from: '15559998888',
            id: 'msg_compliance_123',
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: { body: 'Hello there' }
          }]
        }
      }]
    }]
  };

  const req = new Request(`http://localhost/api/webhooks/meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockPayload)
  });

  const response = await webhookPOST(req);
  console.log(`Webhook response status: ${response.status}`);

  // Verify conversation's last_customer_message_at
  const { data: updatedConv } = await supabase
    .from('conversations')
    .select('last_customer_message_at')
    .eq('id', conversation.id)
    .single();

  if (updatedConv && updatedConv.last_customer_message_at) {
    console.log(`SUCCESS: last_customer_message_at is updated: ${updatedConv.last_customer_message_at}`);
  } else {
    console.error('FAIL: last_customer_message_at is not updated.');
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // TEST 2: Compliance Opt-Out Keyword 'STOP'
  // -----------------------------------------------------------------
  console.log('\n[TEST 2] Inbound "STOP" triggers opt-out compliance');

  const stopPayload = {
    ...mockPayload,
    entry: [{
      ...mockPayload.entry[0],
      changes: [{
        ...mockPayload.entry[0].changes[0],
        value: {
          ...mockPayload.entry[0].changes[0].value,
          messages: [{
            ...mockPayload.entry[0].changes[0].value.messages[0],
            id: 'msg_compliance_stop',
            text: { body: '  STOP  ' } // test trimming and case sensitivity
          }]
        }
      }]
    }]
  };

  const reqStop = new Request(`http://localhost/api/webhooks/meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stopPayload)
  });

  const stopResponse = await webhookPOST(reqStop);
  console.log(`STOP Webhook response status: ${stopResponse.status}`);

  // Check contact's opt_out flag
  const { data: optedOutContact } = await supabase
    .from('contacts')
    .select('opted_in, opted_out, opt_out_date')
    .eq('id', contact.id)
    .single();

  if (optedOutContact && optedOutContact.opted_out === true && optedOutContact.opted_in === false && optedOutContact.opt_out_date) {
    console.log(`SUCCESS: Contact opted_out set to true, opted_in set to false, opt_out_date recorded: ${optedOutContact.opt_out_date}`);
  } else {
    console.error('FAIL: Contact opt-out flags incorrect:', optedOutContact);
    process.exit(1);
  }

  // Check compliance note inserted in conversation
  const { data: stopMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .eq('direction', 'note')
    .order('sent_at', { ascending: false });

  if (stopMessages && stopMessages.length > 0 && stopMessages[0].content.includes('SYSTEM COMPLIANCE NOTE')) {
    console.log(`SUCCESS: System compliance note successfully logged in conversation thread.`);
  } else {
    console.error('FAIL: Compliance note missing in messages table:', stopMessages);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // TEST 3: Compliance Opt-In Keyword 'START'
  // -----------------------------------------------------------------
  console.log('\n[TEST 3] Inbound "START" triggers opt-in compliance');

  const startPayload = {
    ...mockPayload,
    entry: [{
      ...mockPayload.entry[0],
      changes: [{
        ...mockPayload.entry[0].changes[0],
        value: {
          ...mockPayload.entry[0].changes[0].value,
          messages: [{
            ...mockPayload.entry[0].changes[0].value.messages[0],
            id: 'msg_compliance_start',
            text: { body: 'START' }
          }]
        }
      }]
    }]
  };

  const reqStart = new Request(`http://localhost/api/webhooks/meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(startPayload)
  });

  const startResponse = await webhookPOST(reqStart);
  console.log(`START Webhook response status: ${startResponse.status}`);

  // Check contact's opt_out flag
  const { data: optedInContact } = await supabase
    .from('contacts')
    .select('opted_in, opted_out, opt_out_date')
    .eq('id', contact.id)
    .single();

  if (optedInContact && optedInContact.opted_out === false && optedInContact.opted_in === true && optedInContact.opt_out_date === null) {
    console.log('SUCCESS: Contact opted_in set to true, opted_out set to false, opt_out_date cleared.');
  } else {
    console.error('FAIL: Contact opt-in flags incorrect:', optedInContact);
    process.exit(1);
  }

  // -----------------------------------------------------------------
  // Clean up
  // -----------------------------------------------------------------
  await supabase.from('messages').delete().eq('conversation_id', conversation.id);
  await supabase.from('conversations').delete().eq('id', conversation.id);
  await supabase.from('contacts').delete().eq('id', contact.id);
  
  console.log('\n==================================================');
  console.log('ALL FINALIZATION COMPLIANCE TESTS PASSED');
  console.log('==================================================');
}

runTests().catch((err) => {
  console.error('Unhandled test run error:', err);
  process.exit(1);
});

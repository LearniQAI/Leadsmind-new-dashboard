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
  console.log('META CHANNELS PHASE 2 PRD INTEGRATION QA TESTS');
  console.log('==================================================');

  // Dynamically import routes
  const { GET: oauthGET } = await import('../src/app/api/auth/meta/callback/route');
  const { POST: webhookPOST } = await import('../src/app/api/webhooks/meta/route');
  const { MetaAdapter } = await import('../src/lib/meta/MetaAdapter');

  // 1. Setup Workspace for isolation testing
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1);

  if (wsError || !workspaces || workspaces.length === 0) {
    console.error('No workspaces found in the database. Run seed first.');
    process.exit(1);
  }

  const testWorkspaceId = workspaces[0].id;
  console.log(`Using Test Workspace ID: ${testWorkspaceId}`);

  // Clean old test connections to avoid interference
  await supabase
    .from('platform_connections')
    .delete()
    .eq('workspace_id', testWorkspaceId)
    .in('platform', ['facebook', 'instagram', 'whatsapp']);

  console.log('\n[TEST 1] Testing Meta OAuth Connection (Phase 1)');
  // Simulating GET /api/auth/meta/callback with code=mock_code and state=workspaceId
  const callbackReq = new Request(`http://localhost:3000/api/auth/meta/callback?code=mock_code&state=${testWorkspaceId}`);
  const callbackRes = await oauthGET(callbackReq);
  console.log(`Callback Response status: ${callbackRes.status}`);

  // Verify connections exist in DB
  const { data: connections, error: connErr } = await supabase
    .from('platform_connections')
    .select('platform, credentials, status')
    .eq('workspace_id', testWorkspaceId)
    .in('platform', ['facebook', 'instagram', 'whatsapp']);

  if (connErr || !connections || connections.length !== 3) {
    console.error(`FAIL: Platform connections not created correctly. Found ${connections?.length || 0}/3`);
    process.exit(1);
  }
  console.log('SUCCESS: All 3 platform connections (facebook, instagram, whatsapp) created.');

  console.log('\n[TEST 2] Media Message Ingestion (Phase 2 - Media)');
  // Simulate WhatsApp Inbound Media (Image) message
  const waMediaMsgId = `mock_wa_media_${Date.now()}`;
  const waSenderPhone = '+27721234567';
  const waMediaPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'mock_waba_789',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '27720000000',
                phone_number_id: 'mock_phone_012'
              },
              contacts: [{ profile: { name: 'Test WA Media User' }, wa_id: '27721234567' }],
              messages: [
                {
                  from: '27721234567',
                  id: waMediaMsgId,
                  timestamp: '1600000000',
                  type: 'image',
                  image: {
                    id: 'mock_media_id_123',
                    mime_type: 'image/jpeg'
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const waRes = await webhookPOST(new Request('http://localhost:3000/api/webhooks/meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(waMediaPayload)
  }));
  console.log(`WhatsApp Media Webhook response status: ${waRes.status}`);

  // Retrieve message from DB and assert metadata structure
  const { data: dbMediaMsg } = await supabase
    .from('messages')
    .select('id, metadata, content')
    .eq('external_id', waMediaMsgId)
    .single();

  if (!dbMediaMsg || !dbMediaMsg.metadata) {
    console.error('FAIL: WhatsApp Media message metadata not stored in DB!');
    process.exit(1);
  }

  const metaObj = dbMediaMsg.metadata as any;
  if (!metaObj.media_url || metaObj.media_type !== 'image/jpeg') {
    console.error('FAIL: WhatsApp Media metadata values mismatch!', metaObj);
    process.exit(1);
  }
  console.log(`SUCCESS: WhatsApp Inbound Media Ingestion verified. URL: "${metaObj.media_url}", Type: "${metaObj.media_type}"`);

  console.log('\n[TEST 3] Delivery Webhooks and Status Update (Phase 2 - Status)');
  // Seed an outbound message to update status via Webhook later
  const { data: activeConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('workspace_id', testWorkspaceId)
    .eq('platform', 'whatsapp')
    .limit(1)
    .single();

  const outboundMsgId = `mock_wa_outbound_mid_${Date.now()}`;
  const { data: testMsg, error: insertErr } = await supabase
    .from('messages')
    .insert({
      workspace_id: testWorkspaceId,
      conversation_id: activeConv.id,
      direction: 'outbound',
      content: 'This is an outbound test message',
      status: 'sent',
      external_id: outboundMsgId,
      sender_handle: 'system'
    })
    .select()
    .single();

  if (insertErr || !testMsg) {
    console.error('FAIL: Seeding outbound message failed:', insertErr);
    process.exit(1);
  }
  console.log(`Seeded outbound test message with ID: ${testMsg.id}`);

  // Simulate WhatsApp Delivery Status callback ('delivered')
  const statusPayloadDelivered = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'mock_waba_789',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '27720000000',
                phone_number_id: 'mock_phone_012'
              },
              statuses: [
                {
                  id: outboundMsgId,
                  status: 'delivered',
                  timestamp: '1600000002',
                  recipient_id: '27721234567'
                }
              ]
            }
          }
        ]
      }
    ]
  };

  await webhookPOST(new Request('http://localhost:3000/api/webhooks/meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusPayloadDelivered)
  }));

  // Assert message status is updated to 'delivered'
  const { data: checkDelivered, error: delivErr } = await supabase
    .from('messages')
    .select('status')
    .eq('id', testMsg.id)
    .single();

  if (delivErr || !checkDelivered) {
    console.error('FAIL: Querying delivered message failed:', delivErr);
    process.exit(1);
  }

  if (checkDelivered.status !== 'delivered') {
    console.error(`FAIL: Outbound message status not updated to 'delivered'! Status is: ${checkDelivered.status}`);
    process.exit(1);
  }
  console.log('SUCCESS: Outbound status successfully updated to "delivered".');

  // Simulate WhatsApp Status callback ('read')
  const statusPayloadRead = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'mock_waba_789',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '27720000000',
                phone_number_id: 'mock_phone_012'
              },
              statuses: [
                {
                  id: outboundMsgId,
                  status: 'read',
                  timestamp: '1600000004',
                  recipient_id: '27721234567'
                }
              ]
            }
          }
        ]
      }
    ]
  };

  await webhookPOST(new Request('http://localhost:3000/api/webhooks/meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusPayloadRead)
  }));

  const { data: checkRead, error: readErr } = await supabase
    .from('messages')
    .select('status')
    .eq('id', testMsg.id)
    .single();

  if (readErr || !checkRead) {
    console.error('FAIL: Querying read message failed:', readErr);
    process.exit(1);
  }

  if (checkRead.status !== 'read') {
    console.error(`FAIL: Outbound message status not updated to 'read'! Status is: ${checkRead.status}`);
    process.exit(1);
  }
  console.log('SUCCESS: Outbound status successfully updated to "read".');

  // Simulate WhatsApp Status callback ('failed')
  const statusPayloadFailed = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'mock_waba_789',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '27720000000',
                phone_number_id: 'mock_phone_012'
              },
              statuses: [
                {
                  id: outboundMsgId,
                  status: 'failed',
                  timestamp: '1600000006',
                  recipient_id: '27721234567',
                  errors: [
                    {
                      code: 131042,
                      message: 'Media upload failed'
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    ]
  };

  await webhookPOST(new Request('http://localhost:3000/api/webhooks/meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusPayloadFailed)
  }));

  const { data: checkFailed, error: failErr } = await supabase
    .from('messages')
    .select('status, metadata')
    .eq('id', testMsg.id)
    .single();

  if (failErr || !checkFailed) {
    console.error('FAIL: Querying failed message failed:', failErr);
    process.exit(1);
  }

  const failedMeta = checkFailed.metadata as any;
  if (checkFailed.status !== 'failed' || failedMeta?.error_message !== 'Media upload failed') {
    console.error(`FAIL: Outbound message status / error_message failed! Status: ${checkFailed.status}, Error: ${failedMeta?.error_message}`);
    process.exit(1);
  }
  console.log(`SUCCESS: Outbound status successfully updated to "failed" with error details.`);

  console.log('\n==================================================');
  console.log('ALL PHASE 2 PRD QA TESTS PASSED');
  console.log('==================================================');
}

runTests().catch((e) => {
  console.error('Error running Phase 2 QA tests:', e);
  process.exit(1);
});

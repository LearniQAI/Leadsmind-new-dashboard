import dotenv from 'dotenv';
import path from 'path';

// Load environment variables immediately
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { sendVoiceNoteEmail } from '../src/lib/voicenotes/voiceNoteEmail';
import { sendVoiceNoteWhatsApp } from '../src/lib/voicenotes/voiceNoteWhatsApp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iejtgefkoiyrnyeedigr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Ensure it is configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelivery() {
  console.log('==================================================');
  console.log('VOICE NOTE IDENTITY DELIVERY TEST SUITE');
  console.log('==================================================');

  // 1. Fetch Workspace
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, name')
    .limit(1);

  if (wsError || !workspaces || workspaces.length === 0) {
    console.error('No workspaces found in the database.');
    process.exit(1);
  }
  const workspace = workspaces[0];
  console.log(`Using Workspace: ${workspace.name} (${workspace.id})`);

  // 2. Fetch or create a mock sender
  const sender = {
    first_name: 'Test',
    last_name: 'Copilot',
    full_name: 'Test Copilot',
    job_title: 'Sales Engineer',
    identity_color: '#5C4AC7',
    profile_photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    avatar_preset_id: null
  };

  const testAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

  // 3. Run Email test
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  console.log(`\n[EMAIL TEST] Sending voice note email to: ${testEmail}...`);
  try {
    const emailResult = await sendVoiceNoteEmail({
      workspaceId: workspace.id,
      toEmail: testEmail,
      sender,
      audioUrl: testAudioUrl,
      audioDuration: 120, // 2 minutes
      message: 'Hello, this is a test of the branded voice note email delivery!'
    });
    console.log('Email delivery success:', emailResult);
  } catch (err: any) {
    console.error('Email delivery failed:', err.message || err);
  }

  // 4. Run WhatsApp test
  const testPhone = process.env.TEST_PHONE || '+27721234567';
  console.log(`\n[WHATSAPP TEST] Sending voice note WhatsApp to: ${testPhone}...`);
  try {
    const waResult = await sendVoiceNoteWhatsApp({
      workspaceId: workspace.id,
      toNumber: testPhone,
      sender,
      audioUrl: testAudioUrl
    });
    console.log('WhatsApp delivery success:', waResult);
  } catch (err: any) {
    console.error('WhatsApp delivery failed (might require valid credentials/approval):', err.message || err);
  }

  console.log('\n==================================================');
  console.log('TEST SUITE EXECUTION COMPLETE');
  console.log('==================================================');
}

testDelivery().catch(console.error);

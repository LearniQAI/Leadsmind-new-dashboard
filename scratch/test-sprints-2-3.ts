(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import { POST } from '../src/app/api/crm/contacts/kyc/route';
import { NextRequest } from 'next/server';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runTests() {
  console.log('==================================================');
  console.log('      SPRINTS 2 & 3 KYC/AML INTEGRATION TESTS     ');
  console.log('==================================================\n');

  // Fetch a real workspace to bind test entries
  const { data: workspaces, error: wsErr } = await supabase.from('workspaces').select('id').limit(1);
  if (wsErr || !workspaces || workspaces.length === 0) {
    console.error('Cannot run tests: No workspace found.');
    return;
  }
  const workspaceId = workspaces[0].id;
  const testContactId = '00000000-0000-0000-0000-000000000999';

  console.log(`Using test workspace: ${workspaceId}`);
  console.log(`Setting up test contact record...`);

  // Setup: Ensure test contact exists with POPIA consent 'obtained'
  // 1. Delete previous test data
  await supabase.from('kyc_checks').delete().eq('contact_id', testContactId);
  await supabase.from('kyc_consent').delete().eq('contact_id', testContactId);
  await supabase.from('contacts').delete().eq('id', testContactId);

  // 2. Insert test contact (low risk initially)
  const { error: cErr } = await supabase.from('contacts').insert({
    id: testContactId,
    workspace_id: workspaceId,
    first_name: 'Lungile',
    last_name: 'Dlamini',
    email: 'lungile@dlaminicorp.co.za',
    id_number: '9201015080085',
    kyc_risk_flag: 'LOW',
    kyc_id_verified: false
  });

  if (cErr) {
    console.error('Failed to create test contact. Have you applied the SQL migrations? Details:', cErr.message);
    return;
  }

  // 3. Obtain POPIA consent
  const { error: consentErr } = await supabase.from('kyc_consent').insert({
    workspace_id: workspaceId,
    contact_id: testContactId,
    status: 'obtained',
    check_types: ['hanis_identity', 'sanctions_screen'],
    reference: `test_consent_${Date.now()}`
  });

  if (consentErr) {
    console.error('Failed to create test consent:', consentErr.message);
    return;
  }

  console.log('Setup successfully completed. Running test cases...\n');

  // ----------------------------------------------------------------
  // Case 1: Normal ID Verification
  // ----------------------------------------------------------------
  console.log('--- Case 1: Normal Identity Verification (TransUnion) ---');
  let response = await POST(
    new NextRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'hanis_identity',
        provider: 'TransUnion',
        consentGiven: true
      })
    })
  );
  let result = await response.json();
  console.log('Result status code:', response.status);
  console.log('Check result notes:', result.check?.notes);
  console.log('Check status:', result.check?.status);

  // Verify contact updated
  let { data: contact1 } = await supabase.from('contacts').select('*').eq('id', testContactId).single();
  console.log('Contact verification state: kyc_id_verified =', contact1.kyc_id_verified, ', kyc_risk_flag =', contact1.kyc_risk_flag);

  // ----------------------------------------------------------------
  // Case 2: Deceased Check Blocker
  // ----------------------------------------------------------------
  console.log('\n--- Case 2: Deceased SA ID Check (TransUnion) ---');
  // Update contact ID to end with 8080 (triggers deceased state)
  await supabase.from('contacts').update({ id_number: '9201015088080' }).eq('id', testContactId);

  response = await POST(
    new NextRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'hanis_identity',
        provider: 'TransUnion',
        consentGiven: true
      })
    })
  );
  result = await response.json();
  console.log('Result status code:', response.status);
  console.log('Check notes:', result.check?.notes);
  console.log('Check status:', result.check?.status);

  let { data: contact2 } = await supabase.from('contacts').select('*').eq('id', testContactId).single();
  console.log('Contact verification state: kyc_id_verified =', contact2.kyc_id_verified, ', kyc_risk_flag =', contact2.kyc_risk_flag);

  // ----------------------------------------------------------------
  // Case 3: Fraud Indicator Check
  // ----------------------------------------------------------------
  console.log('\n--- Case 3: Fraud Indicator Check (TransUnion) ---');
  // Reset contact state and ID to end with 9999 (triggers fraud state)
  await supabase.from('contacts').update({ id_number: '9201015089999', kyc_risk_flag: 'LOW', kyc_id_verified: false }).eq('id', testContactId);

  response = await POST(
    new NextRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'hanis_identity',
        provider: 'TransUnion',
        consentGiven: true
      })
    })
  );
  result = await response.json();
  console.log('Result status code:', response.status);
  console.log('Check notes:', result.check?.notes);
  console.log('Check status:', result.check?.status);

  let { data: contact3 } = await supabase.from('contacts').select('*').eq('id', testContactId).single();
  console.log('Contact verification state: kyc_id_verified =', contact3.kyc_id_verified, ', kyc_risk_flag =', contact3.kyc_risk_flag);

  // ----------------------------------------------------------------
  // Case 4: Compliance Lock Override Block
  // ----------------------------------------------------------------
  console.log('\n--- Case 4: Compliance Lock SQL Enforcement ---');
  console.log('Attempting manual override database update setting kyc_id_verified = true for HIGH risk contact...');
  const { error: overrideErr } = await supabase
    .from('contacts')
    .update({ kyc_id_verified: true })
    .eq('id', testContactId);

  if (overrideErr) {
    console.log('✅ PASS: DB Trigger compliance block successfully intercepted manual FICA bypass!');
    console.log('Error caught:', overrideErr.message);
  } else {
    console.error('❌ FAIL: DB Trigger compliance block did not lock verification!');
  }

  // ----------------------------------------------------------------
  // Case 5: AML Sanctions Match
  // ----------------------------------------------------------------
  console.log('\n--- Case 5: AML Sanctions screening match (Refinitiv) ---');
  // 1. Reset contact name to trigger strong match, and risk flag to LOW
  await supabase.from('contacts').update({
    first_name: 'Sanctioned',
    last_name: 'Terrorist',
    kyc_risk_flag: 'LOW',
    kyc_id_verified: false
  }).eq('id', testContactId);

  // 2. Create mock open opportunity linked to contact
  const testOppId = '00000000-0000-0000-0000-000000000888';
  await supabase.from('opportunities').delete().eq('id', testOppId);
  
  // Find pipeline stage
  const { data: stages } = await supabase.from('pipeline_stages').select('id').eq('workspace_id', workspaceId).limit(1);
  if (stages && stages.length > 0) {
    await supabase.from('opportunities').insert({
      id: testOppId,
      workspace_id: workspaceId,
      contact_id: testContactId,
      stage_id: stages[0].id,
      title: 'Deal with high-risk contact',
      value: 50000.00,
      status: 'open'
    });
    console.log('Created temporary open opportunity to verify deal halting.');
  }

  // 3. Trigger sanctions screen
  response = await POST(
    new NextRequest('http://localhost/api/crm/contacts/kyc', {
      method: 'POST',
      body: JSON.stringify({
        contactId: testContactId,
        workspaceId,
        checkType: 'sanctions_screen',
        provider: 'Refinitiv',
        consentGiven: true
      })
    })
  );
  result = await response.json();
  console.log('Result status code:', response.status);
  console.log('Check match level:', result.check?.aml_match_level);
  console.log('Check status:', result.check?.status);

  // 4. Verify opportunity automatically halted by DB trigger
  if (stages && stages.length > 0) {
    const { data: opp } = await supabase.from('opportunities').select('status').eq('id', testOppId).single();
    if (opp?.status === 'lost') {
      console.log('✅ PASS: Trigger tr_on_kyc_checks_change successfully halted CRM deals!');
    } else {
      console.error('❌ FAIL: CRM deal was not automatically halted. Status is:', opp?.status);
    }
  }

  // 5. Verify system alert notification created
  const { data: alerts } = await supabase
    .from('notifications')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('type', 'system')
    .order('created_at', { ascending: false })
    .limit(1);

  if (alerts && alerts.length > 0 && alerts[0].title.includes('Critical AML Alert')) {
    console.log('✅ PASS: Critical notifications successfully logged for owners/admins!');
    console.log('Notification message:', alerts[0].message);
  } else {
    console.error('❌ FAIL: Critical system alert was not logged.');
  }

  // ----------------------------------------------------------------
  // Clean Up
  // ----------------------------------------------------------------
  console.log('\nTearing down test data...');
  if (stages && stages.length > 0) {
    await supabase.from('opportunities').delete().eq('id', testOppId);
  }
  await supabase.from('kyc_checks').delete().eq('contact_id', testContactId);
  await supabase.from('kyc_consent').delete().eq('contact_id', testContactId);
  await supabase.from('contacts').delete().eq('id', testContactId);
  console.log('Teardown complete.');
}

runTests().catch(console.error);

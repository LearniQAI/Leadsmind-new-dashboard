import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

global.WebSocket = class {} as any;

import { createAdminClient } from '../src/lib/supabase/server';
import { WorkflowEngine } from '../src/lib/automations/WorkflowEngine';

async function runTest() {
  console.log('--- STARTING SPRINT 4 AUTOMATION TEST SUITE ---');
  const supabase = createAdminClient();

  // 1. Create mock workspace
  console.log('1. Creating mock workspace...');
  const { data: member } = await supabase
    .from('workspace_members')
    .select('user_id')
    .limit(1)
    .maybeSingle();

  const ownerId = member?.user_id;
  if (!ownerId) {
    console.error('No workspace members found in DB to use as owner_id');
    process.exit(1);
  }

  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({
      name: 'Test Workspace ' + Date.now(),
      slug: 'test-ws-' + Date.now(),
      owner_id: ownerId,
      resend_api_key: 're_mock_test_key',
      twilio_sid: 'AC_mock_sid',
      twilio_token: 'mock_token',
      twilio_number: '+15005550006'
    })
    .select('id')
    .single();

  if (wsErr || !ws) {
    console.error('Failed to create mock workspace:', wsErr);
    process.exit(1);
  }
  const workspaceId = ws.id;
  console.log('Created workspace:', workspaceId);

  // 2. Create mock contact
  console.log('2. Creating mock contact...');
  const { data: contact, error: cErr } = await supabase
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      first_name: 'Pieter',
      last_name: 'Botha',
      email: 'pieter@test.co.za',
      phone: '+27821234567',
      primary_channel: 'email'
    })
    .select('id')
    .single();

  if (cErr || !contact) {
    console.error('Failed to create mock contact:', cErr);
    process.exit(1);
  }
  const contactId = contact.id;
  console.log('Created contact:', contactId);

  // 3. Create mock workflows/steps (Invoice Overdue Chase recipe)
  console.log('3. Creating Invoice Overdue Chase workflow...');
  const { data: wf, error: wfErr } = await supabase
    .from('workflows')
    .insert({
      workspace_id: workspaceId,
      name: 'Invoice Overdue Chase Test',
      description: 'Test sequence for invoice chases',
      trigger_type: 'invoice_overdue',
      is_active: true,
      goal_rules: [{ field: 'invoice_paid', operator: 'equals', value: true }]
    })
    .select('id')
    .single();

  if (wfErr || !wf) {
    console.error('Failed to create workflow:', wfErr);
    process.exit(1);
  }
  const workflowId = wf.id;

  // Insert steps:
  // Step 1: Wait 1 sec
  // Step 2: Send Email (using bounce@leadsmind.io to trigger bounce)
  await supabase.from('workflow_steps').insert([
    {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      position: 1,
      type: 'wait',
      config: { delaySeconds: 1 }
    },
    {
      workflow_id: workflowId,
      workspace_id: workspaceId,
      position: 2,
      type: 'send_email',
      config: {
        templateType: 'custom_followup',
        subject: 'Overdue Invoice ZAR 1500',
        body: 'Please pay ZAR 1500 overdue invoice',
        toEmail: 'bounce@leadsmind.io',
        backup_whatsapp_body: 'Fallback text: Your invoice of ZAR 1500 is overdue, Pieter.'
      }
    }
  ]);
  console.log('Workflow and steps created.');

  // TEST CASE 1: Hard Bounce Failover & WhatsApp Routing
  console.log('\n--- TEST CASE 1: Triggering email hard bounce & WhatsApp fallback ---');
  await WorkflowEngine.runWorkflow(workflowId, {
    workspaceId,
    formName: 'Test Invoice Form',
    values: {
      email: 'bounce@leadsmind.io',
      first_name: 'Pieter',
      invoice_amount_zar: '1500',
      invoice_number: 'INV-1002'
    }
  });

  // Wait for background workflow to finish
  console.log('Waiting for workflow execution to complete...');
  let execution: any = null;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const { data } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (data && data.status !== 'running') {
      execution = data;
      break;
    }
  }

  if (!execution) {
    console.error('Workflow execution timed out or failed to start.');
    process.exit(1);
  }

  console.log('Workflow Execution status:', execution.status);
  console.log('Workflow Execution current_step:', execution.current_step);

  // Assert contact is marked invalid and switched to whatsapp
  const { data: updatedContact } = await supabase
    .from('contacts')
    .select('primary_channel, is_invalid_email')
    .eq('id', contactId)
    .single();

  console.log('Updated Contact channel:', updatedContact?.primary_channel);
  console.log('Updated Contact is_invalid_email:', updatedContact?.is_invalid_email);

  if (updatedContact?.primary_channel !== 'whatsapp' || !updatedContact?.is_invalid_email) {
    console.error('FAIL: Contact primary channel was not switched to whatsapp or marked invalid!');
    process.exit(1);
  }
  console.log('SUCCESS: Contact channel updated correctly.');

  // Assert activity redirect log
  const { data: activities } = await supabase
    .from('contact_activities')
    .select('description')
    .eq('contact_id', contactId)
    .eq('type', 'system');

  console.log('Logged activities:', activities?.map(a => a.description));
  if (!activities || activities.length === 0) {
    console.error('FAIL: No activity logged for redirect/failover.');
    process.exit(1);
  }
  console.log('SUCCESS: Activity logs recorded fallback.');


  // TEST CASE 2: Goal Tracking Interceptor Early Termination
  console.log('\n--- TEST CASE 2: Goal tracking interceptor ---');
  // First, mock that Pieter has paid his invoice
  console.log('Mocking that Pieter has paid invoice...');
  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      amount_due: 1500.00,
      amount_paid: 1500.00,
      status: 'paid'
    })
    .select('id')
    .single();

  if (invErr || !inv) {
    console.error('Failed to create mock paid invoice:', invErr);
    process.exit(1);
  }

  // Delete previous execution to prevent collision
  await supabase
    .from('workflow_executions')
    .delete()
    .eq('workflow_id', workflowId);

  // Run workflow again
  await WorkflowEngine.runWorkflow(workflowId, {
    workspaceId,
    formName: 'Test Invoice Form',
    values: {
      email: 'pieter@test.co.za',
      first_name: 'Pieter',
      invoice_amount_zar: '1500',
      invoice_number: 'INV-1002'
    }
  });

  // Wait and check execution
  console.log('Waiting for workflow execution...');
  let execution2: any = null;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    const { data } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (data && data.status !== 'running') {
      execution2 = data;
      break;
    }
  }

  console.log('Workflow Execution 2 status:', execution2?.status);
  console.log('Workflow Execution 2 current_step:', execution2?.current_step);
  console.log('Workflow Execution 2 error_message:', execution2?.error_message);

  if (execution2?.status !== 'completed' || execution2?.current_step !== 0) {
    console.error('FAIL: Workflow did not terminate early at step 0 when goal was met!');
    process.exit(1);
  }
  console.log('SUCCESS: Goal met interceptor terminated workflow instantly!');

  // Cleanup mock tables
  console.log('\nCleaning up mock data...');
  await supabase.from('workspaces').delete().eq('id', workspaceId);
  console.log('Cleanup completed.');

  console.log('\n--- ALL TEST CASES PASSED SUCCESSFULLY ---');
}

runTest().catch(err => {
  console.error('Test run crashed:', err);
  process.exit(1);
});

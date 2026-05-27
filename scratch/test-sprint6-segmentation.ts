import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Prevent WebSocket connection issues on Node.js
global.WebSocket = class {} as any;

import { createAdminClient } from '../src/lib/supabase/server';
import { SegmentationCompiler, RuleGroup } from '../src/lib/intelligence/SegmentationCompiler';
import { LeadScoringEngine } from '../src/lib/intelligence/LeadScoringEngine';

async function runTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING SPRINT 6 SYSTEM SEGMENTATION & SCORING');
  console.log('==================================================\n');

  const supabase = createAdminClient();
  let passedAll = true;

  // Resolve a valid admin user for mock ownership
  const { data: member } = await supabase
    .from('workspace_members')
    .select('user_id')
    .limit(1)
    .maybeSingle();

  const ownerId = member?.user_id;
  if (!ownerId) {
    console.error('No workspace members found in database to use as owner_id');
    process.exit(1);
  }

  // 1. Setup Sandbox Workspace and Contacts
  console.log('1. Setting up sandboxed testing environment...');
  const tempWorkspaceName = 'Sprint6 Test Workspace ' + Date.now();
  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({
      name: tempWorkspaceName,
      slug: 'sprint6-test-' + Date.now(),
      owner_id: ownerId
    })
    .select('id')
    .single();

  if (wsErr || !ws) {
    console.error('❌ Failed to create sandbox workspace:', wsErr);
    process.exit(1);
  }
  const workspaceId = ws.id;
  console.log(`- Created Sandbox Workspace: ${workspaceId}`);

  // Add member to workspace_members so admins query resolves successfully
  const { error: memberErr } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: ownerId,
      role: 'admin'
    });

  if (memberErr) {
    console.error('❌ Failed to add workspace member:', memberErr);
    await supabase.from('workspaces').delete().eq('id', workspaceId);
    process.exit(1);
  }
  console.log(`- Added workspace admin member for testing`);

  // Create test contact
  const { data: contact, error: cErr } = await supabase
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      first_name: 'Habeeb',
      last_name: 'Developer',
      email: 'habeeb@sprint6test.co.za',
      phone: '+27829998888',
      lead_score: 10,
      lead_score_explanation: 'Initial Test Score',
      tags: ['test-tag'],
      owner_id: ownerId
    })
    .select('*')
    .single();

  if (cErr || !contact) {
    console.error('❌ Failed to create sandbox contact:', cErr);
    // Cleanup workspace
    await supabase.from('workspaces').delete().eq('id', workspaceId);
    process.exit(1);
  }
  const contactId = contact.id;
  console.log(`- Created Sandbox Contact: ${contactId} (${contact.first_name} ${contact.last_name})`);

  console.log('');

  // ----------------------------------------------------
  // TEST 1: Segmentation SQL Query Compiler
  // ----------------------------------------------------
  console.log('🔹 TEST 1: Segmentation SQL Query Compiler');
  try {
    const rules: RuleGroup = {
      logic: 'AND',
      rules: [
        { field: 'first_name', operator: 'equals', value: 'Habeeb' },
        { field: 'tags', operator: 'equals', value: 'test-tag' },
        { field: 'outstanding_zar_limit', operator: 'greater_than', value: 1000 },
        { field: 'lms_course_status', operator: 'equals', value: 'completed' },
        { field: 'email_open_count', operator: 'greater_than', value: 5 }
      ]
    };

    const compiled = SegmentationCompiler.compileToSql(workspaceId, rules);
    console.log('- Compiled SQL Query String:');
    console.log(`  "${compiled.sql}"`);
    console.log(`- Compiled Query Parameters: [${compiled.params.join(', ')}]`);

    // Verify correct structure, parameters, and bound values
    if (!compiled.sql.includes('SELECT DISTINCT c.* FROM public.contacts c')) {
      console.error('❌ SQL base select is incorrect');
      passedAll = false;
    }
    if (!compiled.sql.includes('outstanding_zar_limit') && !compiled.sql.includes('public.invoices')) {
      console.error('❌ SQL outstanding ZAR limit joins or queries are missing');
      passedAll = false;
    }
    if (!compiled.sql.includes('email_open_count') && !compiled.sql.includes('public.email_tracking_logs')) {
      console.error('❌ SQL open tracking log joins are missing');
      passedAll = false;
    }
    if (compiled.params[0] !== workspaceId || compiled.params[1] !== 'Habeeb') {
      console.error('❌ SQL query parameters ordering is invalid');
      passedAll = false;
    }

    console.log('✅ SQL Compilation checked out successfully.');
  } catch (err: any) {
    console.error(`❌ SQL Compiler threw exception: ${err.message}`);
    passedAll = false;
  }
  console.log('');

  // ----------------------------------------------------
  // TEST 2: Segmentation Fallback execution (JS side)
  // ----------------------------------------------------
  console.log('🔹 TEST 2: In-Memory / Programmatic Segmentation Execution');
  try {
    const simpleRules: RuleGroup = {
      logic: 'AND',
      rules: [
        { field: 'first_name', operator: 'equals', value: 'Habeeb' },
        { field: 'tags', operator: 'equals', value: 'test-tag' }
      ]
    };

    const results = await SegmentationCompiler.executeSegment(workspaceId, simpleRules);
    console.log(`- Resolved contacts: ${results.length}`);
    if (results.length !== 1 || results[0].id !== contactId) {
      console.error('❌ Programmatic segmentation failed to resolve the test contact');
      passedAll = false;
    } else {
      console.log('✅ Programmatic segmentation resolved contact successfully!');
    }
  } catch (err: any) {
    console.error(`❌ Segmentation execution threw exception: ${err.message}`);
    passedAll = false;
  }
  console.log('');

  // ----------------------------------------------------
  // TEST 3: Lead Scoring - Pricing Link Click
  // ----------------------------------------------------
  console.log('🔹 TEST 3: Pricing Page Click Scoring (+15 Points & High Intent Tag)');
  try {
    // Click with pricing link
    await LeadScoringEngine.trackScoringEvent(contactId, 'click', { linkUrl: 'https://leadsmind.io/pricing' });

    // Fetch updated contact
    const { data: updatedContact } = await supabase
      .from('contacts')
      .select('lead_score, tags, lead_score_explanation')
      .eq('id', contactId)
      .single();

    console.log(`- Updated Score: ${updatedContact.lead_score} (Expected: 25)`);
    console.log(`- Tags: [${updatedContact.tags?.join(', ')}] (Expected to contain 'High Intent')`);
    console.log(`- Explanation: "${updatedContact.lead_score_explanation}"`);

    if (updatedContact.lead_score !== 25) {
      console.error('❌ Lead score was not updated correctly for click event');
      passedAll = false;
    }
    if (!updatedContact.tags?.includes('High Intent')) {
      console.error('❌ Contact was not tagged with "High Intent"');
      passedAll = false;
    }
    console.log('✅ Click scoring and high intent promotion verified!');
  } catch (err: any) {
    console.error(`❌ Click event test threw exception: ${err.message}`);
    passedAll = false;
  }
  console.log('');

  // ----------------------------------------------------
  // TEST 4: Lead Scoring - Email Reply
  // ----------------------------------------------------
  console.log('🔹 TEST 4: Email Reply Scoring (+20 Points, Pull Out of Sequence, Admin Alert)');
  try {
    // Create a mock active sequence execution
    const mockCampaign = {
      workspace_id: workspaceId,
      name: 'Test Campaign ' + Date.now(),
      subject: 'Test Subject',
      status: 'sent'
    };
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .insert(mockCampaign)
      .select('id')
      .single();

    const mockWf = {
      workspace_id: workspaceId,
      name: 'Mock Workflow ' + Date.now(),
      trigger_type: 'custom',
      is_active: true
    };
    const { data: workflow } = await supabase
      .from('workflows')
      .insert(mockWf)
      .select('id')
      .single();

    const { data: execution } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflow.id,
        workspace_id: workspaceId,
        contact_id: contactId,
        status: 'running',
        current_step: 1
      })
      .select('id')
      .single();

    console.log(`- Created Active Sequence Execution: ${execution.id}`);

    // Trigger reply event
    await LeadScoringEngine.trackScoringEvent(contactId, 'reply');

    // Verify score
    const { data: contactAfterReply } = await supabase
      .from('contacts')
      .select('lead_score, tags, lead_score_explanation')
      .eq('id', contactId)
      .single();

    console.log(`- Updated Score: ${contactAfterReply.lead_score} (Expected: 45)`);

    // Verify sequence execution cancelled
    const { data: execCheck } = await supabase
      .from('workflow_executions')
      .select('status')
      .eq('id', execution.id)
      .single();

    console.log(`- Sequence Execution status: "${execCheck.status}" (Expected: "cancelled")`);

    // Verify notification alerts sent to admins
    const { data: alerts } = await supabase
      .from('notifications')
      .select('title, message')
      .eq('workspace_id', workspaceId)
      .eq('type', 'system');

    console.log(`- Triggered Admin Alerts count: ${alerts?.length}`);
    if (alerts && alerts.length > 0) {
      console.log(`  Alert title: "${alerts[0].title}", message: "${alerts[0].message}"`);
    }

    if (contactAfterReply.lead_score !== 45) {
      console.error('❌ Lead score not updated correctly for reply event');
      passedAll = false;
    }
    if (execCheck.status !== 'cancelled') {
      console.error('❌ Active sequence execution was not cancelled');
      passedAll = false;
    }
    if (!alerts || alerts.length === 0) {
      console.error('❌ Admin notification alerts not sent');
      passedAll = false;
    }
    console.log('✅ Reply scoring, sequence exit, and sales notifications verified!');
  } catch (err: any) {
    console.error(`❌ Reply event test threw exception: ${err.message}`);
    passedAll = false;
  }
  console.log('');

  // ----------------------------------------------------
  // TEST 5: Lead Scoring - Hot Lead promotion (Crossing 50 points)
  // ----------------------------------------------------
  console.log('🔹 TEST 5: Hot Lead Threshold Promotion (Score >= 50, Alert Rep)');
  try {
    // Current score is 45. Triggering another click to pricing (adds +15 points -> score 60)
    await LeadScoringEngine.trackScoringEvent(contactId, 'click', { linkUrl: 'https://leadsmind.io/pricing' });

    // Verify score and Hot Lead tag
    const { data: contactAfterPromo } = await supabase
      .from('contacts')
      .select('lead_score, tags, lead_score_explanation')
      .eq('id', contactId)
      .single();

    console.log(`- Updated Score: ${contactAfterPromo.lead_score} (Expected: 60)`);
    console.log(`- Tags: [${contactAfterPromo.tags?.join(', ')}] (Expected to contain 'Hot Lead')`);

    // Verify rep notification alert
    const { data: hotAlerts } = await supabase
      .from('notifications')
      .select('title, message')
      .eq('workspace_id', workspaceId)
      .eq('type', 'contact');

    console.log(`- Hot Lead Rep Alerts count: ${hotAlerts?.length}`);
    if (hotAlerts && hotAlerts.length > 0) {
      console.log(`  Alert title: "${hotAlerts[0].title}", message: "${hotAlerts[0].message}"`);
    }

    if (contactAfterPromo.lead_score !== 60) {
      console.error('❌ Lead score not updated correctly');
      passedAll = false;
    }
    if (!contactAfterPromo.tags?.includes('Hot Lead')) {
      console.error('❌ Contact not promoted to Hot Lead tag');
      passedAll = false;
    }
    if (!hotAlerts || hotAlerts.length === 0) {
      console.error('❌ Account rep promotion notifications not sent');
      passedAll = false;
    }
    console.log('✅ Hot Lead threshold promotion and alerting verified!');
  } catch (err: any) {
    console.error(`❌ Hot Lead promotion test threw exception: ${err.message}`);
    passedAll = false;
  }

  // ----------------------------------------------------
  // Cleanup Test Sandbox data
  // ----------------------------------------------------
  console.log('\n🧹 Cleaning up test sandbox environment...');
  try {
    await supabase.from('notifications').delete().eq('workspace_id', workspaceId);
    await supabase.from('workflow_executions').delete().eq('workspace_id', workspaceId);
    await supabase.from('workflows').delete().eq('workspace_id', workspaceId);
    await supabase.from('email_campaigns').delete().eq('workspace_id', workspaceId);
    await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId);
    await supabase.from('contacts').delete().eq('workspace_id', workspaceId);
    await supabase.from('workspaces').delete().eq('id', workspaceId);
    console.log('- Cleanup completed.');
  } catch (cleanErr: any) {
    console.warn(`- Warn: Cleanup error: ${cleanErr.message}`);
  }

  console.log('==================================================');
  if (passedAll) {
    console.log('✅ ALL SPRINT 6 TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
    process.exit(1);
  }
  console.log('==================================================');
}

runTests().catch(console.error);

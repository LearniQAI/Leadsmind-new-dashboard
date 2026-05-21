import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Mock global WebSocket for Supabase Realtime in Node.js < 22
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = class {};
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAttributionFlow() {
  console.log('🚀 Phase 3 Verification: CRM First-Touch Attribution & Content Pipeline Tracking');

  // 1. Verify schema tables exist
  const { error: checkError } = await supabase
    .from('seo_projects')
    .select('id')
    .limit(1);

  if (checkError && checkError.message.includes('Public.seo_projects')) {
    console.error('\n⚠️ DATABASE MIGRATIONS NOT DETECTED!');
    console.error('Please run the migration SQL scripts in your Supabase SQL Editor first:');
    console.error('1. supabase/migrations/phase65_seo_foundation.sql');
    console.error('2. supabase/migrations/phase66_seo_competitor_rank_tracking.sql');
    console.error('3. supabase/migrations/phase67_seo_attribution_and_triggers.sql');
    process.exit(1);
  }

  console.log('✅ Relational schema verified (SEO tables are present).');

  // Let\'s run the test simulation
  let workspaceId: string | null = null;
  let projectId: string | null = null;
  let contactId: string | null = null;
  let dealId: string | null = null;
  let pipelineItemId: string | null = null;
  let trackedKeywordId: string | null = null;
  const testKeyword = 'leads builder tools';

  try {
    // 2. Fetch a valid workspace to bind tests to
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .single();

    if (wsError || !workspace) {
      throw new Error(`Failed to retrieve active workspace: ${wsError?.message}`);
    }
    workspaceId = workspace.id;
    console.log(`Using active workspace ID: ${workspaceId}`);

    // 3. Find or create an SEO project
    const { data: existingProject } = await supabase
      .from('seo_projects')
      .select('id')
      .eq('workspace_id', workspaceId)
      .single();

    if (existingProject) {
      projectId = existingProject.id;
    } else {
      const { data: newProject, error: projError } = await supabase
        .from('seo_projects')
        .insert({
          workspace_id: workspaceId,
          domain_url: 'leadsmind-test-env.co.za',
          gsc_connected: true
        })
        .select('id')
        .single();

      if (projError || !newProject) {
        throw new Error(`Failed to create test SEO project: ${projError?.message}`);
      }
      projectId = newProject.id;
    }
    console.log(`Using SEO Project ID: ${projectId}`);

    // 4. Create Tracked Keyword target
    const { data: existingKeyword } = await supabase
      .from('seo_tracked_keywords')
      .select('id')
      .eq('project_id', projectId)
      .eq('keyword', testKeyword)
      .single();

    if (existingKeyword) {
      trackedKeywordId = existingKeyword.id;
    } else {
      const { data: newKw, error: kwError } = await supabase
        .from('seo_tracked_keywords')
        .insert({
          project_id: projectId,
          keyword: testKeyword,
          target_url: '/features/leads-builder',
          is_active: true
        })
        .select('id')
        .single();

      if (kwError || !newKw) {
        throw new Error(`Failed to track keyword: ${kwError?.message}`);
      }
      trackedKeywordId = newKw.id;
    }
    console.log(`Using Tracked Keyword: "${testKeyword}"`);

    // 5. Simulate Organic First-Touch Contact Submission
    console.log('\n--- STEP 1: Simulating Form Lead Submission with Organic Referrer ---');
    const firstTouchSource = 'google.co.za';
    const firstTouchKeyword = testKeyword;
    const firstTouchPage = 'https://leadsmind-test-env.co.za/blog/leads-builder';

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        email: `lead-att-${Date.now()}@test.co.za`,
        first_name: 'Simulated',
        last_name: 'Organic Lead',
        source: 'form_submission',
        first_touch_source: firstTouchSource,
        first_touch_keyword: firstTouchKeyword,
        first_touch_page: firstTouchPage,
        form_attribution: {
          utm_source: 'organic',
          utm_medium: 'serp',
          referrer: 'https://www.google.co.za/'
        }
      })
      .select('id, email, first_touch_source, first_touch_keyword')
      .single();

    if (contactError || !contact) {
      throw new Error(`Failed to simulate lead submission: ${contactError?.message}`);
    }
    contactId = contact.id;
    console.log(`✅ Contact created: ${contact.email}`);
    console.log(`   first_touch_source: ${contact.first_touch_source}`);
    console.log(`   first_touch_keyword: ${contact.first_touch_keyword}`);

    // 6. Simulate Won Opportunities
    console.log('\n--- STEP 2: Creating Closed Won Deal Opportunity ---');
    const dealValue = 35000.00;
    const { data: deal, error: dealError } = await supabase
      .from('opportunities')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        name: 'Enterprise Leads Builder License',
        value: dealValue,
        status: 'won',
        stage: 'Closed Won'
      })
      .select('id, name, value, status')
      .single();

    if (dealError || !deal) {
      throw new Error(`Failed to create won deal: ${dealError?.message}`);
    }
    dealId = deal.id;
    console.log(`✅ Won Deal opportunity recorded: "${deal.name}" of value R${deal.value}`);

    // 7. Sync Performance Click logs (e.g. 20 clicks)
    const dateStr = new Date().toISOString().split('T')[0];
    const testClicks = 20;
    const testImpressions = 450;

    const { error: perfError } = await supabase
      .from('seo_keyword_performance')
      .upsert({
        project_id: projectId,
        keyword: testKeyword,
        clicks: testClicks,
        impressions: testImpressions,
        ctr: testClicks / testImpressions,
        position: 1.8,
        date: dateStr
      }, { onConflict: 'project_id,keyword,date' });

    if (perfError) {
      throw new Error(`Failed to record keyword performance logs: ${perfError.message}`);
    }
    console.log(`✅ Telemetry logged: ${testClicks} visitors (clicks) recorded for "${testKeyword}".`);

    // 8. Create Content Pipeline entry and assign cost (e.g. R 2500.00)
    const contentCost = 2500.00;
    const { data: pipelineItem, error: pipeError } = await supabase
      .from('seo_content_pipeline')
      .upsert({
        project_id: projectId,
        keyword: testKeyword,
        status: 'Published',
        title: 'Ultimate Guide to Leads Builder tools',
        cost: contentCost,
        last_stage_transition_at: new Date().toISOString()
      }, { onConflict: 'project_id,keyword' })
      .select('id, keyword, cost, status')
      .single();

    if (pipeError || !pipelineItem) {
      throw new Error(`Failed to upsert pipeline card: ${pipeError?.message}`);
    }
    pipelineItemId = pipelineItem.id;
    console.log(`✅ Editorial pipeline card updated: cost R${pipelineItem.cost}, status: ${pipelineItem.status}`);

    // 9. Execute Stored Procedure daily revenue rollup
    console.log('\n--- STEP 3: Executing Stored Procedure Revenue Rollup ---');
    const { error: rpcError } = await supabase
      .rpc('rollup_seo_revenue_attribution_func', { p_date: dateStr });

    if (rpcError) {
      throw new Error(`Rollup RPC failed: ${rpcError.message}`);
    }
    console.log('✅ Rollup function execution triggered successfully.');

    // 10. Verify Rollup Calculations in database
    const { data: rollup, error: rollupFetchError } = await supabase
      .from('seo_revenue_attribution_rollup')
      .select('*')
      .eq('project_id', projectId)
      .eq('keyword', testKeyword)
      .eq('date', dateStr)
      .single();

    if (rollupFetchError || !rollup) {
      throw new Error(`Failed to retrieve computed rollup row: ${rollupFetchError?.message}`);
    }

    console.log('\n--- VERIFICATION METRICS ANALYSIS ---');
    console.log(`Computed roll-up row date: ${rollup.date}`);
    console.log(`Expected Visitors (Clicks): ${testClicks}  | Actual: ${rollup.total_visitors}`);
    console.log(`Expected Won Deals: 1  | Actual: ${rollup.won_deals_count}`);
    console.log(`Expected Won Revenue: R${dealValue}  | Actual: R${rollup.total_revenue}`);
    
    const expectedRpv = dealValue / testClicks;
    console.log(`Expected RPV: R${expectedRpv}  | Actual: R${rollup.rpv}`);

    console.log(`Expected Production Cost: R${contentCost}  | Actual: R${rollup.total_cost}`);
    
    const expectedRoi = ((dealValue - contentCost) / contentCost) * 100;
    console.log(`Expected ROI: ${expectedRoi}%  | Actual: ${rollup.roi}%`);

    if (
      rollup.total_visitors === testClicks &&
      rollup.won_deals_count === 1 &&
      Number(rollup.total_revenue) === dealValue &&
      Number(rollup.rpv) === expectedRpv &&
      Number(rollup.total_cost) === contentCost &&
      Number(rollup.roi) === expectedRoi
    ) {
      console.log('\n🎉 SUCCESS: All Closed-loop Revenue Attribution formulas are perfectly correct!');
    } else {
      console.log('\n❌ ERROR: Rollup formulas calculation discrepancy found.');
    }

    // 11. Test auto-promotion routines
    console.log('\n--- STEP 4: Executing Pipeline Auto-Promotion routines ---');
    
    // Simulate rank history log between 11 and 50 to trigger ranking_11_50 stage promotion
    const testRank = 23;
    const { error: rankError } = await supabase
      .from('seo_rank_history')
      .upsert({
        project_id: projectId,
        keyword: testKeyword,
        rank: testRank,
        date: dateStr
      }, { onConflict: 'project_id,keyword,date' });

    if (rankError) {
      throw new Error(`Failed to insert mock rank log: ${rankError.message}`);
    }

    // Run promotions
    const { error: promoError } = await supabase
      .rpc('auto_promote_and_flag_pipeline');

    if (promoError) {
      throw new Error(`Pipeline promotion RPC failed: ${promoError.message}`);
    }

    // Verify stage promotion
    const { data: updatedCard } = await supabase
      .from('seo_content_pipeline')
      .select('status, is_stuck')
      .eq('id', pipelineItemId)
      .single();

    console.log(`Updated Pipeline Card Status: ${updatedCard?.status} (Expected: ranking_11_50)`);
    if (updatedCard?.status === 'ranking_11_50') {
      console.log('🎉 SUCCESS: Pipeline automation promoted the card dynamically based on SERP tracking logs!');
    } else {
      console.log('❌ ERROR: Card was not promoted.');
    }

  } catch (err: any) {
    console.error(`\n❌ TEST FAILURE: ${err.message}`);
  } finally {
    // 12. Database Clean-up (Rollback dummy test data to avoid polluting workspace environment)
    console.log('\n--- CLEAN-UP: Purging mock simulation data from workspace ledger ---');
    const dateStr = new Date().toISOString().split('T')[0];
    
    if (dealId) {
      await supabase.from('opportunities').delete().eq('id', dealId);
      console.log('🗑️ Purged test opportunities');
    }
    if (contactId) {
      await supabase.from('contacts').delete().eq('id', contactId);
      console.log('🗑️ Purged test contact records');
    }
    if (projectId && testKeyword) {
      await supabase.from('seo_revenue_attribution_rollup').delete().eq('project_id', projectId).eq('keyword', testKeyword).eq('date', dateStr);
      await supabase.from('seo_keyword_performance').delete().eq('project_id', projectId).eq('keyword', testKeyword).eq('date', dateStr);
      await supabase.from('seo_rank_history').delete().eq('project_id', projectId).eq('keyword', testKeyword).eq('date', dateStr);
      await supabase.from('seo_content_pipeline').delete().eq('project_id', projectId).eq('keyword', testKeyword);
      console.log('🗑️ Purged test seo performance logs, ranks, and pipeline entries');
    }
    console.log('👍 Clean-up process completed.');
  }
}

testAttributionFlow();

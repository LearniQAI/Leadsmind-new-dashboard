import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Mock global WebSocket for Supabase Realtime in Node.js < 22
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = class {};
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking database status...');
  
  // Check contacts columns
  const { data: contactData, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .limit(1);

  if (contactError) {
    console.log('❌ contacts check failed:', contactError.message);
  } else {
    console.log('✅ contacts table exists!');
  }

  // Check blog_posts table
  const { data: blogData, error: blogError } = await supabase
    .from('blog_posts')
    .select('*')
    .limit(1);

  if (blogError) {
    console.log('❌ blog_posts check failed:', blogError.message);
  } else {
    console.log('✅ blog_posts table exists!');
  }

  // Check help_articles table
  const { data: helpData, error: helpError } = await supabase
    .from('help_articles')
    .select('*')
    .limit(1);

  if (helpError) {
    console.log('❌ help_articles check failed:', helpError.message);
  } else {
    console.log('✅ help_articles table exists!');
  }

  // Check seo_projects table
  const { data: projData, error: projError } = await supabase
    .from('seo_projects')
    .select('*')
    .limit(1);

  if (projError) {
    console.log('❌ seo_projects table check failed:', projError.message);
  } else {
    console.log('✅ seo_projects table exists!');
  }

  // Check seo_tracked_keywords table
  const { data: kwData, error: kwError } = await supabase
    .from('seo_tracked_keywords')
    .select('*')
    .limit(1);

  if (kwError) {
    console.log('❌ seo_tracked_keywords table check failed:', kwError.message);
  } else {
    console.log('✅ seo_tracked_keywords table exists!');
  }

  // Check seo_rank_history table
  const { data: rankData, error: rankError } = await supabase
    .from('seo_rank_history')
    .select('*')
    .limit(1);

  if (rankError) {
    console.log('❌ seo_rank_history table check failed:', rankError.message);
  } else {
    console.log('✅ seo_rank_history table exists!');
  }

  // Check content pipeline columns
  const { data: pipelineData, error: pipelineError } = await supabase
    .from('seo_content_pipeline')
    .select('cost, last_stage_transition_at, is_stuck')
    .limit(1);

  if (pipelineError) {
    console.log('❌ seo_content_pipeline columns check failed:', pipelineError.message);
  } else {
    console.log('✅ seo_content_pipeline columns exist!');
  }

  // Check rollup table
  const { data: rollupData, error: rollupError } = await supabase
    .from('seo_revenue_attribution_rollup')
    .select('*')
    .limit(1);

  if (rollupError) {
    console.log('❌ seo_revenue_attribution_rollup table check failed:', rollupError.message);
  } else {
    console.log('✅ seo_revenue_attribution_rollup table exists!');
  }
}

check();

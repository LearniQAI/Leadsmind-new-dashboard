import './setup-env';

import { PromptEngine } from '../server/services/ai/PromptEngine';
import { ScoringEngine } from '../server/services/ai/ScoringEngine';
import { ResearchAgent } from '../server/services/ai/ResearchAgent';
import { verifyAICreditBalance } from '../server/middleware/CreditGuard';
import * as datasource from '../server/database/datasource';




// Load environment variables manually from .env.local if needed
import * as fs from 'fs';
import * as path from 'path';

try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch (e) {
  console.log('No .env.local loaded:', e);
}

// Stubs for database calls to make script run locally without DB connection
let mockDbStore: Record<string, any[]> = {
  ai_usage_credits: [
    {
      workspace_id: 'test-workspace-id',
      plan_monthly_credits: 100,
      credits_used_this_period: 0,
      credits_purchased_addon: 0,
      billing_cycle_start: '2026-05-14',
      billing_cycle_end: '2026-06-14',
      last_notification_sent_at: null
    }
  ],
  workspace_brand_voice: [
    {
      workspace_id: 'test-workspace-id',
      business_name: 'Cape Tax Pros',
      industry: 'Financial Advisory',
      services_description: 'SME VAT Submissions',
      target_audience: 'Local business owners',
      brand_personality: 'Professional yet warm',
      tone_adjectives: ['clear', 'compliant'],
      words_to_use: ['SARS', 'E-Filing'],
      words_to_avoid: ['synergy'],
      primary_language: 'en'
    }
  ],
  crm_companies: [
    {
      domain: 'zafrologistics.co.za',
      name: 'Zafro Logistics',
      employees: '60',
      industry: 'Logistics'
    }
  ],
  contacts: [
    {
      id: 'test-contact-id',
      first_name: 'Lerato',
      last_name: 'Sithole',
      email: 'lerato@zafrologistics.co.za'
    }
  ],
  appointments: [],
  crm_notifications: [],
  crm_activities: [],
  ai_research_reports: [],
  ai_generations: []
};

// Enable database mocking globally
process.env.MOCK_DB = 'true';
datasource.setMockDbStore(mockDbStore);


async function runTests() {
  console.log('==================================================');
  console.log('      LEADSMIND AI SUITE SYSTEM BASELINE TESTS     ');
  console.log('==================================================\n');

  let successCount = 0;
  let failCount = 0;

  function assert(name: string, assertion: boolean, detail?: string) {
    if (assertion) {
      console.log(` ✅ PASS: ${name}`);
      successCount++;
    } else {
      console.error(` ❌ FAIL: ${name}`);
      if (detail) console.error(`    Detail: ${detail}`);
      failCount++;
    }
  }

  // TEST 1: PromptEngine compliance and SA regional indicators
  try {
    const mockVoice = {
      name: 'Cape Tax Pros',
      industry: 'Financial Advisory',
      servicesDescription: 'SME VAT Submissions',
      targetAudience: 'Local business owners',
      brandPersonality: 'Professional yet conversational',
      toneAdjectives: ['clear', 'compliant'],
      wordsToUse: ['SARS', 'E-Filing'],
      wordsToAvoid: ['synergy'],
      primaryLanguage: 'en'
    };

    const payload = PromptEngine.buildPayload(mockVoice, 'Write an update note', 'Test brief text');
    
    assert(
      'PromptEngine preserves approved vocabulary tokens',
      payload.systemInstructions.includes('SARS') && payload.systemInstructions.includes('E-Filing')
    );
    assert(
      'PromptEngine excludes forbidden tokens instruction',
      payload.systemInstructions.includes('Forbidden Vocabulary Tokens to Omit: synergy')
    );
    assert(
      'PromptEngine includes SA localization indicators (POPIA, SARS, Rands)',
      payload.systemInstructions.includes('POPIA') && payload.systemInstructions.includes('Rand')
    );
  } catch (err: any) {
    assert('PromptEngine Validation', false, err.message);
  }

  // TEST 2: CreditGuard out-of-credits ceiling blocking
  try {
    // 2.1 Deplete credits
    const ledger = mockDbStore.ai_usage_credits[0];
    ledger.credits_used_this_period = 100; // Plan limit reached
    ledger.plan_monthly_credits = 100;
    ledger.credits_purchased_addon = 0;

    let responseCode = 200;
    let responseBody: any = null;

    const mockReq: any = { body: { workspaceId: 'test-workspace-id' } };
    const mockRes: any = {
      status(code: number) {
        responseCode = code;
        return this;
      },
      json(body: any) {
        responseBody = body;
        return this;
      }
    };
    const mockNext = () => {
      responseCode = 0;
    };

    await verifyAICreditBalance(mockReq, mockRes, mockNext);

    assert(
      'CreditGuard rejects requests when credit limit is fully depleted',
      responseCode === 402 && responseBody?.error === 'CREDIT_LIMIT_EXCEEDED'
    );
  } catch (err: any) {
    assert('CreditGuard validation', false, err.message);
  }

  // TEST 3: CreditGuard 80% warning notifications
  try {
    // Reset limits
    const ledger = mockDbStore.ai_usage_credits[0];
    ledger.credits_used_this_period = 80;
    ledger.plan_monthly_credits = 100;
    ledger.credits_purchased_addon = 0;
    ledger.last_notification_sent_at = null;
    mockDbStore.crm_notifications = [];

    // Add admin members
    mockDbStore.workspace_members = [
      { workspace_id: 'test-workspace-id', user_id: 'admin-1', role: 'admin' }
    ];

    let nextCalled = false;
    const mockReq: any = { body: { workspaceId: 'test-workspace-id' } };
    const mockRes: any = {
      status(c: number) { return this; },
      json(b: any) { return this; }
    };
    const mockNext = () => { nextCalled = true; };

    await verifyAICreditBalance(mockReq, mockRes, mockNext);

    assert(
      'CreditGuard triggers 80% usage systemic alert notification',
      mockDbStore.crm_notifications.length > 0 && mockDbStore.crm_notifications[0].title === 'AI Credits Warning'
    );
    const updatedLedger = mockDbStore.ai_usage_credits[0];
    assert(
      'CreditGuard updates last_notification_sent_at timestamp',
      updatedLedger.last_notification_sent_at !== null
    );
  } catch (err: any) {
    assert('CreditGuard Warning trigger', false, err.message);
  }

  // TEST 4: ScoringEngine weights computation
  try {
    const signals = {
      headcount: 50, // fits 20-150 (+20)
      industryMatch: true, // (+15)
      hasLegacyTech: true, // (+20)
      recentTriggerEvent: true, // (+25)
      painPointMatch: true, // (+10)
      engagementScore: 5 // (+10)
    };

    const evaluation = ScoringEngine.evaluate(signals);
    assert(
      'ScoringEngine correctly computes ideal client score (100)',
      evaluation.finalScore === 100 && evaluation.breakdown.size === 20 && evaluation.breakdown.trigger === 25
    );

    const lowSignals = {
      headcount: 5, // low size (0)
      industryMatch: false, // (0)
      hasLegacyTech: false, // (0)
      recentTriggerEvent: false, // (0)
      painPointMatch: false, // (0)
      engagementScore: 1 // (+2)
    };
    const lowEvaluation = ScoringEngine.evaluate(lowSignals);
    assert(
      'ScoringEngine correctly computes low-scoring lead values',
      lowEvaluation.finalScore === 2
    );
  } catch (err: any) {
    assert('ScoringEngine computation', false, err.message);
  }

  // TEST 5: ResearchAgent contact enrichment schema and privacy filters
  try {
    const cleanReport = await ResearchAgent.enrichContact(
      'test-contact-id',
      'Lerato Sithole',
      'Zafro Logistics',
      'zafrologistics.co.za',
      'test-workspace-id'
    );

    // Assert structured schema fields
    assert(
      'ResearchAgent output conforms to rigid intelligence snapshot schema',
      cleanReport.company_snapshot && cleanReport.plain_language_operational_profile && cleanReport.key_decision_makers
    );

    // Assert privacy redaction
    const rawIndividualProfileStr = JSON.stringify(cleanReport.individual_profile);
    console.log("DEBUG rawIndividualProfileStr:", rawIndividualProfileStr);
    assert(
      'ResearchAgent strips personal phone numbers via redaction regex',
      !rawIndividualProfileStr.includes('+27-82-555-0199') && rawIndividualProfileStr.includes('[REDACTED PHONE]')
    );
    assert(
      'ResearchAgent strips physical home addresses via redaction regex',
      !rawIndividualProfileStr.includes('124 Juta St') && rawIndividualProfileStr.includes('[REDACTED ADDRESS]')
    );
    assert(
      'ResearchAgent strips private family details via redaction regex',
      !rawIndividualProfileStr.includes('two kids') && rawIndividualProfileStr.includes('[REDACTED FAMILY]')
    );
  } catch (err: any) {
    assert('ResearchAgent contact enrichment', false, err.message);
  }

  console.log('\n==================================================');
  console.log(` TESTS RESULT SUMMARY: ${successCount} PASSED, ${failCount} FAILED `);
  console.log('==================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();

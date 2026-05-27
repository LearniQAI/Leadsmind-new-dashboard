import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Avoid WebSocket connection errors on Node.js
global.WebSocket = class {} as any;

import { SpamValidator } from '../src/lib/intelligence/SpamValidator';
import { PredictiveIntelligence } from '../src/lib/intelligence/PredictiveIntelligence';
import { POST as lenaWriteRoute } from '../src/app/api/ai/lena/write/route';
import { NextRequest } from 'next/server';

async function runTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING SPRINT 5 SYSTEM INTELLIGENCE TEST SUITE');
  console.log('==================================================\n');

  let passedAll = true;

  // ----------------------------------------------------
  // TEST 1: SpamValidator Scoring Engine
  // ----------------------------------------------------
  console.log('🔹 TEST 1: SpamValidator Scoring Engine');
  try {
    // 1.a Clean Email
    const cleanRes = SpamValidator.validateEmailContent(
      'Monthly newsletter update for our valued partners',
      'Hi team, here is the summary of our achievements this month. We look forward to working with you.'
    );
    console.log(`- Clean Email: Score = ${cleanRes.score}/100, Passed = ${cleanRes.passed}`);
    if (cleanRes.score !== 100 || !cleanRes.passed) {
      console.error('❌ Clean email failed validation check');
      passedAll = false;
    }

    // 1.b SARS Phishing Email
    const sarsRes = SpamValidator.validateEmailContent(
      'URGENT: SARS Refund payout notice',
      'Dear taxpayer, you have a pending tax refund from SARS eFiling. Verify bank details immediately to claim payout.'
    );
    console.log(`- SARS Phishing: Score = ${sarsRes.score}/100, Passed = ${sarsRes.passed}, Triggers: [${sarsRes.triggers.join(', ')}]`);
    if (sarsRes.passed || sarsRes.score >= 50) {
      console.error('❌ SARS phishing was not blocked or score was too high');
      passedAll = false;
    }

    // 1.c FNB Bank Details Verification
    const bankRes = SpamValidator.validateEmailContent(
      'FNB account suspended - action required',
      'Your FNB login profile is suspended. Update banking account details or verify bank details now.'
    );
    console.log(`- Bank Phishing: Score = ${bankRes.score}/100, Passed = ${bankRes.passed}, Triggers: [${bankRes.triggers.join(', ')}]`);
    if (bankRes.passed || bankRes.score >= 50) {
      console.error('❌ Bank phishing email was not blocked');
      passedAll = false;
    }

    // 1.d Generic Spam Email with Capitalization & Exclamations
    const spamRes = SpamValidator.validateEmailContent(
      'DOUBLE YOUR INCOME IN 24 HOURS!!! ACT NOW!!!',
      'Get 100% free cash prize today! Guaranteed success! Make money fast and earn extra cash!'
    );
    console.log(`- General Spam: Score = ${spamRes.score}/100, Passed = ${spamRes.passed}, Triggers: [${spamRes.triggers.join(', ')}]`);
    if (spamRes.passed) {
      console.error('❌ General spam email was not blocked');
      passedAll = false;
    }
  } catch (err: any) {
    console.error(`❌ SpamValidator test threw exception: ${err.message}`);
    passedAll = false;
  }
  console.log('');

  // ----------------------------------------------------
  // TEST 2: PredictiveIntelligence Send Optimization
  // ----------------------------------------------------
  console.log('🔹 TEST 2: PredictiveIntelligence Send Optimization');
  try {
    const mockContact = {
      id: '00000000-0000-0000-0000-000000000001',
      workspace_id: '00000000-0000-0000-0000-000000000000',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.co.za',
      load_shedding_area: 'mock-shedding-area' // Triggers mock load shedding calendar
    };

    const baseDate = new Date();
    // Force baseDate to 9:00 AM on today
    baseDate.setHours(9, 0, 0, 0);

    console.log(`- Base reference date/time: ${baseDate.toISOString()}`);
    
    // Evaluate send time (should determine optimal open hour and shift past mock load shedding)
    const optimizedSendTime = await PredictiveIntelligence.getOptimizedSendTime(mockContact, baseDate);
    console.log(`- Optimized Send Time: ${optimizedSendTime.toISOString()}`);

    // Since mock load shedding runs from targetDate - 30m to targetDate + 150m (2.5 hours)
    // The optimizedSendTime should be targetDate + 2.5 hours + 5 minutes buffer
    const optimalHour = await PredictiveIntelligence.evaluateHistoricalOpens(mockContact.id, mockContact.workspace_id);
    const targetDate = new Date(baseDate);
    targetDate.setHours(optimalHour, 0, 0, 0);
    if (targetDate.getTime() <= baseDate.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const expectedShiftedTime = new Date(targetDate.getTime() + 155 * 60 * 1000); // 150m + 5m buffer

    console.log(`- Expected Send Time:  ${expectedShiftedTime.toISOString()}`);
    if (Math.abs(optimizedSendTime.getTime() - expectedShiftedTime.getTime()) > 1000) {
      console.error('❌ Optimized send time was not shifted correctly past mock load-shedding block');
      passedAll = false;
    } else {
      console.log('✅ Load-shedding shift optimization validated successfully!');
    }
  } catch (err: any) {
    console.error(`❌ PredictiveIntelligence test threw exception: ${err.message}`);
    passedAll = false;
  }
  console.log('');

  // ----------------------------------------------------
  // TEST 3: LENA Copywriting Localized API Route
  // ----------------------------------------------------
  console.log('🔹 TEST 3: LENA Multilingual AI Copywriting API Route');
  try {
    const languagesToTest = ['english', 'afrikaans', 'zulu', 'xhosa'];

    for (const lang of languagesToTest) {
      const mockRequestBody = {
        prompt: 'Promote our winter discount campaign',
        language: lang,
        context: { first_name: 'Pieter' }
      };

      // Construct NextRequest
      const req = new NextRequest('http://localhost:3000/api/ai/lena/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockRequestBody)
      });

      const res = await lenaWriteRoute(req);
      const data = await res.json();

      console.log(`- [Language: ${lang.toUpperCase()}] Response success = ${data.success}`);
      console.log(`  Preview:\n"${data.text || data.error}"\n`);

      if (!data.success || !data.text) {
        console.error(`❌ LENA copywriting failed for language: ${lang}`);
        passedAll = false;
      }
    }
  } catch (err: any) {
    console.error(`❌ LENA copywriting API route test threw exception: ${err.message}`);
    passedAll = false;
  }

  console.log('==================================================');
  if (passedAll) {
    console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
    process.exit(1);
  }
  console.log('==================================================');
}

runTests().catch(console.error);

const { chromium } = require('playwright');
const BASE_URL = 'http://localhost:3000';
const COURSE_ID = 'e913a270-0266-46b3-a38d-5a1c1ec867b9';

const questions = [
  "What's the difference between its and it's?",
  "What's the capital of France?",
  "What are the four types of sentences?",
];

const log = (...a) => console.log(new Date().toISOString(), ...a);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  await page.goto(`${BASE_URL}/api/test-login`, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.goto(`${BASE_URL}/student/courses/${COURSE_ID}`, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const qaLauncher = page.getByRole('button', { name: 'Ask about this course' });
  await qaLauncher.click();
  await page.waitForTimeout(1000);

  const results = [];
  for (const q of questions) {
    log('Asking:', q);
    const input = page.getByPlaceholder(/Ask a question about this course/i);
    await input.click();
    await input.fill('');
    await input.type(q, { delay: 20 });
    const valNow = await input.inputValue();
    log('  input value before submit:', valNow);
    await input.press('Enter');

    // wait for the send button's loading spinner to appear then disappear (or just poll answer bubbles)
    await page.waitForTimeout(2000);
    let lastAnswer = null;
    for (let i = 0; i < 40; i++) {
      const bubbles = await page.locator('.whitespace-pre-wrap').allInnerTexts();
      if (bubbles.length > 0) {
        const candidate = bubbles[bubbles.length - 1];
        if (candidate !== lastAnswer) {
          lastAnswer = candidate;
        }
      }
      // stop early if the input is re-enabled (no cooldown placeholder) and we have a candidate
      const placeholder = await input.getAttribute('placeholder');
      if (lastAnswer && placeholder && !placeholder.includes('Wait')) {
        // give it one more second to settle
        await page.waitForTimeout(1500);
        break;
      }
      await page.waitForTimeout(1000);
    }
    results.push({ question: q, answer: lastAnswer });
    log('  answer:', (lastAnswer || '').slice(0, 300));
    await page.waitForTimeout(10000); // cooldown between questions
  }

  console.log('\n\n===== FINAL QA RESULTS =====');
  console.log(JSON.stringify(results, null, 2));

  await page.screenshot({ path: 'scripts/seed-grammar-course/qa-final.png', fullPage: true });
  await browser.close();
}
main().catch(e => { console.error('FAILED', e); process.exit(1); });

const { chromium } = require('playwright');

const BASE_URL = process.env.SEED_BASE_URL || 'http://localhost:3000';
const EMAIL = 'zainulhassan5857@gmail.com';
const PASSWORD = process.env.NEW_USER_PASSWORD || 'TempStudentPass!2026';
const WORKSPACE_ID = 'b83f0966-837e-4952-9cd4-480be4ca3f16'; // Zain Workspace
const COURSE_TITLE = 'English Grammar Fundamentals';

const log = (...a) => console.log(new Date().toISOString(), ...a);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultTimeout(150000);
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  log('Logging in as', EMAIL);
  await page.goto(`${BASE_URL}/auth/signin-basic`, { timeout: 150000, waitUntil: 'domcontentloaded' });
  await page.locator('#nameEmail').fill(EMAIL);
  await page.locator('#passwordInput').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    if (!page.url().includes('/auth/signin-basic') && !page.url().startsWith('chrome-error:')) {
      log('Navigated to:', page.url());
      break;
    }
  }

  // Set the active_workspace_id cookie directly so getCurrentWorkspaceId() and
  // getUserRole() both resolve against Zain Workspace consistently (the
  // ?workspaceId= query param only affects course listing, not the role check,
  // which otherwise defaults to this user's own auto-provisioned workspace and
  // produces a false "admin" view of someone else's course).
  await ctx.addCookies([{
    name: 'active_workspace_id',
    value: WORKSPACE_ID,
    domain: 'localhost',
    path: '/',
  }]);

  log('Going to student marketplace...');
  await page.goto(`${BASE_URL}/student/marketplace`, { timeout: 150000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  log('Marketplace URL:', page.url());

  await page.screenshot({ path: 'scripts/seed-grammar-course/enroll-zainul-marketplace.png', fullPage: true });
  const bodyText = await page.locator('body').innerText();
  console.log('MARKETPLACE PAGE TEXT:\n', bodyText.slice(0, 1500));

  const enrollBtnByRole = page.getByRole('button', { name: /Enroll Now|Already Enrolled/i });
  const courseCard = page.locator('div', { hasText: COURSE_TITLE }).filter({ has: enrollBtnByRole }).last();
  await courseCard.scrollIntoViewIfNeeded({ timeout: 15000 });
  const enrollBtn = courseCard.getByRole('button', { name: /Enroll Now|Already Enrolled/i }).first();
  const text = await enrollBtn.textContent();
  log('Button text:', text);

  if (text && text.includes('Enroll Now')) {
    await enrollBtn.click();
    await page.getByText('Successfully enrolled').waitFor({ timeout: 60000 }).catch(async (e) => {
      const bodyText = await page.locator('body').innerText();
      console.log('No success toast seen. Page snippet:', bodyText.slice(0, 500));
      throw e;
    });
    log('Enrolled successfully.');
  } else {
    log('Already enrolled.');
  }

  await page.screenshot({ path: 'scripts/seed-grammar-course/enroll-zainul-result.png', fullPage: true });
  await browser.close();
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

const { chromium } = require('playwright');
const { modules: allModules } = require('./lessons-data');

const SMOKE = process.env.SEED_SMOKE_TEST === '1';
const modules = SMOKE ? [{ ...allModules[0], lessons: [allModules[0].lessons[0]] }] : allModules;

const BASE_URL = process.env.SEED_BASE_URL || 'http://localhost:3002';
const INSTRUCTOR_EMAIL = 'zainalimuhammad5857@gmail.com';
const INSTRUCTOR_PASSWORD = '1234567890';
const WORKSPACE_NAME = 'Zain Workspace';
const COURSE_TITLE = process.env.SEED_COURSE_TITLE || 'English Grammar Fundamentals';

const log = (...args) => console.log(new Date().toISOString(), ...args);

let activePage = null;
const consoleErrors = [];
function attachDiagnostics(p) {
  p.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  p.on('pageerror', err => consoleErrors.push('PAGE ERROR: ' + err.message));
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ---------- Instructor: create course, modules, lessons ----------
  const instructorCtx = await browser.newContext();
  const page = await instructorCtx.newPage();
  activePage = page;
  attachDiagnostics(page);
  page.setDefaultTimeout(150000);

  log('Logging in as instructor...');
  await page.goto(`${BASE_URL}/auth/signin-basic`, { timeout: 150000, waitUntil: 'domcontentloaded' });

  // Known pre-existing dev-mode bug (documented in src/shared/logger/index.ts): the
  // pino-pretty transport's worker thread can die on its first spawn, corrupting the
  // webpack action-browser chunk for that dev-server process for a short window. Any
  // server action invoked while that's happening (e.g. setActiveWorkspace) 500s with
  // "Cannot read properties of undefined (reading 'call')". It self-resolves after a
  // retry, so we retry the whole login+workspace-selection flow rather than working
  // around it with a raw DB write.
  let loggedIn = false;
  for (let attempt = 1; attempt <= 5 && !loggedIn; attempt++) {
    if (attempt > 1) {
      log(`Login attempt ${attempt}, reloading signin page...`);
      try {
        await page.goto(`${BASE_URL}/auth/signin-basic`, { timeout: 150000, waitUntil: 'domcontentloaded' });
      } catch (e) {
        log('goto during retry aborted (likely mid-navigation), continuing:', e.message);
      }
      await page.waitForTimeout(3000);
      if (!page.url().includes('/auth/signin-basic') && !page.url().startsWith('chrome-error:')) {
        log('Already navigated away by the time retry started:', page.url());
        loggedIn = true;
        break;
      }
    }
    await page.locator('#nameEmail').fill(INSTRUCTOR_EMAIL);
    await page.locator('#passwordInput').fill(INSTRUCTOR_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Poll for either navigation away from signin, or the workspace picker appearing
    let pickerHandled = false;
    for (let i = 0; i < 45; i++) {
      await page.waitForTimeout(1000);
      if (!page.url().includes('/auth/signin-basic') && !page.url().startsWith('chrome-error:')) {
        log('Navigated away from signin at', i + 1, 's:', page.url());
        break;
      }
      const pickerVisible = await page.getByText('Pick a workspace', { exact: false }).isVisible().catch(() => false);
      if (pickerVisible && !pickerHandled) {
        log('Workspace picker shown at', i + 1, 's, selecting', WORKSPACE_NAME);
        const option = page.getByText(WORKSPACE_NAME, { exact: false }).first();
        await option.click();
        pickerHandled = true;
      }
    }
    await page.waitForLoadState('networkidle').catch(() => {});
    log(`Attempt ${attempt} result URL:`, page.url());
    if (!page.url().includes('/auth/signin-basic') && !page.url().startsWith('chrome-error:')) {
      loggedIn = true;
    }
  }
  if (!loggedIn) {
    throw new Error('Still on signin page after 5 login attempts — login/workspace-selection did not complete.');
  }
  log('Logged in. Current URL:', page.url());

  log('Navigating to /courses...');
  await page.goto(`${BASE_URL}/courses`, { timeout: 150000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  log('Creating course:', COURSE_TITLE);
  const createBtn = page.getByRole('button', { name: 'Create course' }).first();
  await createBtn.click();
  await page.locator('#new-course-title').fill(COURSE_TITLE);
  await page.getByRole('button', { name: 'Create course' }).last().click();
  await page.getByText('Course created successfully').waitFor({ timeout: 60000 });
  log('Course created.');

  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForLoadState('networkidle');

  const courseCard = page.locator('div', { hasText: COURSE_TITLE }).filter({ has: page.getByRole('button', { name: 'Manage' }) }).last();
  await courseCard.getByRole('button', { name: 'Manage' }).click();
  await page.waitForURL(/\/courses\/[a-f0-9-]+/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  const courseUrl = page.url();
  log('Course workspace URL:', courseUrl);

  // The course workspace tab bar duplicates label text with the outer dashboard's left
  // sidebar nav (both have a "Settings" item), so scope every tab click to the tab bar
  // container itself (identified by containing both "pricing" and "modules" tabs).
  const tabBar = page.locator('div.rounded-xl.p-1.w-fit').filter({ hasText: 'pricing' }).filter({ hasText: 'modules' });

  // ---------- Pricing: set Free Access ----------
  log('Setting pricing to Free Access...');
  await tabBar.getByRole('button', { name: 'pricing', exact: true }).click();
  await page.getByText('Free Access', { exact: false }).first().click();
  await page.getByRole('button', { name: /Lock pricing matrix/i }).click();
  await page.waitForTimeout(2000);

  // ---------- Settings: publish course ----------
  log('Publishing course...');
  await tabBar.getByRole('button', { name: 'settings', exact: true }).click();
  const launchStatusSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Published' }) }).first();
  await launchStatusSelect.selectOption({ label: 'Published' });
  await page.getByRole('button', { name: 'Save course settings' }).click();
  await page.waitForTimeout(2000);

  // ---------- Back to Modules tab ----------
  await tabBar.getByRole('button', { name: 'modules', exact: true }).click();
  await page.waitForLoadState('networkidle');

  const moduleIds = [];

  for (let mIdx = 0; mIdx < modules.length; mIdx++) {
    const mod = modules[mIdx];
    log(`Creating module ${mIdx + 1}/${modules.length}: ${mod.title}`);

    const addModuleBtn = mIdx === 0
      ? page.getByRole('button', { name: /New Module|Create First Module/i }).first()
      : page.getByRole('button', { name: 'New Module' }).first();
    await addModuleBtn.click();

    await page.getByPlaceholder(/Advanced Invoicing/i).fill(mod.title);

    // Publish Status select -> Published
    const publishStatusSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Published' }) }).first();
    await publishStatusSelect.selectOption({ label: 'Published' });

    await page.getByRole('button', { name: 'Save Module' }).click();
    await page.getByText('Module created successfully').waitFor({ timeout: 60000 });
    log('Module created:', mod.title);
    await page.waitForTimeout(1500);

    // ---------- Lessons for this module ----------
    for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
      const lesson = mod.lessons[lIdx];
      log(`  Creating lesson ${lIdx + 1}/${mod.lessons.length}: ${lesson.title}`);

      const moduleCard = page.locator('div', { hasText: mod.title }).filter({ has: page.getByRole('button', { name: 'Add Lesson' }) }).last();
      await moduleCard.getByRole('button', { name: 'Add Lesson' }).click();

      // Lesson type picker: select "Text" (scope to the modal dialog to avoid stray matches)
      const typeModal = page.locator('div').filter({ hasText: 'Select Lesson Type' }).first();
      const textCard = typeModal.getByText('Text', { exact: true }).first();
      await textCard.waitFor({ timeout: 15000 });
      await textCard.click();
      const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
      await nextBtn.waitFor({ timeout: 5000 });
      const isDisabled = await nextBtn.isDisabled();
      if (isDisabled) {
        log('    Next button still disabled after clicking Text card, retrying click...');
        await textCard.click({ force: true });
        await page.waitForTimeout(500);
      }
      await nextBtn.click();
      await page.getByText('Lesson initialized').waitFor({ timeout: 60000 });
      log('    Stub lesson created, opening editor...');

      // LessonCreatorModal opens automatically in edit mode
      const titleInput = page.getByPlaceholder(/Setting up the payfast hook endpoint/i);
      await titleInput.waitFor({ timeout: 10000 });
      await titleInput.fill('');
      await titleInput.fill(lesson.title);

      const contentTextarea = page.getByPlaceholder(/Explain lesson concepts/i);
      await contentTextarea.fill(lesson.content);

      log('    Saving lesson (this triggers RAG + summary pipelines, may take up to a minute)...');
      await page.getByRole('button', { name: 'Save Lesson Node' }).click();
      await page.getByText('Lesson saved successfully').waitFor({ timeout: 150000 });
      log('    Lesson saved:', lesson.title);

      // close modal if still open
      const closeBtn = page.locator('button[aria-label="Close"]').first();
      if (await closeBtn.count()) {
        try { await closeBtn.click({ timeout: 2000 }); } catch (e) {}
      }
      await page.waitForTimeout(1000);
    }
  }

  log('All modules and lessons created. Course URL:', courseUrl);
  await instructorCtx.close();

  // ---------- Student: enroll + verify AI features ----------
  const studentCtx = await browser.newContext();
  const spage = await studentCtx.newPage();
  activePage = spage;
  attachDiagnostics(spage);
  spage.setDefaultTimeout(150000);

  log('Logging in as dev test student via /api/test-login...');
  spage.setDefaultTimeout(150000);
  const loginResp = await spage.goto(`${BASE_URL}/api/test-login`, { timeout: 150000, waitUntil: 'domcontentloaded' });
  log('test-login status:', loginResp.status(), await loginResp.text());

  await spage.goto(`${BASE_URL}/student/marketplace`, { timeout: 150000, waitUntil: 'domcontentloaded' });
  await spage.waitForLoadState('networkidle');

  log('Enrolling in course via marketplace...');
  const enrollBtnByRole = spage.getByRole('button', { name: /Enroll Now|Already Enrolled/i });
  const studentCourseCard = spage.locator('div', { hasText: COURSE_TITLE }).filter({ has: enrollBtnByRole }).last();
  await studentCourseCard.scrollIntoViewIfNeeded();
  const enrollBtn = studentCourseCard.getByRole('button', { name: /Enroll Now|Already Enrolled/i }).first();
  const enrollBtnText = await enrollBtn.textContent();
  if (enrollBtnText && enrollBtnText.includes('Enroll Now')) {
    await enrollBtn.click();
    await spage.getByText('Successfully enrolled').waitFor({ timeout: 60000 });
    log('Enrolled successfully.');
  } else {
    log('Already enrolled, opening course...');
    await enrollBtn.click();
  }

  await spage.waitForURL(/\/student\/courses\/[a-f0-9-]+/, { timeout: 30000 });
  await spage.waitForLoadState('networkidle');
  await spage.waitForTimeout(2000);
  log('Student course player URL:', spage.url());

  // ---------- Lesson summary panel: expand on up to 2 lessons ----------
  const allLessonTitles = modules.flatMap(m => m.lessons.map(l => l.title));
  const summaryResults = [];
  const lessonsToCheck = allLessonTitles.slice(0, 2);
  for (let i = 0; i < lessonsToCheck.length; i++) {
    const lessonTitle = lessonsToCheck[i];
    log(`Checking lesson summary for: ${lessonTitle}`);
    if (i > 0) {
      await spage.getByText(lessonTitle, { exact: true }).first().click();
      await spage.waitForTimeout(1500);
    }
    const summaryBtn = spage.getByRole('button', { name: /Lesson summary/i }).first();
    await summaryBtn.waitFor({ timeout: 15000 });
    await summaryBtn.click();
    // Poll until bullets appear or the "not generated" message appears
    let bullets = [];
    let notGenerated = 0;
    for (let t = 0; t < 30; t++) {
      await spage.waitForTimeout(1000);
      bullets = await spage.locator('li').allInnerTexts();
      notGenerated = await spage.getByText("hasn't been generated", { exact: false }).count();
      if (bullets.length > 0 || notGenerated > 0) break;
    }
    summaryResults.push({ lesson: lessonTitle, bullets: notGenerated ? null : bullets });
    log('Summary bullets:', JSON.stringify(bullets), notGenerated ? '(not generated)' : '');
    await summaryBtn.click(); // collapse
  }

  // ---------- Course Q&A widget: ask 3 questions ----------
  const qaResults = [];
  log('Opening Course Q&A widget...');
  const qaLauncher = spage.getByRole('button', { name: 'Ask about this course' });
  await qaLauncher.click();
  await spage.waitForTimeout(1000);

  const questions = [
    "What's the difference between its and it's?",
    "What's the capital of France?",
    "What are the four types of sentences?",
  ];

  for (const q of questions) {
    log('Asking Q&A:', q);
    const bubbleLocator = spage.locator('.whitespace-pre-wrap');
    const countBefore = await bubbleLocator.count();
    const input = spage.getByPlaceholder(/Ask a question about this course/i);
    await input.fill(q);
    await input.press('Enter');
    let answer = '(no answer captured)';
    for (let i = 0; i < 45; i++) {
      await spage.waitForTimeout(1000);
      const countNow = await bubbleLocator.count();
      if (countNow > countBefore) {
        answer = await bubbleLocator.last().innerText();
        break;
      }
    }
    qaResults.push({ question: q, answer });
    log('Answer:', answer.slice(0, 200));
    await spage.waitForTimeout(8000); // avoid rate limit
  }

  console.log('\n\n===== SUMMARY RESULTS =====');
  console.log(JSON.stringify(summaryResults, null, 2));
  console.log('\n\n===== QA RESULTS =====');
  console.log(JSON.stringify(qaResults, null, 2));

  await studentCtx.close();
  await browser.close();
  log('Done.');
}

main().catch(async (err) => {
  console.error('SCRIPT FAILED:', err);
  if (activePage) {
    try {
      console.error('Current URL at failure:', activePage.url());
      await activePage.screenshot({ path: 'scripts/seed-grammar-course/failure.png', fullPage: true });
      console.error('Screenshot saved to scripts/seed-grammar-course/failure.png');
      console.error('Recent console/page errors:\n', consoleErrors.slice(-15).join('\n'));
    } catch (e2) {
      console.error('Failed to capture diagnostics:', e2.message);
    }
  }
  process.exit(1);
});

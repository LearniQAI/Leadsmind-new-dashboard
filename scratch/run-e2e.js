const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("Starting E2E Verification Flow...");

  // 0. Clean up any existing test data to ensure clean run
  console.log("Cleaning up existing test data...");
  const { data: existingProgs } = await supabase
    .from('affiliate_programmes')
    .select('id')
    .eq('name', 'Partnership Programme');
  
  if (existingProgs && existingProgs.length > 0) {
    const ids = existingProgs.map(p => p.id);
    await supabase.from('affiliates').delete().in('programme_id', ids);
    await supabase.from('affiliate_programmes').delete().in('id', ids);
    console.log("Cleaned up", ids.length, "stale programmes.");
  }

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000);
  
  // Log page console messages and errors
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR STACK:', err.stack || err.message));

  // Handle confirmations automatically
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] Accepted dialog: ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    // 1. Log in
    console.log("Navigating to signin page...");
    await page.goto("http://localhost:3000/auth/signin-basic", { waitUntil: 'networkidle2' });
    
    console.log("Entering login credentials...");
    await page.waitForSelector('#nameEmail');
    await page.type('#nameEmail', 'admin@leadsmind.com', { delay: 30 });
    await page.type('#passwordInput', 'Password123!', { delay: 30 });
    await sleep(500);
    
    console.log("Submitting login form...");
    await page.click('button[type="submit"]');
    
    console.log("Waiting for dashboard/main to load...");
    await page.waitForSelector('main', { timeout: 25000 });
    console.log("Login success! Current URL:", page.url());

    // 2. Navigate to affiliates dashboard
    console.log("Navigating to affiliates page...");
    await page.goto("http://localhost:3000/affiliates", { waitUntil: 'networkidle2' });
    await page.waitForSelector('button', { timeout: 10000 });
    await page.screenshot({ path: 'scratch/step2-affiliates-dashboard.png' });

    // 3. Create branded Partnership Programme
    console.log("Opening Create Programme modal...");
    const buttons = await page.$$('button');
    let createBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes("Create Programme")) {
        createBtn = btn;
        break;
      }
    }
    
    if (!createBtn) {
      throw new Error("Could not find 'Create Programme' button");
    }
    await createBtn.click();
    await sleep(1000); // wait for modal animation

    console.log("Filling in programme name...");
    const nameInput = await page.$('input[placeholder="e.g. LeadsMind Partner Network"]');
    await nameInput.type("Partnership Programme");

    console.log("Setting commission type and value...");
    const numInputs = await page.$$('input[type="number"]');
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const valInput = inputs.find(i => i.value === '10');
      if (valInput) {
        valInput.value = '';
      }
    });
    for (const input of numInputs) {
      const val = await page.evaluate(el => el.value, input);
      if (val === '10' || val === '') {
        await input.click({ clickCount: 3 });
        await input.type("30");
        break;
      }
    }

    console.log("Filling branding settings...");
    await page.type('input[placeholder="https://example.com/logo.png"]', 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png');
    await page.type('input[placeholder="Partner with us and earn"]', 'Partner with us and earn big!');
    
    // Fill first benefit
    await page.type('input[placeholder="e.g. 30-day cookie window"]', '30% recurring commission');
    
    // Add second benefit
    const addBenefitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('+ Add Benefit'));
    });
    if (addBenefitBtn.asElement()) {
      await addBenefitBtn.asElement().click();
      await sleep(200);
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[placeholder="e.g. 30-day cookie window"]'));
        if (inputs[1]) {
          inputs[1].value = '30-day cookie window';
          inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    }

    // Add custom question
    const addQuestionBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('+ Add Question'));
    });
    if (addQuestionBtn.asElement()) {
      await addQuestionBtn.asElement().click();
      await sleep(200);
      
      await page.evaluate(() => {
        const input = document.querySelector('input[placeholder="Question Label (e.g. Website URL or Social handles)"]');
        if (input) {
          input.value = 'What is your website URL?';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        const checkbox = document.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.nextSibling && checkbox.nextSibling.textContent.includes('Required question')) {
          checkbox.click();
        }
      });
    }

    // Terms
    await page.type('textarea[placeholder="e.g. I agree to the programme terms and privacy policy."]', 'I agree to the partnership program terms.');

    await page.screenshot({ path: 'scratch/step3-modal-filled.png' });

    console.log("Saving programme...");
    const saveBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent === 'Save');
    });
    await saveBtn.asElement().click();
    
    console.log("Waiting for programme to be created...");
    await sleep(3000);
    await page.screenshot({ path: 'scratch/step3-programme-saved.png' });

    // 4. Retrieve newly created programme ID from database
    console.log("Fetching programme ID from DB...");
    const { data: newProg, error: dbErr } = await supabase
      .from('affiliate_programmes')
      .select('id, registration_settings')
      .eq('name', 'Partnership Programme')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbErr || !newProg) {
      throw new Error("Could not find created programme in database: " + (dbErr?.message || "Not found"));
    }
    console.log("Created Programme ID:", newProg.id);
    console.log("Registration Settings in DB:", newProg.registration_settings);

    // 5. Go to the branded registration page
    const registerUrl = `http://localhost:3000/affiliate-portal/register?programmeId=${newProg.id}`;
    console.log("Navigating to branded register page:", registerUrl);
    await page.goto(registerUrl, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.screenshot({ path: 'scratch/step5-branded-registration-page.png' });

    // Assert branding elements are displayed on screen
    const pageContent = await page.content();
    const hasLogo = pageContent.includes('googlelogo_color_272x92dp.png');
    const hasHeadline = pageContent.includes('Partner with us and earn big!');
    const hasCommissionBadge = pageContent.includes('Earn 30% commission');
    const hasBenefit1 = pageContent.includes('30% recurring commission');
    const hasBenefit2 = pageContent.includes('30-day cookie window');
    const hasCustomQuestion = pageContent.includes('What is your website URL? *');

    console.log("Verifying branded page elements:");
    console.log("  - Logo visible:", hasLogo);
    console.log("  - Headline visible:", hasHeadline);
    console.log("  - Commission badge visible:", hasCommissionBadge);
    console.log("  - Benefit 1 visible:", hasBenefit1);
    console.log("  - Benefit 2 visible:", hasBenefit2);
    console.log("  - Custom Question visible:", hasCustomQuestion);

    if (!hasLogo || !hasHeadline || !hasCommissionBadge || !hasBenefit1 || !hasBenefit2 || !hasCustomQuestion) {
      throw new Error("Branding elements verification failed!");
    }

    // 6. Submit registration
    console.log("Filling registration form...");
    const inputs = await page.$$('input');
    await inputs[0].type("Test Affiliate");
    await inputs[1].type("testaffiliate@example.com");
    await inputs[2].type("1234567890");
    await inputs[3].type("Password123!");
    await inputs[4].type("https://myblog.com");
    
    await page.click('input[type="checkbox"]');
    
    await page.screenshot({ path: 'scratch/step6-registration-form-filled.png' });

    console.log("Submitting registration...");
    await page.click('button[type="submit"]');
    await sleep(3000);
    await page.screenshot({ path: 'scratch/step6-registration-success.png' });

    const successContent = await page.content();
    if (!successContent.includes("Application received")) {
      throw new Error("Registration did not show success message!");
    }
    console.log("Affiliate registered successfully!");

    // 7. Verify answers in the database
    console.log("Verifying answers in DB...");
    const { data: newAffiliate, error: affErr } = await supabase
      .from('affiliates')
      .select('*')
      .eq('email', 'testaffiliate@example.com')
      .single();

    if (affErr || !newAffiliate) {
      throw new Error("Could not find registered affiliate in DB: " + (affErr?.message || "Not found"));
    }
    console.log("Affiliate stored in DB:", {
      email: newAffiliate.email,
      status: newAffiliate.status,
      application_answers: newAffiliate.application_answers
    });

    const answersStr = JSON.stringify(newAffiliate.application_answers);
    if (!answersStr.includes("https://myblog.com")) {
      throw new Error("Application answers did not store the custom question answer!");
    }
    console.log("Database application answers verified successfully!");

    // 8. Log in back to main dashboard, go to affiliates list and delete the affiliate
    console.log("Returning to affiliates page to verify delete...");
    await page.goto("http://localhost:3000/affiliates", { waitUntil: 'networkidle2' });
    await sleep(2000);
    
    const affListTab = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Affiliates List'));
    });
    await affListTab.asElement().click();
    await sleep(1000);
    await page.screenshot({ path: 'scratch/step8-affiliates-list.png' });

    const listContent = await page.content();
    if (!listContent.includes("testaffiliate@example.com")) {
      throw new Error("Registered affiliate is not visible in the dashboard list!");
    }
    console.log("Affiliate is listed in the dashboard table.");

    console.log("Deleting affiliate...");
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const row = rows.find(r => r.textContent.includes('testaffiliate@example.com'));
      if (row) {
        const deleteBtn = Array.from(row.querySelectorAll('button')).find(b => b.textContent.includes('Delete'));
        if (deleteBtn) {
          deleteBtn.click();
        }
      }
    });

    await sleep(3000);
    await page.screenshot({ path: 'scratch/step8-after-delete.png' });

    const afterDeleteContent = await page.content();
    if (afterDeleteContent.includes("testaffiliate@example.com")) {
      throw new Error("Affiliate was not removed from the dashboard list after clicking delete!");
    }
    console.log("Affiliate removed from the dashboard list successfully!");

    const { data: deletedAff } = await supabase
      .from('affiliates')
      .select('id')
      .eq('email', 'testaffiliate@example.com')
      .maybeSingle();

    if (deletedAff) {
      throw new Error("Affiliate still exists in the database after deletion!");
    }
    console.log("Affiliate hard-deleted from DB successfully!");

    // 9. Re-register again with same email to prove it's freed
    console.log("Navigating back to register page to verify re-registration...");
    await page.goto(registerUrl, { waitUntil: 'networkidle2' });
    await sleep(1000);

    const reInputs = await page.$$('input');
    await reInputs[0].type("Test Affiliate");
    await reInputs[1].type("testaffiliate@example.com");
    await reInputs[2].type("1234567890");
    await reInputs[3].type("Password123!");
    await reInputs[4].type("https://myblog-re.com");
    await page.click('input[type="checkbox"]');
    
    console.log("Submitting re-registration...");
    await page.click('button[type="submit"]');
    await sleep(3000);
    await page.screenshot({ path: 'scratch/step9-re-registration-success.png' });

    const reSuccessContent = await page.content();
    if (!reSuccessContent.includes("Application received")) {
      throw new Error("Re-registration failed to submit successfully!");
    }
    console.log("Re-registration of the same email succeeded! (Email block was freed successfully)");

    console.log("--- E2E VERIFICATION SUCCESSFUL ---");

  } catch (error) {
    console.error("--- E2E VERIFICATION FAILED ---", error);
    await page.screenshot({ path: 'scratch/error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

run();

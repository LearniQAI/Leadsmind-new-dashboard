const { chromium } = require('playwright');

async function test() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  console.log("Browser launched successfully!");
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/auth/signin-basic");
  console.log("Title:", await page.title());
  await browser.close();
}

test().catch(console.error);

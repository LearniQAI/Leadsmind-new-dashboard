import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'C:/Users/User/AppData/Local/Temp/claude/c--Users-User-Leadsmind-new-dashboard/b7a07e47-cf4a-4d9e-91cc-edb4176a7c96/scratchpad';
const BASE = 'http://localhost:3000';
const COURSE_ID = '3c48d584-fc53-4250-b96e-cd8ebd56be10';
const DESC = `${BASE}/courses/mathematics`;

const errors = [];
const browser = await chromium.launch();
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function shot(name, url, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await ctx.close();
  console.log(`✓ ${name}`);
}

await shot('desc-desktop', DESC, DESKTOP);
await shot('desc-mobile', DESC, MOBILE);

// click-through + focus ring
{
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[flow] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[flow] pageerror: ${e.message}`));
  await page.goto(DESC, { waitUntil: 'networkidle', timeout: 120000 });

  const cta = page.getByRole('button', { name: /enroll|enrol|subscribe|start free/i }).first();
  await cta.waitFor({ timeout: 15000 });
  // focus-ring screenshot on the description CTA
  await cta.focus();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/desc-cta-focus.png`, clip: { x: 880, y: 40, width: 520, height: 520 } });

  await cta.click();
  await page.waitForURL('**/checkout/**', { timeout: 30000 });
  await page.waitForTimeout(2500);
  console.log(`✓ flow landed on ${page.url()}`);
  await page.screenshot({ path: `${OUT}/flow-checkout.png`, fullPage: true });

  // Tab to the pay button, capture its focus ring
  const pay = page.getByRole('button', { name: /pay .*enrol|continue to secure payment|enrol for free/i }).first();
  await pay.focus();
  await page.waitForTimeout(300);
  const fInfo = await page.evaluate(() => {
    const el = document.activeElement; if (!el) return null;
    const s = getComputedStyle(el);
    return { tag: el.tagName, text: (el.textContent||'').trim().slice(0,40), boxShadow: s.boxShadow.slice(0,80) };
  });
  console.log('pay button focus:', JSON.stringify(fInfo));
  await page.screenshot({ path: `${OUT}/checkout-pay-focus.png`, clip: { x: 640, y: 120, width: 780, height: 480 } });
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/_console_errors2.txt`, errors.length ? errors.join('\n') : '(no console errors)');
console.log('\n=== CONSOLE ERRORS ===\n' + (errors.length ? errors.join('\n') : '(none)'));

import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:3000/p/thumb-scratch?t=velocity', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'public/web-templates/velocity/thumbnail.jpg', clip: { x: 0, y: 0, width: 1280, height: 800 }, quality: 85, type: 'jpeg' });
await page.screenshot({ path: 'scripts/velocity-hero-check.png', clip: { x: 0, y: 0, width: 1280, height: 800 } });
console.log('ERRORS:', errors);
await browser.close();

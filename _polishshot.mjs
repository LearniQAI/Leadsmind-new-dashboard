import { chromium } from 'playwright';
const URL = 'http://localhost:3000/unauthenticated/panel-polish-audit';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/c--Users-User-Leadsmind-new-dashboard/7f321fdc-26b0-47eb-8ff9-146786d436e1/scratchpad';

const run = async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
  const perr = [];
  page.on('pageerror', e => perr.push(e.message));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 150000 });
  await page.waitForSelector('[data-testid="select-Heading"]', { timeout: 60000 });
  await sleep(2500);

  for (const name of ['Text', 'Heading', 'Paragraph', 'Video', 'Image']) {
    await page.click(`[data-testid="select-${name}"]`, { force: true });
    await sleep(900);
    // expand Video/Image sections that matter; open a couple of dropdowns closed
    const panel = page.locator('.z-40');
    await panel.screenshot({ path: `${OUT}/polish-${name}.png` }).catch(async () => {
      await page.screenshot({ path: `${OUT}/polish-${name}-full.png` });
    });
    console.log(`shot ${name}`);
  }
  console.log('pageerrors:', perr.length ? [...new Set(perr)].join(' | ') : '(none)');
  await b.close();
};
run().catch(e => { console.error('FATAL', e); process.exit(1); });

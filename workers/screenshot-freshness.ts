if (typeof global !== 'undefined' && !(global as any).WebSocket) {
  (global as any).WebSocket = class {};
}
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase admin service client to query/insert across RLS definitions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function runFreshnessCheck() {
  console.log('--- STARTING WEEKLY HELP SCREENSHOT FRESHNESS MONITOR ---');
  let browser = null;
  try {
    // 1. Fetch screenshot metadata targets
    const { data: screenshots, error } = await supabase
      .from('help_screenshots')
      .select('id, route_path, selector, stored_hash')
      .not('route_path', 'is', null)
      .not('selector', 'is', null);

    if (error) {
      throw new Error(`Supabase query failure: ${error.message}`);
    }

    if (!screenshots || screenshots.length === 0) {
      console.log('No screenshots registered with route_path and selector variables.');
      return { status: 'skipped', message: 'No screenshot nodes configured.' };
    }

    console.log(`Loaded ${screenshots.length} screenshot records for comparison check.`);

    // 2. Provision headless Chromium browser instance
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // 3. Staging Login sequence
    const stagingBaseUrl = process.env.STAGING_URL || 'http://localhost:3000';
    console.log(`Targeting staging platform: ${stagingBaseUrl}`);

    await page.goto(`${stagingBaseUrl}/auth/login`, { waitUntil: 'networkidle' });
    try {
      await page.fill('input[type="email"]', process.env.STAGING_USER || 'admin@leadsmind.com');
      await page.fill('input[type="password"]', process.env.STAGING_PASSWORD || 'password123');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 });
      console.log('Session authentication verified.');
    } catch (authErr) {
      console.warn('Login flow bypassed or timed out. Proceeding direct...', authErr);
    }

    let diffCount = 0;

    // 4. Capture & Compare Loop
    for (const ss of screenshots) {
      try {
        console.log(`Checking Screenshot: ${ss.id} | Path: ${ss.route_path}`);
        await page.goto(`${stagingBaseUrl}${ss.route_path}`, { waitUntil: 'networkidle' });

        const node = page.locator(ss.selector!);
        await node.waitFor({ state: 'visible', timeout: 5000 });

        // Capture screenshot of element node
        const screenshotBuffer = await node.screenshot();

        // Generate MD5 visual fingerprint
        const actualHash = crypto.createHash('md5').update(screenshotBuffer).digest('hex');

        console.log(`Comparing hash metrics -> Expected: ${ss.stored_hash || 'NULL'} | Actual: ${actualHash}`);

        if (ss.stored_hash && ss.stored_hash !== actualHash) {
          console.warn(`[HASH MISMATCH DETECTED] Screenshot ID: ${ss.id}`);
          diffCount++;

          // Insert regression record into help_update_queue
          const { error: insertErr } = await supabase
            .from('help_update_queue')
            .insert({
              screenshot_id: ss.id,
              route_path: ss.route_path!,
              selector: ss.selector!,
              expected_hash: ss.stored_hash,
              actual_hash: actualHash,
              status: 'pending'
            });

          if (insertErr) {
            console.error(`Alert registration error: ${insertErr.message}`);
          } else {
            console.log(`Alert queued for review: Screenshot ${ss.id}`);
          }
        } else {
          if (!ss.stored_hash) {
            // Update initial hash if not set yet
            await supabase
              .from('help_screenshots')
              .update({ stored_hash: actualHash })
              .eq('id', ss.id);
            console.log(`Initialized stored_hash mapping for ${ss.id} to: ${actualHash}`);
          } else {
            console.log(`Verification OK: Screenshot matches layout fingerprint.`);
          }
        }
      } catch (err: any) {
        console.error(`Error verifying screenshot ${ss.id}:`, err.message);
      }
    }

    return { status: 'success', checked: screenshots.length, deviations: diffCount };

  } catch (err: any) {
    console.error('Freshness monitor worker failed:', err.message);
    return { status: 'failure', error: err.message };
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('--- SCREENSHOT FRESHNESS MONITOR WORKER COMPLETED ---');
  }
}

// Support CLI direct script runner trigger
if (typeof require !== 'undefined' && require.main === module) {
  runFreshnessCheck();
}

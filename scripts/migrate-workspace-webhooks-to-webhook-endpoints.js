// One-time data migration: copies any existing rows from workspace_webhooks into
// webhook_endpoints, so nothing configured through the (previously non-functional)
// /settings/developer webhook UI is silently lost once workspace_webhooks is deprecated.
//
// workspace_webhooks has no `secret` column — there is no existing secret to preserve, so this
// mints a brand-new CSPRNG secret per row and encrypts it with the exact same AES-256-CBC
// scheme as src/lib/encryption.ts's encrypt() (duplicated here rather than imported, since this
// is a standalone script run outside the Next.js/TS build). If src/lib/encryption.ts's algorithm
// ever changes, update this file to match before running it again.
//
// This script is NOT run automatically by any migration — it must be run manually, once, against
// the real database, with SUPABASE_SERVICE_ROLE_KEY and ENCRYPTION_KEY set in the environment:
//   node scripts/migrate-workspace-webhooks-to-webhook-endpoints.js
//
// Run 20260725000004_consolidate_webhook_tables.sql FIRST (adds webhook_endpoints.label and
// fixes the webhook_delivery_logs FK) — this script assumes that column already exists.
// Do not drop workspace_webhooks until this script has been run and its output reviewed.

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey() {
  const encryptionKeyEnv = process.env.ENCRYPTION_KEY;
  if (!encryptionKeyEnv) {
    throw new Error('[FATAL] ENCRYPTION_KEY env var is not configured');
  }
  return crypto.createHash('sha256').update(encryptionKeyEnv).digest();
}

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: legacyWebhooks, error: fetchErr } = await supabase
    .from('workspace_webhooks')
    .select('id, workspace_id, url, label, active, created_at');

  if (fetchErr) throw fetchErr;

  if (!legacyWebhooks || legacyWebhooks.length === 0) {
    console.log('No rows found in workspace_webhooks. Nothing to migrate.');
    console.log('Safe to proceed with dropping workspace_webhooks in a follow-up migration.');
    return;
  }

  console.log(`Found ${legacyWebhooks.length} row(s) in workspace_webhooks. Migrating...`);

  let migrated = 0;
  let failed = 0;

  for (const hook of legacyWebhooks) {
    const rawSecret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
    const { error: insertErr } = await supabase.from('webhook_endpoints').insert({
      workspace_id: hook.workspace_id,
      url: hook.url,
      label: hook.label,
      events: ['*'], // workspace_webhooks had no event-type filtering — preserve "fires on everything"
      secret: encrypt(rawSecret),
      is_active: hook.active !== false,
      created_at: hook.created_at,
    });

    if (insertErr) {
      console.error(`Failed to migrate workspace_webhooks row ${hook.id}:`, insertErr.message);
      failed += 1;
      continue;
    }

    migrated += 1;
    console.log(`Migrated ${hook.id} -> new webhook_endpoints row (workspace ${hook.workspace_id}, url ${hook.url})`);
    console.log(`  New signing secret (not recoverable after this line): ${rawSecret}`);
    console.log('  The workspace admin must reconfigure their receiving endpoint with this new secret.');
  }

  console.log(`\nDone. Migrated: ${migrated}, Failed: ${failed}, Total: ${legacyWebhooks.length}`);
  if (failed > 0) {
    console.log('Do NOT drop workspace_webhooks until every failed row above is resolved.');
  } else {
    console.log('All rows migrated. Safe to proceed with dropping workspace_webhooks in a follow-up migration.');
  }
}

main().catch((err) => {
  console.error('Migration script failed:', err);
  process.exit(1);
});

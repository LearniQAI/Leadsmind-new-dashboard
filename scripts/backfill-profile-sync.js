// One-time backfill: real name/avatar sync for Facebook/Instagram contacts that still carry
// the "{Platform} User {id}" placeholder because they were created before syncContactProfile()
// shipped (see src/app/api/webhooks/meta/route.ts and src/app/api/admin/meta/backfill-profile-sync/
// route.ts, whose logic this mirrors). Standalone script (like
// migrate-workspace-webhooks-to-webhook-endpoints.js) so it can run outside the Next.js/TS build
// and outside the HTTP session-auth layer that route.ts requires — decrypt() is duplicated here
// rather than imported for the same reason.
//
// Run manually, once, against the real database:
//   node scripts/backfill-profile-sync.js
// Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY in the environment.

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const GRAPH_API_VERSION = 'v18.0';

function getEncryptionKey() {
  const encryptionKeyEnv = process.env.ENCRYPTION_KEY;
  if (!encryptionKeyEnv) {
    throw new Error('[FATAL] ENCRYPTION_KEY env var is not configured');
  }
  return crypto.createHash('sha256').update(encryptionKeyEnv).digest();
}

function decrypt(encryptedText) {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encryption payload structure.');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function isPlaceholderName(firstName, lastName, platformLabel, senderId) {
  return firstName === `${platformLabel} User` && lastName === senderId.substring(0, 8);
}

async function fetchFacebookProfile(psid, pageAccessToken) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${psid}?fields=first_name,last_name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) {
    return { success: false, error: data.error?.message || `HTTP ${response.status}` };
  }
  if (!data.first_name && !data.last_name && !data.profile_pic) {
    return { success: false, error: 'empty_profile_response (likely missing Advanced Access for Business Asset User Profile Access)' };
  }
  return { success: true, firstName: data.first_name, lastName: data.last_name, profilePicUrl: data.profile_pic };
}

async function fetchInstagramProfile(igsid, pageAccessToken) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${igsid}?fields=name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) {
    return { success: false, error: data.error?.message || `HTTP ${response.status}` };
  }
  if (!data.name && !data.profile_pic) {
    return { success: false, error: 'empty_profile_response' };
  }
  return { success: true, name: data.name, profilePicUrl: data.profile_pic };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, workspace_id, platform, external_thread_id, contact_id, contacts(id, first_name, last_name)')
    .in('platform', ['facebook', 'instagram']);

  if (error) throw error;

  if (!conversations || conversations.length === 0) {
    console.log('No Facebook/Instagram conversations found. Nothing to backfill.');
    return;
  }

  console.log(`Found ${conversations.length} Facebook/Instagram conversation(s). Checking for placeholder names...`);

  const connectionCache = new Map();
  const results = [];

  for (const conv of conversations) {
    const contact = conv.contacts;
    const platformLabel = conv.platform === 'facebook' ? 'Facebook' : 'Instagram';

    if (!contact) {
      results.push({ conversationId: conv.id, platform: conv.platform, skipped: true, reason: 'no linked contact' });
      continue;
    }

    if (!isPlaceholderName(contact.first_name, contact.last_name, platformLabel, conv.external_thread_id)) {
      results.push({ conversationId: conv.id, platform: conv.platform, contactId: contact.id, skipped: true, reason: 'already has a real synced name' });
      continue;
    }

    const cacheKey = `${conv.platform}:${conv.workspace_id}`;
    let connection = connectionCache.get(cacheKey);
    if (connection === undefined) {
      const { data } = await supabase
        .from('platform_connections')
        .select('credentials')
        .eq('workspace_id', conv.workspace_id)
        .eq('platform', conv.platform)
        .limit(1)
        .maybeSingle();
      connection = data || null;
      connectionCache.set(cacheKey, connection);
    }

    const encryptedToken = connection?.credentials?.page_access_token_encrypted;
    if (!encryptedToken) {
      results.push({ conversationId: conv.id, platform: conv.platform, contactId: contact.id, skipped: true, reason: 'no platform_connections page_access_token found' });
      continue;
    }

    const update = { profile_synced_at: new Date().toISOString() };
    let success = false;
    let errorMsg;

    try {
      const pageAccessToken = decrypt(encryptedToken);

      if (conv.platform === 'facebook') {
        const profile = await fetchFacebookProfile(conv.external_thread_id, pageAccessToken);
        if (profile.success && (profile.firstName || profile.lastName)) {
          update.first_name = profile.firstName || '';
          update.last_name = profile.lastName || '';
          if (profile.profilePicUrl) update.avatar_url = profile.profilePicUrl;
          success = true;
        } else {
          errorMsg = profile.error;
        }
      } else {
        const profile = await fetchInstagramProfile(conv.external_thread_id, pageAccessToken);
        if (profile.success && profile.name) {
          const [firstName, ...rest] = profile.name.split(' ');
          update.first_name = firstName || profile.name;
          update.last_name = rest.join(' ');
          if (profile.profilePicUrl) update.avatar_url = profile.profilePicUrl;
          success = true;
        } else {
          errorMsg = profile.error;
        }
      }
    } catch (e) {
      errorMsg = e.message;
    }

    const { error: contactUpdateErr } = await supabase.from('contacts').update(update).eq('id', contact.id);
    if (contactUpdateErr) {
      console.error(`  Failed to write contact ${contact.id} update:`, contactUpdateErr.message);
    }

    if (success) {
      const newTitle = `${update.first_name} ${update.last_name}`.trim();
      await supabase.from('conversations').update({ title: newTitle }).eq('id', conv.id);
      console.log(`[SYNCED] ${conv.platform} conversation ${conv.id} -> "${newTitle}"${update.avatar_url ? ' (avatar synced)' : ' (no avatar returned)'}`);
    } else {
      console.log(`[FALLBACK] ${conv.platform} conversation ${conv.id} kept placeholder "${contact.first_name} ${contact.last_name}" — reason: ${errorMsg}`);
    }

    results.push({ conversationId: conv.id, platform: conv.platform, contactId: contact.id, success, error: errorMsg });
  }

  const synced = results.filter((r) => r.success).length;
  const fallback = results.filter((r) => r.success === false).length;
  const skipped = results.filter((r) => r.skipped).length;

  console.log(`\nDone. Synced: ${synced}, Fallback (placeholder kept): ${fallback}, Skipped: ${skipped}, Total: ${results.length}`);
}

main().catch((err) => {
  console.error('Backfill script failed:', err);
  process.exit(1);
});

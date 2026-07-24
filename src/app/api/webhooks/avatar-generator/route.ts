import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { generateAvatarPng } from '@/lib/avatar/generateAvatarPng';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Constant-time shared-secret comparison — same standing rule as every other signature/token
// check in this codebase (see webhooks/meta, lib/calendar/payfast, lib/security/unsubscribeToken).
// A plain `===` leaks timing information proportional to the number of matching leading bytes.
function isValidWebhookSecret(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(req: Request) {
  try {
    const secret = process.env.AVATAR_GENERATOR_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('[FATAL] AVATAR_GENERATOR_WEBHOOK_SECRET is not configured');
    }

    // This is a Supabase Database Webhook (fires on user row insert/update) — Supabase lets
    // you attach a custom HTTP header to the webhook config, which must carry this shared
    // secret. Without it, anyone who discovers this URL could POST an arbitrary user id and
    // force avatar generation/storage writes into that user's real workspaces.
    const providedSecret = req.headers.get('x-webhook-secret');
    if (!isValidWebhookSecret(providedSecret, secret)) {
      logger.warn({}, 'webhook.avatar_generator.secret.invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Parse user record from Supabase webhook structure or direct invocation
    const user = body.record || body;
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Missing user payload details.' }, { status: 400 });
    }

    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || 'LM';
    const bgColor = user.identity_color || '#3b82f6';

    logger.info({ userId: user.id, initials, bgColor }, 'webhook.avatar_generator.generating');
    
    // 1. Generate Avatar PNG buffer
    const pngBuffer = await generateAvatarPng(initials, bgColor);
    
    // 2. Fetch all workspaces this user belongs to
    const supabase = createAdminClient();
    const { data: memberships, error: memError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id);

    if (memError) {
      logger.error({ err: memError, userId: user.id }, 'webhook.avatar_generator.workspaces_fetch.failed');
      return NextResponse.json({ error: 'Failed to fetch user workspaces.' }, { status: 500 });
    }

    // 3. Upload to each workspace avatars bucket path
    let uploadCount = 0;
    for (const m of (memberships || [])) {
      const destinationPath = `${m.workspace_id}/${user.id}/email-avatar.png`;
      logger.info({ workspaceId: m.workspace_id, destinationPath }, 'webhook.avatar_generator.upload.start');

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(destinationPath, pngBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        logger.error({ err: uploadError, workspaceId: m.workspace_id }, 'webhook.avatar_generator.upload.failed');
      } else {
        uploadCount++;
      }
    }

    return NextResponse.json({ success: true, uploads: uploadCount });
  } catch (error: any) {
    logger.error({ err: error }, 'webhook.avatar_generator.failed');
    return NextResponse.json({ error: 'Avatar webhook failed.' }, { status: 500 });
  }
}

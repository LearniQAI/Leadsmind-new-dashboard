import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateAvatarPng } from '@/lib/avatar/generateAvatarPng';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
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

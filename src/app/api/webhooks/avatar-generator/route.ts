import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateAvatarPng } from '@/lib/avatar/generateAvatarPng';

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

    console.log(`[Avatar Webhook] Generating preset for User: ${user.id} (${initials}) with BG: ${bgColor}`);
    
    // 1. Generate Avatar PNG buffer
    const pngBuffer = await generateAvatarPng(initials, bgColor);
    
    // 2. Fetch all workspaces this user belongs to
    const supabase = createAdminClient();
    const { data: memberships, error: memError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id);

    if (memError) {
      console.error('[Avatar Webhook] Error fetching user workspaces:', memError);
      return NextResponse.json({ error: memError.message }, { status: 500 });
    }

    // 3. Upload to each workspace avatars bucket path
    let uploadCount = 0;
    for (const m of (memberships || [])) {
      const destinationPath = `${m.workspace_id}/${user.id}/email-avatar.png`;
      console.log(`[Avatar Webhook] Uploading fallback avatar asset to: avatars/${destinationPath}`);
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(destinationPath, pngBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error(`[Avatar Webhook] Failed to upload for workspace ${m.workspace_id}:`, uploadError.message);
      } else {
        uploadCount++;
      }
    }

    return NextResponse.json({ success: true, uploads: uploadCount });
  } catch (error: any) {
    console.error('[Avatar Webhook Exception]:', error);
    return NextResponse.json({ error: error.message || 'Avatar webhook failed' }, { status: 500 });
  }
}

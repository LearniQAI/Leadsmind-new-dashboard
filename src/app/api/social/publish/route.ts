import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { decrypt } from '@/lib/encryption'
import { logger } from '@/shared/logger'

// Reading/decrypting real connected social credentials (Facebook/Instagram page tokens) and
// posting with them requires RLS-bypass access to platform_connections — kept on the
// service-role client, same as every other credential-decrypt route in this codebase
// (social_accounts, workspace_integrations), but ONLY after the caller's identity and
// workspace membership have been verified below via requireWorkspaceAccess() — never from
// the unverified active_workspace_id cookie alone.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Real session + real workspace_members row required — never trust the raw
    // active_workspace_id cookie for authorization (see src/lib/auth.ts's own doc comment
    // on getCurrentWorkspaceId(), which explicitly warns against using it this way).
    let workspaceId: string;
    try {
      ({ workspaceId } = await requireWorkspaceAccess());
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (err instanceof ForbiddenError) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      throw err;
    }

    const { message, platforms, imageUrl } = await req.json()
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

    const results: any = {}

    for (const platform of platforms) {
      const { data: conn } = await supabase
        .from('platform_connections')
        .select('credentials')
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .eq('status', 'connected')
        .maybeSingle()

      if (!conn?.credentials) {
        results[platform] = { error: `${platform} not connected` }
        continue
      }

      const creds = conn.credentials as any

      try {
        if (platform === 'facebook') {
          const pageToken = decrypt(creds.page_access_token_encrypted)
          const pageId = creds.page_id
          const body: any = { message, access_token: pageToken }
          if (imageUrl) body.link = imageUrl
          const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error?.message || 'Facebook post failed')
          results[platform] = { success: true, postId: data.id }
        }

        if (platform === 'instagram') {
          const pageToken = decrypt(creds.page_access_token_encrypted)
          const igId = creds.instagram_id
          if (!igId) throw new Error('Instagram ID not found')
          
          const containerRes = await fetch(`https://graph.facebook.com/v18.0/${igId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caption: message,
              image_url: imageUrl || null,
              media_type: imageUrl ? 'IMAGE' : 'REELS',
              access_token: pageToken
            })
          })
          const container = await containerRes.json()
          if (!containerRes.ok) throw new Error(container.error?.message || 'Instagram media creation failed')

          const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: container.id,
              access_token: pageToken
            })
          })
          const publishData = await publishRes.json()
          if (!publishRes.ok) throw new Error(publishData.error?.message || 'Instagram publish failed')
          results[platform] = { success: true, postId: publishData.id }
        }

        // Save to social_posts table
        await supabase.from('social_posts').insert({
          workspace_id: workspaceId,
          platform,
          content: message,
          image_url: imageUrl || null,
          published_at: new Date().toISOString(),
          external_post_id: results[platform]?.postId || null,
          status: 'published'
        }).then(() => {})

      } catch (err: any) {
        results[platform] = { error: err.message }
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    logger.error({ err }, 'social.publish.failed')
    return NextResponse.json({ error: 'Failed to publish post.' }, { status: 500 })
  }
}

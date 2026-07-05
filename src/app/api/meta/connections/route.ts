import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentWorkspaceId, getUser } from '@/lib/auth'
import { isMetaConfigured } from '@/lib/meta/config'

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await getCurrentWorkspaceId()
    const user = await getUser()

    if (!user || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('platform_connections')
      .select('platform, status, credentials, last_sync_at')
      .eq('workspace_id', workspaceId)
      .in('platform', ['facebook', 'instagram', 'whatsapp'])

    if (error) throw error

    const connections = ['facebook', 'instagram', 'whatsapp'].map(plat => {
      const dbRecord = data?.find(d => d.platform === plat)
      const creds = dbRecord?.credentials || {}
      
      return {
        platform: plat as 'facebook' | 'instagram' | 'whatsapp',
        connected: dbRecord?.status === 'connected',
        accountName: plat === 'facebook' ? creds.page_name : 
                     plat === 'instagram' ? creds.instagram_username : 
                     (creds.waba_name ?? creds.whatsapp_business_name),
        accountHandle: plat === 'instagram' && creds.instagram_username ? `@${creds.instagram_username}` : undefined,
        phoneNumber: plat === 'whatsapp' ? (creds.phone_number ?? creds.whatsapp_phone_number) : undefined,
      }
    })

    return NextResponse.json({
      connections,
      workspaceId,
      userId: user.id,
      isMetaConfigured: isMetaConfigured()
    })
  } catch (error: any) {
    console.error('[API meta/connections GET] Error:', error.message)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const workspaceId = await getCurrentWorkspaceId()
    const user = await getUser()

    if (!user || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const platform = searchParams.get('platform')

    if (!platform || !['facebook', 'instagram', 'whatsapp'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform parameter' }, { status: 400 })
    }

    const { error } = await supabase
      .from('platform_connections')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('platform', platform)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API meta/connections DELETE] Error:', error.message)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

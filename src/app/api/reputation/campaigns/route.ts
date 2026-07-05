import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentWorkspaceId, getUser } from '@/lib/auth'

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId') || await getCurrentWorkspaceId()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reputation_campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      workspace_id,
      name,
      review_platform,
      review_url,
      email_subject,
      email_body,
      sms_body,
      whatsapp_body,
      status
    } = body

    const workspaceId = workspace_id || await getCurrentWorkspaceId()

    if (!workspaceId || !name || !review_platform || !review_url || !email_subject || !email_body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reputation_campaigns')
      .insert({
        workspace_id: workspaceId,
        name,
        review_platform,
        review_url,
        email_subject,
        email_body,
        sms_body: sms_body || '',
        whatsapp_body: whatsapp_body || '',
        status: status || 'active'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const workspaceId = searchParams.get('workspaceId') || await getCurrentWorkspaceId()

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const body = await req.json()

    const { data, error } = await supabase
      .from('reputation_campaigns')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq("id", id).eq("workspace_id", workspaceId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const workspaceId = searchParams.get('workspaceId') || await getCurrentWorkspaceId()

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('reputation_campaigns')
      .delete()
      .eq("id", id).eq("workspace_id", workspaceId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

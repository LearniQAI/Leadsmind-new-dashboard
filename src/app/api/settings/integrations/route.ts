import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — fetch all integrations for a workspace
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('workspace_integrations')
    .select('provider, category, connected, account_label, connected_at')
    .eq('workspace_id', workspaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ integrations: data ?? [] })
}

// POST — mark an integration as connected
export async function POST(req: NextRequest) {
  const { workspaceId, provider, category, accountLabel, webhookUrl } = await req.json()
  if (!workspaceId || !provider || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // If automation platform and webhookUrl is provided, create a webhook_endpoint
  if (category === 'automation' && webhookUrl && webhookUrl.startsWith('http')) {
    const secret = `whsec_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`
    
    // Check if webhook already exists
    const { data: existing } = await supabase
      .from('webhook_endpoints')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('url', webhookUrl)
      .maybeSingle()

    if (!existing) {
      await supabase.from('webhook_endpoints').insert({
        workspace_id: workspaceId,
        url: webhookUrl,
        events: ['contact.created', 'deal.won', 'invoice.paid', 'form.submitted'],
        secret,
        is_active: true
      })
    }
  }

  const { error } = await supabase
    .from('workspace_integrations')
    .upsert({
      workspace_id: workspaceId,
      provider,
      category,
      connected: true,
      account_label: accountLabel ?? null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,provider' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — disconnect an integration
export async function DELETE(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  const provider = req.nextUrl.searchParams.get('provider')
  if (!workspaceId || !provider) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Deactivate associated webhook endpoints
  let domainPattern = ''
  if (provider.toLowerCase() === 'zapier') domainPattern = 'zapier.com'
  else if (provider.toLowerCase() === 'make.com') domainPattern = 'make.com'
  else if (provider.toLowerCase() === 'n8n') domainPattern = 'n8n'
  else if (provider.toLowerCase() === 'pabbly connect') domainPattern = 'pabbly'

  if (domainPattern) {
    // Delete webhooks containing this pattern
    const { data: hooks } = await supabase
      .from('webhook_endpoints')
      .select('id, url')
      .eq('workspace_id', workspaceId)

    if (hooks) {
      const matchIds = hooks
        .filter(h => h.url && h.url.toLowerCase().includes(domainPattern))
        .map(h => h.id)
      
      if (matchIds.length > 0) {
        await supabase
          .from('webhook_endpoints')
          .delete()
          .in('id', matchIds)
      }
    }
  }

  const { error } = await supabase
    .from('workspace_integrations')
    .update({
      connected: false,
      account_label: null,
      connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

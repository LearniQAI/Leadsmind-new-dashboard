import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — fetch all KYC checks for a contact
export async function GET(req: NextRequest) {
  const contactId = req.nextUrl.searchParams.get('contactId')
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })

  const { data: checks } = await supabase
    .from('kyc_checks')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })

  const { data: consents } = await supabase
    .from('kyc_consent_records')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ checks: checks ?? [], consents: consents ?? [] })
}

// POST — record consent + create a KYC check
export async function POST(req: NextRequest) {
  try {
    const { contactId, workspaceId, checkType, provider, consentGiven, checkedBy } = await req.json()

    if (!contactId || !workspaceId || !checkType || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!consentGiven) {
      return NextResponse.json({ error: 'Consent is required before running any verification' }, { status: 400 })
    }

    // Record consent
    const { data: consent } = await supabase
      .from('kyc_consent_records')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        consent_type: checkType === 'hanis_identity' ? 'identity_verification' :
                      checkType === 'credit_report' ? 'credit_check' : 'full_kyc',
        status: 'obtained',
        obtained_at: new Date().toISOString(),
        obtained_by: checkedBy ?? null,
        reference: `consent_${Date.now()}`,
      })
      .select()
      .single()

    // Create the check record with status 'pending'
    // Real provider API calls will be added when contracts are signed
    const { data: check, error } = await supabase
      .from('kyc_checks')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        check_type: checkType,
        provider,
        status: 'pending',
        consent_id: consent?.id ?? null,
        checked_by: checkedBy ?? null,
        notes: 'Provider API integration pending. Check queued for manual processing.',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Fire webhook
    // dispatchWebhook(workspaceId, 'kyc.identity.passed', { contactId, checkType })

    return NextResponse.json({ success: true, check })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — update check status (for when provider result comes back)
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates = await req.json()
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('kyc_checks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, check: data })
}

// DELETE — remove a check
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('kyc_checks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

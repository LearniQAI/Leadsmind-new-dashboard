import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { toClientError } from '@/shared/errors/AppError';

export const dynamic = 'force-dynamic';

async function verifyContactInWorkspace(contactId: string, workspaceId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  return !!data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contactId = params.id;
  if (!contactId) {
    return NextResponse.json({ error: 'contactId required' }, { status: 400 });
  }

  try {
    const { workspaceId } = await requireWorkspaceRole();
    if (!(await verifyContactInWorkspace(contactId, workspaceId))) {
      return NextResponse.json({ error: 'Contact not found in this workspace' }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('contact_verifications')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ verifications: data || [] });
  } catch (error: any) {
    console.error('[verifications-get] error:', error);
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contactId = params.id;
  try {
    const { workspaceId } = await requireWorkspaceRole();
    if (!(await verifyContactInWorkspace(contactId, workspaceId))) {
      return NextResponse.json({ error: 'Contact not found in this workspace' }, { status: 404 });
    }

    const body = await req.json();
    const { verificationType, provider, consentGiven } = body;

    if (!verificationType || !provider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (consentGiven !== true) {
      return NextResponse.json({ error: 'Contact consent is required to run verifications.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Insert record with status = 'running'
    const { data: insertData, error: insertError } = await supabase
      .from('contact_verifications')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        verification_type: verificationType,
        provider,
        status: 'running',
        consent_given: consentGiven,
        consent_given_at: new Date().toISOString(),
        result: {}
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Since real provider APIs need contracts, update & return status = 'pending'
    // with a note: "Verification queued. Provider connection required."
    const { data: updateData, error: updateError } = await supabase
      .from('contact_verifications')
      .update({
        status: 'pending',
        notes: 'Verification queued. Provider connection required.',
        updated_at: new Date().toISOString()
      })
      .eq('id', insertData.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return NextResponse.json(updateData);
  } catch (error: any) {
    console.error('[verifications-post] error:', error);
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contactId = params.id;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Verification ID required' }, { status: 400 });
  }

  try {
    const { workspaceId } = await requireWorkspaceRole();
    if (!(await verifyContactInWorkspace(contactId, workspaceId))) {
      return NextResponse.json({ error: 'Contact not found in this workspace' }, { status: 404 });
    }

    const supabase = createAdminClient();

    // Verify the verification record itself belongs to this contact/workspace before allowing
    // the update — the `id` query param alone is not a valid authorization boundary.
    const { data: existing } = await supabase
      .from('contact_verifications')
      .select('id')
      .eq('id', id)
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Verification record not found' }, { status: 404 });
    }

    const body = await req.json();
    const { status, result, notes } = body;

    const updateFields: any = {
      updated_at: new Date().toISOString()
    };
    if (status) updateFields.status = status;
    if (result) updateFields.result = result;
    if (notes) updateFields.notes = notes;

    const { data, error } = await supabase
      .from('contact_verifications')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[verifications-patch] error:', error);
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contactId = params.id;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Verification ID required' }, { status: 400 });
  }

  try {
    const { workspaceId } = await requireWorkspaceRole();
    if (!(await verifyContactInWorkspace(contactId, workspaceId))) {
      return NextResponse.json({ error: 'Contact not found in this workspace' }, { status: 404 });
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from('contact_verifications')
      .select('id')
      .eq('id', id)
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Verification record not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('contact_verifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[verifications-delete] error:', error);
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

import { NextRequest } from 'next/server';
import { corsResponse, corsError, getAdminSupabase } from '../../_lib/cors';
import { verifyPrefillToken } from '@/lib/builder/tokens';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const token = req.nextUrl.searchParams.get('lm_token');

  if (!id) return corsError('Form ID is required', 400);
  if (!token) return corsResponse({ prefill: null });

  try {
    const payload = await verifyPrefillToken(token);
    if (!payload) {
      return corsResponse({ prefill: null, error: 'Invalid or expired token' }, 200);
    }

    const supabase = getAdminSupabase();

    // Verify form exists and belongs to the workspace in the token
    const { data: form } = await supabase
      .from('forms')
      .select('id, workspace_id, fields, config')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (!form || form.workspace_id !== payload.workspaceId) {
      return corsResponse({ prefill: null, error: 'Unauthorized token for this form' }, 200);
    }

    // Fetch contact data
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', payload.contactId)
      .eq('workspace_id', payload.workspaceId)
      .single();

    if (!contact) {
      return corsResponse({ prefill: null, error: 'Contact not found' }, 200);
    }

    // Map contact data to form fields based on type/name
    const prefillData: Record<string, any> = {};
    const fields = Array.isArray(form.fields) ? form.fields : [];
    
    // We only auto-fill safe standard fields for now to prevent leaking arbitrary CRM data
    const allowedContactKeys = ['email', 'phone', 'first_name', 'last_name', 'company'];
    
    for (const field of fields) {
      if (field.type === 'email' && contact.email) {
        prefillData[field.id] = contact.email;
      } else if (field.type === 'phone' && contact.phone) {
        prefillData[field.id] = contact.phone;
      } else if (field.type === 'text') {
        const lbl = (field.label || '').toLowerCase();
        if (lbl.includes('first name') || lbl.includes('firstname')) {
          prefillData[field.id] = contact.first_name || '';
        } else if (lbl.includes('last name') || lbl.includes('lastname')) {
          prefillData[field.id] = contact.last_name || '';
        } else if (lbl.includes('name') && !lbl.includes('company')) {
          prefillData[field.id] = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '';
        } else if (lbl.includes('company')) {
          prefillData[field.id] = contact.company || '';
        }
      }
    }

    return corsResponse({ 
      prefill: prefillData,
      returningContact: {
        id: contact.id,
        name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email
      }
    });

  } catch (err: any) {
    console.error('[Prefill API] GET error:', err);
    return corsError('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return corsResponse(null, 200);
}

import { NextRequest, NextResponse } from 'next/server';
import { TriggerDispatcher, AutomationTriggerEvent } from '@/lib/automations/TriggerDispatcher';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const formId = params.id;
  try {
    const body = await req.json();
    const {
      event,
      values = {},
      completionPercentage = 0,
      attribution = {},
      isReturningContact = false,
      metadata = {}
    } = body;

    if (!event) {
      return NextResponse.json({ error: 'Missing required trigger event parameters' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Resolve the real workspace_id from the form's own record — never trust a
    // client-supplied workspaceId, which would let a caller fire automation trigger
    // events into an arbitrary workspace using any form id.
    const { data: form } = await supabase
      .from('forms')
      .select('name, workspace_id')
      .eq('id', formId)
      .single();

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    TriggerDispatcher.dispatch(event as AutomationTriggerEvent, {
      formId,
      workspaceId: form.workspace_id,
      formName: form?.name || 'Form',
      values,
      completionPercentage,
      attribution,
      isReturningContact,
      metadata: {
        ...metadata,
        userAgent: req.headers.get('user-agent') || 'unknown',
        referer: req.headers.get('referer') || '',
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Public Events API] Trigger dispatch failed:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

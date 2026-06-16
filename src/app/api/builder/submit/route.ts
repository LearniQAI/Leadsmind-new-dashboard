import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handlePageFormSubmission } from '@/app/actions/builder';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { formData, pageId, workspaceId, formId } = body;

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing workspaceId' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Log the submission in the builder_form_submissions table
    const { error: insertError } = await supabase
      .from('builder_form_submissions')
      .insert({
        workspace_id: workspaceId,
        page_id: pageId || null,
        form_id: formId || 'default_form',
        payload: formData || {}
      });

    if (insertError) {
      console.error('[Submit API Error] DB Log insertion failed:', insertError);
    }

    // 2. Process contact update and activities inside the CRM
    const crmResult = await handlePageFormSubmission(pageId || '', workspaceId, formData || {});
    
    // 3. Dispatch to external webhooks (Sprint 28)
    try {
      const { data: settingsRecord } = await supabase
        .from('workspace_builder_settings')
        .select('settings')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      const builderSettings = settingsRecord?.settings || {};
      const webhooks = builderSettings.webhooks || [];

      // Forward submission asynchronously to all active webhook endpoints
      const activeWebhooks = webhooks.filter((w: any) => w.active && (!w.events || w.events.includes('form_submission')));
      
      for (const hook of activeWebhooks) {
        // Run in background without blocking current request execution
        fetch(hook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'form_submission',
            formId: formId || 'default',
            pageId: pageId || null,
            workspaceId,
            timestamp: new Date().toISOString(),
            data: formData
          })
        }).catch(err => {
          console.error(`[Webhook Dispatch Error] Failed for ${hook.url}:`, err.message);
        });
      }
    } catch (hookErr: any) {
      console.error('[Submit API Webhook Dispatch Error]:', hookErr.message);
    }

    return NextResponse.json({ success: true, crm: crmResult });

  } catch (error: any) {
    console.error('[Submit API Fatal Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

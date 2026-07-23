import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient();
    
    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspaceId');

    let workspaceId: string | null = null;
    if (requestedWorkspaceId) {
      // A workspaceId was explicitly supplied — verify real membership rather than trusting it.
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('workspace_id', requestedWorkspaceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      workspaceId = membership.workspace_id;
    } else {
      // No workspaceId provided, get user's primary/first workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      workspaceId = membership?.workspace_id || null;
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Get settings
    let { data: settings, error } = await supabaseAdmin
      .from('support_widget_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    // If it doesn't exist yet, insert defaults
    if (!settings) {
      const { data: newSettings, error: insertErr } = await supabaseAdmin
        .from('support_widget_settings')
        .insert({
          workspace_id: workspaceId,
          welcome_message: 'How can we help you today?',
          brand_color: '#2563eb',
          departments: [
            { id: 'support', name: 'Customer Support', email: '' },
            { id: 'billing', name: 'Billing', email: '' }
          ],
          categories: [
            { id: 'general', name: 'General Inquiry', description: 'General questions' },
            { id: 'bug', name: 'Bug Report', description: 'Report a technical issue' }
          ],
          notification_preferences: { email: true, in_app: true }
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      settings = newSettings;
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('[support.widget-settings.get] failed:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    
    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      workspaceId,
      welcome_message,
      brand_color,
      logo_url,
      departments,
      categories,
      notification_preferences
    } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: settings, error } = await supabaseAdmin
      .from('support_widget_settings')
      .upsert({
        workspace_id: workspaceId,
        welcome_message,
        brand_color,
        logo_url,
        departments: departments || [],
        categories: categories || [],
        notification_preferences: notification_preferences || { email: true, in_app: true },
        updated_at: new Date().toISOString()
      }, { onConflict: 'workspace_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('[support.widget-settings.post] failed:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}

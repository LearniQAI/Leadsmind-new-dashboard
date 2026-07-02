import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getUserAccessInfo, getCurrentWorkspaceId } from '@/lib/auth';

/**
 * Helper to enforce admin/compliance role blocking.
 */
async function authorizeComplianceOfficer() {
  const { role } = await getUserAccessInfo();
  if (!role || !['admin', 'compliance'].includes(role)) {
    return { authorized: false, status: 403, error: 'Unauthorized: Admin or Compliance role required' };
  }
  return { authorized: true, role };
}

/**
 * GET /api/kyc/compliance/str
 * List all suspicious transaction reports for the active workspace.
 */
export async function GET(req: NextRequest) {
  try {
    const authStatus = await authorizeComplianceOfficer();
    if (!authStatus.authorized) {
      return NextResponse.json({ error: authStatus.error }, { status: authStatus.status });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No active workspace context' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: reports, error } = await supabase
      .from('str_reports')
      .select('*, contact:contacts(first_name, last_name, id_number)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reports: reports || [] });
  } catch (err: any) {
    console.error('[API GET /api/kyc/compliance/str error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/kyc/compliance/str
 * Create or save an STR draft.
 */
export async function POST(req: NextRequest) {
  try {
    const authStatus = await authorizeComplianceOfficer();
    if (!authStatus.authorized) {
      return NextResponse.json({ error: authStatus.error }, { status: authStatus.status });
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No active workspace context' }, { status: 400 });
    }

    const body = await req.json();
    const { contactId, amount, currency, transactionDate, description, anomalies, id } = body;

    if (!contactId || amount === undefined || !currency || !transactionDate || !description) {
      return NextResponse.json({ error: 'Missing required payload parameters' }, { status: 400 });
    }

    const transactionDetails = {
      amount: parseFloat(amount),
      currency,
      transaction_date: transactionDate,
      description
    };

    const supabase = await createServerClient();

    if (id) {
      // Update existing draft
      const { data, error } = await supabase
        .from('str_reports')
        .update({
          transaction_details: transactionDetails,
          anomalies: anomalies || [],
          updated_at: new Date().toISOString()
        })
        .eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, report: data });
    } else {
      // Create new draft
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('str_reports')
        .insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          transaction_details: transactionDetails,
          anomalies: anomalies || [],
          status: 'draft',
          created_by: user?.id || null
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, report: data });
    }
  } catch (err: any) {
    console.error('[API POST /api/kyc/compliance/str error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

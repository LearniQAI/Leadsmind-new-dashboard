import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const ALLOWED_FINANCE_ROLES = ['admin', 'owner'];

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_FINANCE_ROLES);
    const adminClient = createAdminClient();

    const page = Number(req.nextUrl.searchParams.get('page') || '1');
    const limit = Number(req.nextUrl.searchParams.get('limit') || '50');
    const search = req.nextUrl.searchParams.get('search') || '';

    let query = adminClient
      .from('accounting_transactions')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('date', { ascending: false });

    if (search) {
      query = query.or(`description.ilike.%${search}%,reference.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      transactions: data || [],
      total: count || 0,
      page,
      limit
    });
  } catch (err: any) {
    logger.error({ err }, 'finance.transactions.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_FINANCE_ROLES);
    const adminClient = createAdminClient();

    const { date, description, amount, type, reference } = await req.json();
    if (!description || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const totalAmount = type === 'expense' ? -Math.abs(Number(amount)) : Math.abs(Number(amount));

    const { data, error } = await adminClient
      .from('accounting_transactions')
      .insert({
        workspace_id: workspaceId,
        date: date || new Date().toISOString().split('T')[0],
        description,
        total_amount: totalAmount,
        reference: reference || null,
        source_type: 'manual'
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, transaction: data });
  } catch (err: any) {
    logger.error({ err }, 'finance.transactions.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { workspaceId } = await requireWorkspaceRole(ALLOWED_FINANCE_ROLES);
    const adminClient = createAdminClient();

    const { date, description, amount, type, reference } = await req.json();
    const updates: any = {};

    if (date) updates.date = date;
    if (description) updates.description = description;
    if (reference !== undefined) updates.reference = reference;
    if (amount !== undefined && type) {
      updates.total_amount = type === 'expense' ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
    } else if (amount !== undefined) {
      updates.total_amount = Number(amount);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await adminClient
      .from('accounting_transactions')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, transaction: data });
  } catch (err: any) {
    logger.error({ err }, 'finance.transactions.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { workspaceId } = await requireWorkspaceRole(ALLOWED_FINANCE_ROLES);
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('accounting_transactions')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'finance.transactions.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  const page = Number(req.nextUrl.searchParams.get('page') || '1');
  const limit = Number(req.nextUrl.searchParams.get('limit') || '50');
  const search = req.nextUrl.searchParams.get('search') || '';

  try {
    let query = supabase
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
  } catch (error: any) {
    console.error('[transactions-get] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, date, description, amount, type, reference } = await req.json();
    if (!workspaceId || !description || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const totalAmount = type === 'expense' ? -Math.abs(Number(amount)) : Math.abs(Number(amount));

    const { data, error } = await supabase
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
  } catch (error: any) {
    console.error('[transactions-post] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  try {
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

    const { data, error } = await supabase
      .from('accounting_transactions')
      .update(updates)
      .eq("id", id).eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, transaction: data });
  } catch (error: any) {
    console.error('[transactions-patch] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('accounting_transactions')
      .delete()
      .eq("id", id).eq("workspace_id", workspaceId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[transactions-delete] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

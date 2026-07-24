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

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // 1. Total income this month (sum of total_amount from accounting_transactions where source_type in ('invoice','bank_feed'))
    const { data: incomeData, error: incomeError } = await adminClient
      .from('accounting_transactions')
      .select('total_amount')
      .eq('workspace_id', workspaceId)
      .in('source_type', ['invoice', 'bank_feed'])
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (incomeError) throw incomeError;
    const totalIncome = (incomeData || []).reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

    // 2. Total expenses this month (sum from expenses table)
    const { data: expensesData, error: expensesError } = await adminClient
      .from('expenses')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (expensesError) throw expensesError;
    const totalExpenses = (expensesData || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // 3. Outstanding invoices (count from invoices where status = 'unpaid')
    const { count: unpaidInvoicesCount, error: invoicesError } = await adminClient
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'unpaid');

    if (invoicesError) throw invoicesError;

    // 4. Cash balance (default to 0 since bank connections are coming soon)
    const cashBalance = 0;

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      outstandingInvoicesCount: unpaidInvoicesCount || 0,
      cashBalance
    });
  } catch (err: any) {
    logger.error({ err }, 'finance.overview.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

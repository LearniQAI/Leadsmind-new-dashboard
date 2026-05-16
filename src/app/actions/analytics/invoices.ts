'use server';

import { createServerClient } from '@/lib/supabase/server';

export async function getInvoiceAnalytics(workspaceId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc('get_invoice_metrics', {
    target_workspace_id: workspaceId
  });

  if (error) {
    // Fallback to manual aggregate if RPC doesn't exist
    const { data: manualData, error: manualError } = await supabase
      .from('invoices')
      .select('total_amount, status, due_date')
      .eq('workspace_id', workspaceId);

    if (manualError) return { total_collected: 0, total_overdue: 0, bad_debt_total: 0 };

    const total_collected = manualData
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.total_amount), 0);

    const total_overdue = manualData
      .filter(i => i.status !== 'paid' && i.status !== 'void' && i.due_date && new Date(i.due_date) < new Date())
      .reduce((sum, i) => sum + Number(i.total_amount), 0);

    // Write-offs would come from another table
    const { data: writeOffs } = await supabase
      .from('invoice_write_offs')
      .select('amount_written_off')
      .eq('workspace_id', workspaceId);
    
    const bad_debt_total = writeOffs?.reduce((sum, w) => sum + Number(w.amount_written_off), 0) || 0;

    return { total_collected, total_overdue, bad_debt_total };
  }

  return data[0] || { total_collected: 0, total_overdue: 0, bad_debt_total: 0 };
}

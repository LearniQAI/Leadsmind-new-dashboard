import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

// Task 47: Build self-service payslip viewing
export async function getMyPayslips(employeeId: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    // 1. Fetch only the payslips for this specific employee in this workspace
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('id, period_start, period_end, status, payment_date, amount, currency')
      .eq('workspace_id', workspaceId)
      .eq('employee_id', employeeId)
      .eq('status', 'paid') // Only show them payslips that have actually been paid
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    logger.error({ err: error, employeeId }, 'hr.payslips.fetch_failed');
    return { success: false, error: 'Failed to load payslips.' };
  }
}

// Task 48: Fix "Mark as Paid" / "Delete Run" payroll buttons
export async function markRunAsPaid(runId: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('payroll_runs')
      .update({ 
        status: 'paid',
        payment_date: new Date().toISOString()
      })
      .eq('id', runId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    logger.error({ err: error, runId }, 'hr.payroll.mark_paid_failed');
    return { success: false, error: 'Failed to mark payroll run as paid.' };
  }
}

export async function deletePayrollRun(runId: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('payroll_runs')
      .delete()
      .eq('id', run,id)
      .eq('workspace_id', workspaceId)
      .eq('status', 'draft'); // Security check: Only allow deleting drafts

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error, runId }, 'hr.payroll.delete_failed');
    return { success: false, error: 'Failed to delete payroll run.' };
  }
}

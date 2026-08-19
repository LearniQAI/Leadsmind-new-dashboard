import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

export async function getMyPayslips(employeeId: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('payroll_runs')
      .select('id, period_start, period_end, status, payment_date, amount, currency')
      .eq('workspace_id', workspaceId)
      .eq('employee_id', employeeId)
      .eq('status', 'paid') 
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    logger.error({ err: error, employeeId }, 'hr.payslips.fetch_failed');
    return { success: false, error: 'Failed to load payslips.' };
  }
}

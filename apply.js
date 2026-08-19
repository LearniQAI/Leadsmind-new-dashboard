const fs = require('fs');
const path = require('path');

const HR_API_DIR = path.join(process.cwd(), 'src', 'app', 'actions', 'hr');
const payrollPath = path.join(HR_API_DIR, 'payroll.ts');
let payrollCode = fs.existsSync(payrollPath) ? fs.readFileSync(payrollPath, 'utf8') : '';

if (!payrollCode.includes('markRunAsPaid')) {
  payrollCode += `
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
      .eq('id', runId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'draft'); // Security check: Only allow deleting drafts

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error, runId }, 'hr.payroll.delete_failed');
    return { success: false, error: 'Failed to delete payroll run.' };
  }
}
`;
  fs.writeFileSync(payrollPath, payrollCode);
  console.log("SUCCESS! Task 48 (Payroll Buttons) backend built.");
}
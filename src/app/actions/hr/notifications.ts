import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { logger } from '@/shared/logger';

// Task 49: Extend HR notifications (payroll runs, new hires, terminations)
export async function sendHRNotification(employeeId: string, eventType: 'payroll_run' | 'new_hire' | 'termination') {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    // 1. Fetch Employee Details
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('first_name, last_name, email')
      .eq('id', employeeId)
      .eq('workspace_id', workspaceId)
      .single();

    if (empError || !employee || !employee.email) {
       logger.info({ employeeId }, 'hr.notifications.skipped_no_email');
       return { success: false, error: 'Employee not found or has no email.' };
    }

    // 2. Build the Email based on the Event Type
    let subject = '';
    let messageText = '';

    if (eventType === 'payroll_run') {
      subject = 'Your Payslip is Ready';
      messageText = `Hi ${employee.first_name},

Your latest payslip has been generated and is now available in your employee portal.

Please log in to review your payment details.`;
    } else if (eventType === 'new_hire') {
      subject = 'Welcome to the Team!';
      messageText = `Hi ${employee.first_name},

Welcome to the team! Your employee profile has been successfully created.

Please log in to complete your onboarding and upload your required documents.`;
    } else if (eventType === 'termination') {
      subject = 'Important Update Regarding Your Employment';
      messageText = `Hi ${employee.first_name},

This is an automated notification regarding the recent change to your employment status. Please contact HR if you have any questions.`;
    }

    // 3. Send the Email via Resend
    await sendEmail({
      to: employee.email,
      subject: subject,
      text: messageText,
      tags: [{ name: 'category', value: `hr_${eventType}` }] as any,
    } as any);

    return { success: true };
  } catch (error: any) {
    logger.error({ err: error, employeeId }, `hr.notifications.failed_${eventType}`);
    return { success: false, error: 'Failed to send HR notification.' };
  }
}

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { executeLMSAction } from '../../../core/src/events/lms-event-bus';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Polls and processes pending onboarding emails from the queue.
 */
export async function processEmailQueue(batchSize: number = 20) {
  console.log(`[Queue Processor] Running email queue processor (batch: ${batchSize})...`);
  
  // Fetch pending jobs
  const { data: jobs, error } = await supabaseAdmin
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false }) // High priority first
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    console.error('[Queue Processor] Failed to fetch jobs:', error);
    return { processed: 0, error: error.message };
  }

  if (!jobs || jobs.length === 0) {
    console.log('[Queue Processor] No pending onboarding emails in queue.');
    return { processed: 0 };
  }

  let successCount = 0;

  for (const job of jobs) {
    // Acquire lock (mark as processing)
    const { error: lockErr } = await supabaseAdmin
      .from('email_queue')
      .update({ status: 'processing' })
      .eq('id', job.id);

    if (lockErr) continue; // Race condition / lock failed

    try {
      // Fetch workspace settings to fetch API keys and custom from addresses
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('resend_api_key, email_from_address, email_from_name')
        .eq('id', job.workspace_id)
        .single();

      await sendEmail({
        to: job.to_email,
        subject: job.subject,
        html: job.body_html,
        config: {
          apiKey: workspace?.resend_api_key,
          fromEmail: workspace?.email_from_address,
          fromName: workspace?.email_from_name || 'LeadsMind Onboarding'
        }
      });

      // Update as sent
      await supabaseAdmin
        .from('email_queue')
        .update({
          status: 'sent',
          processed_at: new Date().toISOString(),
          attempts: job.attempts + 1
        })
        .eq('id', job.id);

      successCount++;
    } catch (sendErr: any) {
      console.error(`[Queue Processor] Failed to send email job ${job.id}:`, sendErr.message);
      
      const attempts = job.attempts + 1;
      const nextStatus = attempts >= 3 ? 'failed' : 'pending';

      await supabaseAdmin
        .from('email_queue')
        .update({
          status: nextStatus,
          attempts,
          error_message: sendErr.message,
          processed_at: new Date().toISOString()
        })
        .eq('id', job.id);
    }
  }

  return { processed: jobs.length, sent: successCount };
}

/**
 * Polls and processes pending delayed LMS actions where trigger threshold is reached.
 */
export async function processDelayedActions(batchSize: number = 20) {
  console.log(`[Queue Processor] Running delayed actions scheduler...`);

  const now = new Date().toISOString();

  const { data: actions, error } = await supabaseAdmin
    .from('lms_delayed_actions')
    .select('*')
    .eq('status', 'pending')
    .lte('run_at', now)
    .order('run_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    console.error('[Queue Processor] Failed to fetch delayed actions:', error);
    return { processed: 0, error: error.message };
  }

  if (!actions || actions.length === 0) {
    console.log('[Queue Processor] No delayed actions ready to run.');
    return { processed: 0 };
  }

  let successCount = 0;

  for (const action of actions) {
    try {
      await executeLMSAction(
        action.workspace_id,
        action.contact_id,
        action.action_type,
        action.action_config
      );

      await supabaseAdmin
        .from('lms_delayed_actions')
        .update({ status: 'executed' })
        .eq('id', action.id);

      successCount++;
    } catch (err: any) {
      console.error(`[Queue Processor] Failed executing delayed action ${action.id}:`, err);
      
      await supabaseAdmin
        .from('lms_delayed_actions')
        .update({
          status: 'failed',
          error_message: err.message
        })
        .eq('id', action.id);
    }
  }

  return { processed: actions.length, executed: successCount };
}

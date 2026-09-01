import { createAdminClient } from '@/lib/supabase/server';
import { resolveWorkspaceTwilioCredentials } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';
import { logger } from '@/shared/logger';

export async function sendCalendarSMS(workspaceId: string, toPhone: string, message: string) {
  try {
    const supabase = createAdminClient();
    
    // 1. Get the workspace's Twilio credentials
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number')
      .eq('id', workspaceId)
      .single();

    if (!workspace) return false;

    const { accountSid, authToken } = resolveWorkspaceTwilioCredentials(workspace);
    const fromPhone = workspace.twilio_number || process.env.TWILIO_PHONE_NUMBER;

    // If they haven't configured Twilio, we just silently fail (no SMS sent)
    if (!accountSid || !authToken || !fromPhone) {
      logger.info({ workspaceId }, 'calendar.sms.skipped_no_twilio_credentials');
      return false;
    }

    // 2. Send the SMS using the official Twilio API
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: new URLSearchParams({
        To: toPhone,
        From: fromPhone,
        Body: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twilio error: ${errorData.message}`);
    }

    return true;
  } catch (error) {
    logger.error({ err: error, toPhone }, 'calendar.sms.send_failed');
    return false;
  }
}
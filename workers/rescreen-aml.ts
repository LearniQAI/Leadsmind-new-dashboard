(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { refinitivService } from '../server/services/refinitiv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function runRescreening() {
  console.log('[AML Rescreen Cron] Starting automated rescreening job...');
  
  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Find all sanctions screening checks older than 30 days
  const { data: expiredChecks, error: expiredChecksErr } = await supabase
    .from('kyc_checks')
    .select('contact_id, workspace_id, created_at')
    .eq('check_type', 'sanctions_screen')
    .lt('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false });

  if (expiredChecksErr) {
    console.error('[AML Rescreen Cron] Error fetching expired checks:', expiredChecksErr.message);
    return { success: false, error: expiredChecksErr.message };
  }

  if (!expiredChecks || expiredChecks.length === 0) {
    console.log('[AML Rescreen Cron] No expired AML screening logs found.');
    return { success: true, count: 0 };
  }

  // Filter unique contact IDs in memory (since we ordered descending, the first is the latest)
  const contactLatestChecksMap = new Map<string, any>();
  for (const check of expiredChecks) {
    if (!contactLatestChecksMap.has(check.contact_id)) {
      contactLatestChecksMap.set(check.contact_id, check);
    }
  }

  console.log(`[AML Rescreen Cron] Found ${contactLatestChecksMap.size} unique contacts with expired AML screens. Verifying freshness...`);

  let rescreenedCount = 0;

  for (const [contactId, check] of contactLatestChecksMap.entries()) {
    // Double check if there is a newer screening check created in the last 30 days
    const { data: newerChecks, error: newerChecksErr } = await supabase
      .from('kyc_checks')
      .select('id')
      .eq('contact_id', contactId)
      .eq('check_type', 'sanctions_screen')
      .gte('created_at', thirtyDaysAgo)
      .limit(1);

    if (newerChecksErr) {
      console.warn(`[AML Rescreen Cron] Error checking freshness for contact ${contactId}:`, newerChecksErr.message);
      continue;
    }

    if (newerChecks && newerChecks.length > 0) {
      // Contact has already been screened in the last 30 days, skip
      continue;
    }

    // Fetch contact details (first_name, last_name, id_number)
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('first_name, last_name, id_number, kyc_risk_flag')
      .eq('id', contactId)
      .single();

    if (contactErr || !contact) {
      console.warn(`[AML Rescreen Cron] Contact ${contactId} not found or error:`, contactErr?.message);
      continue;
    }

    console.log(`[AML Rescreen Cron] Rescreening contact: ${contact.first_name} ${contact.last_name} (${contactId})`);

    try {
      // Execute Refinitiv screening case
      const screening = await refinitivService.screenCase({
        name: `${contact.first_name} ${contact.last_name}`,
        idNumber: contact.id_number || undefined,
        workspaceId: check.workspace_id,
      });

      const checkStatus = (screening.amlMatchLevel === 'STRONG_MATCH') ? 'failed' :
                          (screening.amlMatchLevel === 'MEDIUM_MATCH') ? 'manual_review' : 'passed';

      // Insert fresh check log
      const { error: insertErr } = await supabase
        .from('kyc_checks')
        .insert({
          workspace_id: check.workspace_id,
          contact_id: contactId,
          check_type: 'sanctions_screen',
          provider: 'Refinitiv',
          status: checkStatus,
          aml_match_level: screening.amlMatchLevel,
          aml_match_details: screening.amlMatchDetails,
          raw_response: screening.rawResponse,
          notes: `Automated 30-day rescreening. Status: ${checkStatus}. Match Level: ${screening.amlMatchLevel}.`,
          created_at: new Date().toISOString(),
        });

      if (insertErr) {
        console.error(`[AML Rescreen Cron] Failed to log check for contact ${contactId}:`, insertErr.message);
        continue;
      }

      // Update contact details risk flags
      let newRiskFlag = contact.kyc_risk_flag;
      if (screening.amlMatchLevel === 'STRONG_MATCH') {
        newRiskFlag = 'HIGH';
      } else if (screening.amlMatchLevel === 'MEDIUM_MATCH') {
        newRiskFlag = 'MEDIUM';
      }

      const { error: updateErr } = await supabase
        .from('contacts')
        .update({
          kyc_risk_flag: newRiskFlag,
          kyc_id_verified: screening.amlMatchLevel === 'STRONG_MATCH' ? false : undefined,
          kyc_id_verified_at: screening.amlMatchLevel === 'STRONG_MATCH' ? null : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId);

      if (updateErr) {
        console.error(`[AML Rescreen Cron] Failed to update contact ${contactId}:`, updateErr.message);
      } else {
        rescreenedCount++;
      }

    } catch (err: any) {
      console.error(`[AML Rescreen Cron] Fail rescreening case for contact ${contactId}:`, err.message);
    }
  }

  console.log(`[AML Rescreen Cron] Run completed. Total rescreened contacts: ${rescreenedCount}`);
  return { success: true, count: rescreenedCount };
}

// Trigger execution if run directly from CLI
if (require.main === module) {
  runRescreening()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

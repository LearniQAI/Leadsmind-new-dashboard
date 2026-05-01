'use server';

import { createServerClient } from '@/lib/supabase/server';

/**
 * Calculates and updates the lead score for a contact.
 */
export async function calculateLeadScore(contactId: string, eventType: string = 'manual_update') {
  try {
    const supabase = await createServerClient();
    
    // 1. Fetch current score
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('lead_score')
      .eq('id', contactId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Determine score increment
    let increment = 5; // Default
    if (eventType === 'page_view') increment = 1;
    if (eventType === 'form_submission') increment = 25;
    if (eventType === 'email_open') increment = 2;
    if (eventType === 'email_click') increment = 10;

    const newScore = (contact?.lead_score || 0) + increment;

    // 3. Update the record
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ 
        lead_score: newScore,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) throw updateError;

    return { success: true, newScore };
  } catch (error: any) {
    console.error('[automation] Lead score error:', error);
    return { success: false, error: error.message };
  }
}

export async function getAutomationLogsForContact(contactId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[automation] Error fetching logs:', error);
    return [];
  }
  return data || [];
}


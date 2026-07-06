'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

/**
 * --- LEAMSMIND CLASS BOOKING ENGINE ---
 * Orchestrates group capacity, transactional seating, and automated promotion.
 */

/**
 * Registers a contact for a specific class session.
 * Utilizes a secure database RPC to ensure transactional seat integrity.
 */
export async function registerForClass(classSessionId: string, contactId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();

  // We utilize a stored procedure to handle the seat decrement within a transaction
  // to eliminate race conditions (SERIALIZABLE isolation equivalent in RPC)
  const { data, error } = await supabase.rpc('fn_secure_class_registration', {
    p_workspace_id: workspaceId,
    p_session_id: classSessionId,
    p_contact_id: contactId
  });

  if (error) {
    logger.error({ err: error, workspaceId, classSessionId, contactId }, 'calendar.class_registration.failed');
    return { success: false, error: 'Unable to register for this class. Please try again.' };
  }

  revalidatePath('/apps/calendar');
  return { success: true, data };
}

/**
 * Cancels a registration and triggers the waitlist promotion engine.
 */
export async function cancelRegistration(registrationId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();

  // 1. Fetch session ID before deletion
  const { data: reg } = await supabase
    .from('class_registrations')
    .select('class_session_id')
    .eq("id", registrationId).eq("workspace_id", workspaceId)
    .single();

  if (!reg) return { success: false, error: 'Registration not found' };

  // 2. Perform deletion and trigger promotion in a single flow
  const { error } = await supabase
    .from('class_registrations')
    .delete()
    .eq('id', registrationId)
    .eq('workspace_id', workspaceId);

  if (error) {
    logger.error({ err: error, workspaceId, registrationId }, 'calendar.class_registration.cancel.failed');
    return { success: false, error: 'Unable to cancel registration. Please try again.' };
  }

  // 3. Trigger the promotion engine to offer the seat to the next person
  await promoteWaitlist(reg.class_session_id);

  revalidatePath('/apps/calendar');
  return { success: true };
}

/**
 * PROMOTION ENGINE: Waitlist Advancement
 * Identifies the next person in line and offers them a 24-hour claim window.
 */
async function promoteWaitlist(classSessionId: string) {
  const supabase = await createServerClient();
  
  // Call secure logic to advance the queue
  await supabase.rpc('fn_advance_class_waitlist', {
    p_session_id: classSessionId
  });
}

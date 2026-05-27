'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface ErasureReceipt {
  receiptId: string;
  timestamp: string;
  workspaceId: string;
  originalEmail: string;
  anonymizedEmail: string;
  purgedExecutionsCount: number;
  purgedQueueCount: number;
  suppressionStatus: string;
  anonymizedCRM: boolean;
  legalReference: string;
}

export async function invokeRightToErasure(contactId: string): Promise<{ success: boolean; data?: ErasureReceipt; error?: string }> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace found.' };

  const supabase = await createServerClient();

  try {
    // 1. Fetch contact details before erasure to get the email and verify it belongs to workspace
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchError || !contact) {
      return { success: false, error: 'Contact not found or access denied.' };
    }

    const originalEmail = contact.email;
    const anonymizedEmail = `anonymized_${contact.id}@deleted.leadsmind.io`;

    // 2. Purge from running sequences (cancel executions)
    const { data: cancelledExecutions, error: cancelError } = await supabase
      .from('workflow_executions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('contact_id', contactId)
      .eq('status', 'running')
      .select('id');

    if (cancelError) {
      console.error('[POPIA] Error cancelling workflow executions:', cancelError);
    }

    const purgedExecutionsCount = cancelledExecutions?.length || 0;

    // 3. Clear from enrollment queue
    const { data: deletedQueueItems, error: queueDeleteError } = await supabase
      .from('workflow_enrollment_queue')
      .delete()
      .eq('contact_id', contactId)
      .select('id');

    if (queueDeleteError) {
      console.error('[POPIA] Error deleting queue items:', queueDeleteError);
    }

    const purgedQueueCount = deletedQueueItems?.length || 0;

    // 4. Drop onto immutable global suppression block list
    // Check if already suppressed, if not insert
    const { error: suppressionError } = await supabase
      .from('global_suppression_list')
      .upsert(
        { workspace_id: workspaceId, email: originalEmail, reason: 'right_to_erasure', suppressed_at: new Date().toISOString() },
        { onConflict: 'workspace_id,email' }
      );

    let suppressionStatus = 'Success';
    if (suppressionError) {
      console.error('[POPIA] Error adding to suppression list:', suppressionError);
      suppressionStatus = `Failed: ${suppressionError.message}`;
    }

    // 5. Anonymize contacts table record
    const { error: contactAnonError } = await supabase
      .from('contacts')
      .update({
        first_name: 'ANONYMIZED',
        last_name: 'ANONYMIZED',
        email: anonymizedEmail,
        phone: null,
        company: null,
        is_invalid_email: true,
        tags: [],
        consent_timestamp: null,
        consent_ip: null,
        consent_form_id: null,
        processing_purpose_scope: 'POPIA Right to Erasure Requested'
      })
      .eq('id', contactId);

    if (contactAnonError) {
      console.error('[POPIA] Error anonymizing contact:', contactAnonError);
      return { success: false, error: `Failed to anonymize contact: ${contactAnonError.message}` };
    }

    // 6. Anonymize matching CRM contacts (crm_contacts table) if they exist
    let crmAnonymized = false;
    if (originalEmail) {
      const { data: crmContacts, error: crmFetchError } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', originalEmail);

      if (!crmFetchError && crmContacts && crmContacts.length > 0) {
        const crmIds = crmContacts.map(c => c.id);
        const { error: crmAnonError } = await supabase
          .from('crm_contacts')
          .update({
            first_name: 'ANONYMIZED',
            last_name: 'ANONYMIZED',
            email: anonymizedEmail,
            phone: null,
            is_invalid_email: true,
            consent_timestamp: null,
            consent_ip: null,
            consent_form_id: null,
            processing_purpose_scope: 'POPIA Right to Erasure Requested'
          })
          .in('id', crmIds);

        if (!crmAnonError) {
          crmAnonymized = true;
        } else {
          console.error('[POPIA] Error anonymizing CRM contacts:', crmAnonError);
        }
      }
    }

    // 7. Add an audit log to contact_activities
    await supabase.from('contact_activities').insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      type: 'system',
      description: `POPIA Right to Erasure executed. Personal identifier properties scrubbed, sequences stopped, and added to suppression list.`,
      metadata: { original_email: originalEmail, anonymized_email: anonymizedEmail }
    });

    revalidatePath('/contacts');
    revalidatePath(`/contacts/${contactId}`);

    const receipt: ErasureReceipt = {
      receiptId: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
      workspaceId,
      originalEmail,
      anonymizedEmail,
      purgedExecutionsCount,
      purgedQueueCount,
      suppressionStatus,
      anonymizedCRM: crmAnonymized,
      legalReference: 'POPIA Section 24 (South Africa Protection of Personal Information Act, 2013)'
    };

    return {
      success: true,
      data: receipt
    };
  } catch (err: any) {
    console.error('[POPIA] Unhandled error during right to erasure:', err);
    return { success: false, error: err.message || 'Internal server error during erasure procedure.' };
  }
}

export async function unsubscribeEmail(email: string, workspaceId: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !workspaceId) {
    return { success: false, error: 'Email and Workspace ID are required.' };
  }

  const supabase = await createServerClient();

  try {
    // 1. Add to global suppression list
    const { error: suppressionError } = await supabase
      .from('global_suppression_list')
      .upsert(
        { workspace_id: workspaceId, email: email, reason: 'unsubscribe', suppressed_at: new Date().toISOString() },
        { onConflict: 'workspace_id,email' }
      );

    if (suppressionError) {
      console.error('[Unsubscribe] Suppression list error:', suppressionError);
    }

    // 2. Mark contacts as invalid
    const { error: contactsError } = await supabase
      .from('contacts')
      .update({ is_invalid_email: true })
      .eq('workspace_id', workspaceId)
      .eq('email', email);

    if (contactsError) {
      console.error('[Unsubscribe] Contacts update error:', contactsError);
    }

    const { error: crmContactsError } = await supabase
      .from('crm_contacts')
      .update({ is_invalid_email: true })
      .eq('workspace_id', workspaceId)
      .eq('email', email);

    if (crmContactsError) {
      console.error('[Unsubscribe] CRM Contacts update error:', crmContactsError);
    }

    // 3. Log activity if a contact matches
    const { data: matchedContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .limit(5);

    if (matchedContacts && matchedContacts.length > 0) {
      for (const c of matchedContacts) {
        await supabase.from('contact_activities').insert({
          workspace_id: workspaceId,
          contact_id: c.id,
          type: 'system',
          description: `Unsubscribed from all workspace emails via footer link.`
        });
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Unsubscribe] Unhandled error:', err);
    return { success: false, error: err.message || 'Internal server error processing unsubscribe.' };
  }
}

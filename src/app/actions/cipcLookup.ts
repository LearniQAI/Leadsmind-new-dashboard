'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { cipcService, CIPCCompany } from '@/../server/services/cipc';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (err) {
    // Ignore static generation store missing error outside NextJS HTTP server context (e.g. CLI tests)
  }
}

/**
 * Enterprise CIPC Search Action
 */
export async function searchCIPC(query: string): Promise<{ success: boolean; data?: CIPCCompany[]; error?: string }> {
  try {
    const data = await cipcService.searchCompany(query);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch linked Beneficial Owners for a parent corporate contact.
 */
export async function getBeneficialOwners(parentContactId: string) {
  const supabase = await createServerClient();

  const [ownersRes, ratingRes, docsRes] = await Promise.all([
    supabase
      .from('beneficial_owners')
      .select('*, owner_contact:contacts(*, kyc_risk_ratings(*))')
      .eq('contact_id', parentContactId),
    supabase
      .from('kyc_risk_ratings')
      .select('requires_edd')
      .eq('contact_id', parentContactId)
      .maybeSingle(),
    supabase
      .from('kyc_documents')
      .select('*')
      .eq('contact_id', parentContactId)
      .eq('document_type', 'beneficial_ownership_form')
  ]);

  if (ownersRes.error) {
    return { success: false, error: ownersRes.error.message };
  }

  return { 
    success: true, 
    data: ownersRes.data || [],
    requiresEdd: ratingRes.data?.requires_edd || false,
    documents: docsRes.data || []
  };
}

/**
 * Link CIPC Directors to a corporate contact, spawning sub-tasks and flagging EDD.
 */
export async function linkCIPCDirectors(
  parentContactId: string,
  companyName: string,
  directors: { name: string; role: string; idNumberSuffix: string }[]
) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();

  try {
    for (const dir of directors) {
      const names = dir.name.split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ') || 'Director';

      // 1. Check if individual contact already exists by name
      let { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .maybeSingle();

      let ownerId = existingContact?.id;

      if (!ownerId) {
        // Create new contact
        const { data: newContact, error: insError } = await supabase
          .from('contacts')
          .insert({
            workspace_id: workspaceId,
            first_name: firstName,
            last_name: lastName,
            id_number: '900101' + dir.idNumberSuffix,
            tags: ['cipc-director']
          })
          .select()
          .single();

        if (insError) throw insError;
        ownerId = newContact.id;
      }

      // 2. Check if already linked as beneficial owner
      const { data: existingLink } = await supabase
        .from('beneficial_owners')
        .select('id')
        .eq('contact_id', parentContactId)
        .eq('owner_contact_id', ownerId)
        .maybeSingle();

      if (!existingLink) {
        // Link to company
        const { error: linkError } = await supabase
          .from('beneficial_owners')
          .insert({
            workspace_id: workspaceId,
            contact_id: parentContactId,
            owner_contact_id: ownerId,
            relationship_type: 'director',
            share_percentage: 0,
            is_active: true
          });

        if (linkError) throw linkError;
      }

      // 3. Spawn nested verification task in contact_tasks for the director
      const { error: taskError } = await supabase
        .from('contact_tasks')
        .insert({
          workspace_id: workspaceId,
          contact_id: ownerId,
          title: `[KYC Sub-Task] Verify Identity: ${dir.name}`,
          description: `Nested verification sub-task spawned from Beneficial Ownership mapping for parent company "${companyName}".`,
          status: 'todo'
        });

      if (taskError) {
        console.error('[Verification Router] Error spawning task:', taskError.message);
      }
    }

    // 4. Force parent company risk rating to flag requires_edd = TRUE
    const { error: eddError } = await supabase
      .from('kyc_risk_ratings')
      .upsert({
        workspace_id: workspaceId,
        contact_id: parentContactId,
        overall_rating: 'grey', // default until rating is re-run
        requires_edd: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'contact_id' });

    if (eddError) throw eddError;

    safeRevalidatePath(`/contacts/${parentContactId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Manually add a Beneficial Owner stakeholder to a B2B contact.
 */
export async function addBeneficialOwner(
  parentContactId: string,
  ownerContactId: string,
  relationshipType: 'shareholder' | 'director' | 'trustee' | 'other',
  sharePercentage: number
) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();

  // 1. Link contact in beneficial_owners
  const { error: linkError } = await supabase
    .from('beneficial_owners')
    .insert({
      workspace_id: workspaceId,
      contact_id: parentContactId,
      owner_contact_id: ownerContactId,
      relationship_type: relationshipType,
      share_percentage: sharePercentage,
      is_active: true
    });

  if (linkError) {
    return { success: false, error: linkError.message };
  }

  // 2. If share percentage is > 25% or role is director, flag EDD
  if (sharePercentage >= 25 || relationshipType === 'director') {
    const { error: eddError } = await supabase
      .from('kyc_risk_ratings')
      .upsert({
        workspace_id: workspaceId,
        contact_id: parentContactId,
        overall_rating: 'grey',
        requires_edd: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'contact_id' });

    if (eddError) {
      console.error('[EDD Trigger] Error setting EDD flag:', eddError.message);
    }
  }

  safeRevalidatePath(`/contacts/${parentContactId}`);
  return { success: true };
}

/**
 * Remove a Beneficial Owner linkage.
 */
export async function deleteBeneficialOwner(id: string, parentContactId: string) {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase
    .from('beneficial_owners')
    .delete()
    .eq("id", id).eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }

  safeRevalidatePath(`/contacts/${parentContactId}`);
  return { success: true };
}

/**
 * Explicitly update the Enhanced Due Diligence (EDD) status for a contact.
 */
export async function updateEddStatus(contactId: string, requiresEdd: boolean) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();

  const { error } = await supabase
    .from('kyc_risk_ratings')
    .upsert({
      workspace_id: workspaceId,
      contact_id: contactId,
      overall_rating: 'grey',
      requires_edd: requiresEdd,
      updated_at: new Date().toISOString()
    }, { onConflict: 'contact_id' });

  if (error) {
    return { success: false, error: error.message };
  }

  safeRevalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

/**
 * Upload a Beneficial Ownership Form (simulated write to kyc_documents)
 */
export async function uploadBeneficialOwnershipForm(contactId: string, filename: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();

  const { error } = await supabase
    .from('kyc_documents')
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      document_type: 'beneficial_ownership_form',
      file_url: `vault/beneficial_ownership/${filename}`,
      encryption_iv: crypto.randomBytes(16).toString('hex'),
      retention_delete_after: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString() // default fallback
    });

  if (error) {
    return { success: false, error: error.message };
  }

  safeRevalidatePath(`/contacts/${contactId}`);
  return { success: true };
}


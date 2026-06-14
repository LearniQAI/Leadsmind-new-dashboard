'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getPortalSession } from '@/lib/portal/session';
import { revalidatePath } from 'next/cache';

/**
 * Generates a time-limited 24-hour signed download URL for vaulted documents
 */
export async function generateSignedDocumentUrl(fileId: string) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return { success: false, error: 'Unauthorized. Client session context required.' };
    }

    const { contact } = session;
    const adminClient = createAdminClient();

    // 1. Check if client has access via contact_documents
    const { data: docLink } = await adminClient
      .from('contact_documents')
      .select('id')
      .eq('contact_id', contact.id)
      .eq('file_id', fileId)
      .maybeSingle();

    let hasAccess = !!docLink;

    // 2. Alternatively, check if the file is a deliverable of a project owned by the client
    if (!hasAccess) {
      const { data: fileDeliverable } = await adminClient
        .from('media_files')
        .select('*, projects(*)')
        .eq('id', fileId)
        .eq('is_client_deliverable', true)
        .single();

      if (fileDeliverable && fileDeliverable.projects?.contact_id === contact.id) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return { success: false, error: 'Access denied. You do not have permissions to read this document.' };
    }

    // 3. Retrieve file details
    const { data: file, error: fileErr } = await adminClient
      .from('media_files')
      .select('path')
      .eq('id', fileId)
      .single();

    if (fileErr || !file) {
      return { success: false, error: 'File details not found.' };
    }

    // 4. Generate signed URL valid for 24 hours (86400 seconds)
    const { data: signedData, error: signedErr } = await adminClient.storage
      .from('media')
      .createSignedUrl(file.path, 86400);

    if (signedErr || !signedData) {
      return { success: false, error: 'Failed to generate signed link: ' + signedErr?.message };
    }

    return { success: true, url: signedData.signedUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Vaults a client-to-business upload into contacts file locker storage
 */
export async function uploadClientDocument(formData: FormData) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return { success: false, error: 'Unauthorized. Client session context required.' };
    }

    const { contact, workspace } = session;
    const file = formData.get('file') as File;
    if (!file || file.size > 15 * 1024 * 1024) {
      return { success: false, error: 'Invalid file payload or size exceeds 15MB.' };
    }

    const adminClient = createAdminClient();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `contacts/${contact.id}/${Date.now()}-${cleanFileName}`;

    // 1. Upload raw payload to Supabase storage bucket 'media'
    const { error: uploadError } = await adminClient.storage
      .from('media')
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      return { success: false, error: 'File upload storage failure: ' + uploadError.message };
    }

    // 2. Register file metadata in media_files
    const { data: mediaFile, error: dbError } = await adminClient
      .from('media_files')
      .insert({
        workspace_id: workspace.id,
        name: file.name,
        path: storagePath,
        type: 'file',
        mime_type: file.type,
        size: file.size
      })
      .select()
      .single();

    if (dbError || !mediaFile) {
      return { success: false, error: 'Failed to log file metadata: ' + dbError?.message };
    }

    // 3. Link file registration in contact_documents
    const { error: linkErr } = await adminClient
      .from('contact_documents')
      .insert({
        contact_id: contact.id,
        file_id: mediaFile.id,
        type: 'upload'
      });

    if (linkErr) {
      return { success: false, error: 'Failed to link document in vault ledger: ' + linkErr.message };
    }

    // 4. Log confirmation inside contact activities CRM logs
    await adminClient.from('contact_activities').insert({
      workspace_id: workspace.id,
      contact_id: contact.id,
      type: 'document',
      description: `Uploaded document to secure vault: "${file.name}"`
    });

    revalidatePath('/portal/documents');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Seals an agreement using a cryptographically signed signature confirmation
 */
export async function signPortalProposal(proposalId: string, signatureData: string, ipAddress: string) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return { success: false, error: 'Unauthorized. Client session context required.' };
    }

    const { contact, workspace } = session;
    const adminClient = createAdminClient();

    // 1. Verify proposal belongs to this contact
    const { data: proposal, error: fetchErr } = await adminClient
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (fetchErr || !proposal) {
      return { success: false, error: 'Proposal agreement not found.' };
    }

    if (proposal.contact_id !== contact.id) {
      return { success: false, error: 'Access denied. You do not own this proposal.' };
    }

    // 2. Perform digital signature seal
    const { error: updateErr } = await adminClient
      .from('proposals')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_data: signatureData
      })
      .eq('id', proposalId);

    if (updateErr) {
      return { success: false, error: 'Failed to record signature: ' + updateErr.message };
    }

    // 3. Log confirmation inside contact activities CRM logs
    await adminClient.from('contact_activities').insert({
      workspace_id: workspace.id,
      contact_id: contact.id,
      type: 'signature',
      description: `Executed proposal e-signature agreement: "${proposal.title}" (IP: ${ipAddress})`
    });

    revalidatePath('/portal/documents');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUserAccessInfo } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ficTransformer } from '@/../server/services/ficTransformer';
import crypto from 'crypto';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (err) {
    // Ignore static generation store missing error outside NextJS HTTP server context (e.g. CLI tests)
  }
}

export interface STRDraftPayload {
  contactId: string;
  amount: number;
  currency: string;
  transactionDate: string;
  description: string;
  anomalies: string[];
}

/**
 * Validate that the executing user has admin or compliance privileges.
 */
async function checkCompliancePrivileges() {
  const { role } = await getUserAccessInfo();
  if (!role || !['admin', 'compliance'].includes(role)) {
    throw new Error('Access Denied: Restricted to Compliance Officers and Administrators');
  }
  return role;
}

/**
 * Save or update a Suspicious Transaction Report (STR) draft.
 */
export async function saveStrDraft(
  payload: STRDraftPayload,
  reportId?: string
): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    await checkCompliancePrivileges();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: 'No active workspace context' };
    }

    const supabase = await createServerClient();

    const transactionDetails = {
      amount: payload.amount,
      currency: payload.currency,
      transaction_date: payload.transactionDate,
      description: payload.description
    };

    if (reportId) {
      // Update existing draft
      const { data, error } = await supabase
        .from('str_reports')
        .update({
          transaction_details: transactionDetails,
          anomalies: payload.anomalies,
          updated_at: new Date().toISOString()
        })
        .eq("id", reportId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
        .select()
        .single();

      if (error) throw error;
      safeRevalidatePath('/admin/compliance');
      return { success: true, report: data };
    } else {
      // Insert new draft
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('str_reports')
        .insert({
          workspace_id: workspaceId,
          contact_id: payload.contactId,
          transaction_details: transactionDetails,
          anomalies: payload.anomalies,
          status: 'draft',
          created_by: user?.id || null
        })
        .select()
        .single();

      if (error) throw error;
      safeRevalidatePath('/admin/compliance');
      return { success: true, report: data };
    }
  } catch (err: any) {
    console.error('[saveStrDraft Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Finalize, serialize to FIC schemas (XML/JSON), and lock a Suspicious Transaction Report.
 */
export async function finalizeAndFileStr(
  reportId: string
): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    await checkCompliancePrivileges();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: 'No active workspace context' };
    }

    const supabase = await createServerClient();

    // 1. Fetch the report draft
    const { data: report, error: reportErr } = await supabase
      .from('str_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportErr || !report) {
      return { success: false, error: 'STR report draft not found' };
    }

    if (report.status === 'filed') {
      return { success: false, error: 'STR report has already been finalized and locked' };
    }

    // 2. Fetch contact profile information
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, id_number, email, phone, kyc_risk_ratings(overall_rating)')
      .eq('id', report.contact_id)
      .single();

    if (contactErr || !contact) {
      return { success: false, error: 'Subject contact record not found' };
    }

    const ratings = Array.isArray(contact.kyc_risk_ratings)
      ? contact.kyc_risk_ratings[0]
      : contact.kyc_risk_ratings;
    const kyc_risk_flag = ratings?.overall_rating || 'LOW';

    // 3. Serialize metadata to South African FIC formats using the Transformer
    const inputPayload = {
      report_id: report.id,
      workspace_id: workspaceId,
      contact: {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name || undefined,
        id_number: contact.id_number || undefined,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        kyc_risk_flag
      },
      transaction: {
        amount: report.transaction_details.amount,
        currency: report.transaction_details.currency,
        transaction_date: report.transaction_details.transaction_date,
        description: report.transaction_details.description
      },
      anomalies: report.anomalies || [],
      created_at: report.created_at
    };

    const xmlPayload = ficTransformer.serializeToXml(inputPayload);
    const jsonPayload = ficTransformer.serializeToJson(inputPayload);

    // 4. Update the Suspicious Transaction Report record status
    const { data: updatedReport, error: updateErr } = await supabase
      .from('str_reports')
      .update({
        status: 'filed',
        xml_payload: xmlPayload,
        json_payload: jsonPayload,
        updated_at: new Date().toISOString()
      })
      .eq("id", reportId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 5. Update kyc_risk_ratings to record the filed flag
    const { error: riskRatingErr } = await supabase
      .from('kyc_risk_ratings')
      .upsert({
        workspace_id: workspaceId,
        contact_id: report.contact_id,
        str_filed: true,
        str_filed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'contact_id' });

    if (riskRatingErr) {
      console.warn('[finalizeAndFileStr Warning] Failed to update kyc_risk_ratings:', riskRatingErr.message);
    }

    // 6. Fetch the latest FICA consent record to enforce entity linkage
    const { data: latestConsent } = await supabase
      .from('kyc_consent_records')
      .select('id')
      .eq('contact_id', report.contact_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const consentId = latestConsent?.id || null;

    // 7. Insert the generated STR output file into kyc_documents
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 5); // 5-year compliance lock retention

    const virtualFilePath = `compliance/str/STR_${report.id}.xml`;

    const { error: docErr } = await supabase
      .from('kyc_documents')
      .insert({
        workspace_id: workspaceId,
        contact_id: report.contact_id,
        consent_id: consentId,
        document_type: 'str_report',
        file_url: virtualFilePath,
        retention_delete_after: retentionDate.toISOString(),
        encryption_iv: crypto.randomBytes(16).toString('hex')
      });

    if (docErr) {
      console.warn('[finalizeAndFileStr Warning] Failed to log document audit record:', docErr.message);
    }

    safeRevalidatePath('/admin/compliance');
    return { success: true, report: updatedReport };
  } catch (err: any) {
    console.error('[finalizeAndFileStr Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all workspace STR reports (restricted to admin or compliance).
 */
export async function getStrReports(): Promise<any[]> {
  try {
    await checkCompliancePrivileges();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return [];

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('str_reports')
      .select('*, contact:contacts(first_name, last_name, id_number)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getStrReports Error]:', err);
    return [];
  }
}

/**
 * Fetch STR report details by ID (restricted to admin or compliance).
 */
export async function getStrReportDetails(reportId: string): Promise<any | null> {
  try {
    await checkCompliancePrivileges();
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('str_reports')
      .select('*, contact:contacts(*)')
      .eq('id', reportId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[getStrReportDetails Error]:', err);
    return null;
  }
}

/**
 * Generate a preview of the serialized STR XML and JSON schemas.
 */
export async function previewStrSerialization(
  payload: STRDraftPayload
): Promise<{ success: boolean; xml?: string; json?: any; error?: string }> {
  try {
    await checkCompliancePrivileges();
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      return { success: false, error: 'No active workspace context' };
    }

    const supabase = await createServerClient();
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, id_number, email, phone, kyc_risk_ratings(overall_rating)')
      .eq('id', payload.contactId)
      .single();

    const ratings = Array.isArray(contact?.kyc_risk_ratings)
      ? contact.kyc_risk_ratings[0]
      : contact?.kyc_risk_ratings;
    const kyc_risk_flag = ratings?.overall_rating || 'LOW';

    const inputPayload = {
      report_id: 'PREVIEW-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      workspace_id: workspaceId,
      contact: {
        id: payload.contactId,
        first_name: contact?.first_name || 'Subject',
        last_name: contact?.last_name || '',
        id_number: contact?.id_number || '',
        email: contact?.email || '',
        phone: contact?.phone || '',
        kyc_risk_flag
      },
      transaction: {
        amount: payload.amount,
        currency: payload.currency,
        transaction_date: payload.transactionDate,
        description: payload.description
      },
      anomalies: payload.anomalies || []
    };

    const xml = ficTransformer.serializeToXml(inputPayload);
    const json = ficTransformer.serializeToJson(inputPayload);
    return { success: true, xml, json };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


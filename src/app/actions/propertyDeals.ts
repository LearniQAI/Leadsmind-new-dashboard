'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/lib/auth';
import crypto from 'crypto';
import { logger } from '@/shared/logger';

/**
 * Fetch a property deal's details, contacts (buyer & seller), and status logs.
 */
export async function getPropertyDeal(id: string) {
  const supabase = await createServerClient();

  const { data: deal, error: dealError } = await supabase
    .from('opportunities')
    .select('*, stage:pipeline_stages(*)')
    .eq('id', id)
    .single();

  if (dealError || !deal) {
    if (dealError) logger.error({ err: dealError, dealId: id }, 'property_deals.deal.fetch.failed');
    return { success: false, error: 'Opportunity not found' };
  }

  const buyerId = deal.buyer_id || deal.contact_id;
  const sellerId = deal.seller_id;

  let buyer = null;
  let seller = null;

  if (buyerId) {
    const { data: bData } = await supabase
      .from('contacts')
      .select('*, kyc_risk_ratings(*)')
      .eq('id', buyerId)
      .single();
    buyer = bData;
  }

  if (sellerId) {
    const { data: sData } = await supabase
      .from('contacts')
      .select('*, kyc_risk_ratings(*)')
      .eq('id', sellerId)
      .single();
    seller = sData;
  }

  // Fetch share logs and funds declarations
  const { data: shares } = await supabase
    .from('conveyancing_shares')
    .select('*')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });

  const { data: declarations } = await supabase
    .from('source_of_funds_declarations')
    .select('*')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });

  return {
    success: true,
    deal,
    buyer,
    seller,
    shares: shares || [],
    declarations: declarations || []
  };
}

/**
 * Link buyer and seller contacts to a property opportunity.
 */
export async function updatePropertyDealContacts(
  id: string,
  buyerId: string | null,
  sellerId: string | null
) {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { error } = await supabase
    .from('opportunities')
    .update({
      buyer_id: buyerId,
      seller_id: sellerId,
      contact_id: buyerId, // For backwards compatibility
      updated_at: new Date().toISOString()
    })
    .eq("id", id).eq("workspace_id", workspaceId);

  if (error) {
    logger.error({ err: error, workspaceId, dealId: id }, 'property_deals.contacts.update.failed');
    return { success: false, error: 'Failed to update deal contacts.' };
  }

  revalidatePath(`/deals/property/${id}`);
  return { success: true };
}

/**
 * Generate a funds declaration link and log a WhatsApp API dispatch message.
 */
export async function dispatchFundsDeclaration(
  dealId: string,
  buyerId: string,
  phone: string
) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const token = crypto.randomBytes(16).toString('hex');
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('source_of_funds_declarations')
    .insert({
      workspace_id: workspaceId,
      opportunity_id: dealId,
      buyer_id: buyerId,
      token,
      status: 'pending',
      whatsapp_sent_at: new Date().toISOString()
    });

  if (error) {
    logger.error({ err: error, workspaceId, dealId }, 'property_deals.funds_declaration.dispatch.failed');
    return { success: false, error: 'Failed to dispatch funds declaration.' };
  }

  // Simulated WhatsApp API trigger
  logger.info({ dealId, buyerId }, 'property_deals.funds_declaration.whatsapp_simulation_sent');

  revalidatePath(`/deals/property/${dealId}`);
  return { success: true, token };
}

/**
 * Create a secure conveyancing attorney sharing record.
 */
export async function createConveyancingShare(
  dealId: string,
  attorneyName: string,
  attorneyEmail: string
) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  const supabase = await createServerClient();

  const { error } = await supabase
    .from('conveyancing_shares')
    .insert({
      workspace_id: workspaceId,
      opportunity_id: dealId,
      attorney_name: attorneyName,
      attorney_email: attorneyEmail,
      token,
      expires_at: expiresAt.toISOString()
    });

  if (error) {
    logger.error({ err: error, workspaceId, dealId }, 'property_deals.conveyancing_share.create.failed');
    return { success: false, error: 'Failed to create conveyancing share.' };
  }

  revalidatePath(`/deals/property/${dealId}`);
  return { success: true, token };
}

/**
 * Resolve a secure conveyancing attorney token. (Public access)
 */
export async function getConveyancingShareByToken(token: string) {
  const supabase = createAdminClient();

  const { data: share, error } = await supabase
    .from('conveyancing_shares')
    .select('*, opportunity:opportunities(*)')
    .eq('token', token)
    .single();

  if (error || !share) {
    return { success: false, error: 'Invalid secure token' };
  }

  if (new Date(share.expires_at) < new Date()) {
    return { success: false, error: 'This conveyancing attorney share link has expired' };
  }

  // Retrieve opportunity details
  const { data: deal } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', share.opportunity_id)
    .single();

  if (!deal) {
    return { success: false, error: 'Associated property deal not found' };
  }

  const buyerId = deal.buyer_id || deal.contact_id;
  const sellerId = deal.seller_id;

  let buyer = null;
  let seller = null;
  let documents: any[] = [];

  if (buyerId) {
    const { data: bData } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', buyerId)
      .single();
    buyer = bData;
  }

  if (sellerId) {
    const { data: sData } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', sellerId)
      .single();
    seller = sData;
  }

  // Fetch KYC documents uploaded for either buyer or seller
  const contactIds = [buyerId, sellerId].filter(Boolean) as string[];
  if (contactIds.length > 0) {
    const { data: docs } = await supabase
      .from('kyc_documents')
      .select('*')
      .in('contact_id', contactIds);
    documents = docs || [];
  }

  return {
    success: true,
    share,
    deal,
    buyer,
    seller,
    documents
  };
}

/**
 * Resolve a funds declaration token. (Public access)
 */
export async function getFundsDeclarationByToken(token: string) {
  const supabase = createAdminClient();

  const { data: declaration, error } = await supabase
    .from('source_of_funds_declarations')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !declaration) {
    return { success: false, error: 'Funds declaration link not found or invalid' };
  }

  // Retrieve buyer contact details
  const { data: buyer } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', declaration.buyer_id)
    .single();

  // Retrieve opportunity
  const { data: deal } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', declaration.opportunity_id)
    .single();

  return {
    success: true,
    declaration,
    buyer,
    deal
  };
}

/**
 * Submit digital source of funds declaration. (Public access)
 */
export async function submitFundsDeclaration(
  token: string,
  data: {
    fundsSource: 'savings' | 'inheritance' | 'bank_loan' | 'sale_of_property' | 'other';
    customDescription?: string;
    amount: number;
  }
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('source_of_funds_declarations')
    .update({
      funds_source: data.fundsSource,
      custom_description: data.customDescription || null,
      amount: data.amount,
      status: 'submitted',
      declared_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('token', token);

  if (error) {
    logger.error({ err: error }, 'property_deals.funds_declaration.submit.failed');
    return { success: false, error: 'Failed to submit funds declaration.' };
  }

  return { success: true };
}

/**
 * Retrieve list of all contacts in the active workspace.
 */
export async function getWorkspaceContacts() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return [];

  const supabase = await createServerClient();
  const { data } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone')
    .eq('workspace_id', workspaceId)
    .order('first_name', { ascending: true });

  return data || [];
}

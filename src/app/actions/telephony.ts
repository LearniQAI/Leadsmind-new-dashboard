'use server';

// Telephony Phase 2 — real number search, purchase, import, and release against a workspace's
// own connected Twilio account (Phase 1: src/app/actions/settings.ts saveTwilioCredentials).
//
// Every action here goes through getWorkspaceTwilioContext(), which is the ONLY place that
// resolves a workspace's Twilio client — it reuses resolveWorkspaceTwilioCredentials()
// (already live in prod via /api/cron/reminders, Task 67/68) rather than re-deriving
// credentials a second way.

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { resolveWorkspaceTwilioCredentials, type WorkspaceTwilioRow } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';
import { humanizeTwilioError } from '@/lib/twilio/humanizeTwilioError';
import { logger } from '@/shared/logger';

export interface WorkspacePhoneNumber {
  id: string;
  twilio_number_sid: string;
  phone_number: string;
  friendly_name: string | null;
  capabilities: { voice?: boolean; sms?: boolean; mms?: boolean };
  source: 'purchased' | 'imported';
  status: 'active' | 'released';
  created_at: string;
}

export interface AvailableNumberResult {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
  capabilities: { voice?: boolean; sms?: boolean; mms?: boolean };
  monthlyPrice: string | null;
  priceUnit: string | null;
}

export interface ImportableNumber {
  twilioNumberSid: string;
  phoneNumber: string;
  friendlyName: string | null;
  capabilities: { voice?: boolean; sms?: boolean; mms?: boolean };
}

export type TwilioContext = {
  client: any;
  accountSid: string;
  workspaceId: string;
  userId: string;
  adminClient: ReturnType<typeof createAdminClient>;
};

// Resolves the caller's workspace + Twilio client in one place. Every action below — and every
// Phase 3 IVR action in src/app/actions/ivr.ts — calls this first; there is no second
// credential-fetch path anywhere in the telephony feature.
export async function getWorkspaceTwilioContext(): Promise<{ data?: TwilioContext; error?: string }> {
  const { workspaceId, userId } = await requireWorkspaceRole(['admin', 'owner']);
  const adminClient = createAdminClient();

  const { data: workspace, error } = await adminClient
    .from('workspaces')
    .select('twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted')
    .eq('id', workspaceId)
    .single<WorkspaceTwilioRow>();

  if (error || !workspace) {
    return { error: 'Workspace not found.' };
  }

  const { accountSid, authToken } = resolveWorkspaceTwilioCredentials(workspace);
  if (!accountSid || !authToken) {
    return { error: 'Connect your Twilio account in Settings → Phone & IVR first.' };
  }

  const twilio = require('twilio');
  const client = twilio(accountSid, authToken);

  return { data: { client, accountSid, workspaceId, userId, adminClient } };
}

function normalizeCapabilities(caps: any): { voice?: boolean; sms?: boolean; mms?: boolean } {
  if (!caps) return {};
  return { voice: !!caps.voice, sms: !!caps.sms, mms: !!caps.mms };
}

// SEARCH — real AvailablePhoneNumbers lookup, with best-effort pricing (non-fatal if Twilio's
// Pricing API doesn't cover the country/number type).
export async function searchAvailableNumbers(params: {
  country?: string;
  areaCode?: string;
  numberType?: 'local' | 'mobile';
}): Promise<{ data?: AvailableNumberResult[]; error?: string }> {
  const ctx = await getWorkspaceTwilioContext();
  if (ctx.error || !ctx.data) return { error: ctx.error };
  const { client } = ctx.data;

  const country = (params.country || 'ZA').trim().toUpperCase();
  const numberType = params.numberType || 'local';
  const areaCode = params.areaCode?.trim() || undefined;

  let results: any[];
  try {
    const resource = numberType === 'mobile'
      ? client.availablePhoneNumbers(country).mobile
      : client.availablePhoneNumbers(country).local;
    results = await resource.list({ areaCode, limit: 20 });
  } catch (err: any) {
    logger.warn({ err, country, numberType }, 'telephony.search.failed');
    return { error: humanizeTwilioError(err) };
  }

  let priceEntry: any = null;
  let priceUnit: string | null = null;
  try {
    const pricing = await client.pricing.v1.phoneNumbers.countries(country).fetch();
    priceUnit = pricing.priceUnit ?? null;
    priceEntry = pricing.phoneNumberPrices?.find((p: any) => p.numberType === numberType)
      ?? pricing.phoneNumberPrices?.[0]
      ?? null;
  } catch (err) {
    // Pricing coverage varies by country/subaccount type — never block search results on it.
    logger.info({ err, country }, 'telephony.search.pricing_unavailable');
  }

  return {
    data: results.map((n) => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      locality: n.locality ?? null,
      region: n.region ?? null,
      capabilities: normalizeCapabilities(n.capabilities),
      monthlyPrice: priceEntry?.currentPrice ?? null,
      priceUnit,
    })),
  };
}

// PURCHASE — a real, billed Twilio transaction. Confirmation is enforced client-side (the UI
// must show a real-charge warning before calling this), not re-litigated here.
//
// If the Twilio purchase succeeds but the local DB insert fails, the number is now a REAL,
// billed number sitting on the workspace's Twilio account with no LeadsMind record of it. We
// deliberately do not attempt to auto-release it (an unrequested second live Twilio mutation
// is its own risk) — instead the error tells the admin exactly what happened and points them at
// "Import existing numbers", which will list this exact number for recovery without re-buying it.
export async function purchaseWorkspacePhoneNumber(phoneNumber: string): Promise<{ data?: WorkspacePhoneNumber; error?: string; purchasedButUnsaved?: boolean }> {
  const trimmed = phoneNumber?.trim();
  if (!trimmed || !/^\+[1-9]\d{1,14}$/.test(trimmed)) {
    return { error: 'Invalid phone number format.' };
  }

  const ctx = await getWorkspaceTwilioContext();
  if (ctx.error || !ctx.data) return { error: ctx.error };
  const { client, workspaceId, userId, adminClient } = ctx.data;

  let purchased: any;
  try {
    purchased = await client.incomingPhoneNumbers.create({ phoneNumber: trimmed });
  } catch (err: any) {
    logger.error({ err, workspaceId, phoneNumber: trimmed }, 'telephony.purchase.twilio_failed');
    return { error: humanizeTwilioError(err) };
  }

  try {
    const { data, error } = await adminClient
      .from('workspace_phone_numbers')
      .insert({
        workspace_id: workspaceId,
        twilio_number_sid: purchased.sid,
        phone_number: purchased.phoneNumber,
        friendly_name: purchased.friendlyName ?? null,
        capabilities: normalizeCapabilities(purchased.capabilities),
        source: 'purchased',
        created_by: userId,
      })
      .select('id, twilio_number_sid, phone_number, friendly_name, capabilities, source, status, created_at')
      .single();

    if (error) throw error;

    logger.info({ workspaceId, sid: purchased.sid }, 'telephony.purchase.saved');
    revalidatePath('/settings');
    return { data: data as WorkspacePhoneNumber };
  } catch (dbErr) {
    logger.error(
      { err: dbErr, workspaceId, twilioSid: purchased.sid, phoneNumber: purchased.phoneNumber },
      'telephony.purchase.save_failed_number_live_on_twilio'
    );
    return {
      purchasedButUnsaved: true,
      error: `Your Twilio account WAS charged for ${purchased.phoneNumber} (SID ${purchased.sid}), but saving it into LeadsMind failed. Go to "Import existing numbers" below to attach it — do not purchase it again.`,
    };
  }
}

// IMPORT (list) — numbers already on the workspace's Twilio account that aren't tracked here
// yet. Also the recovery path for a purchase whose DB save failed above.
export async function listImportableTwilioNumbers(): Promise<{ data?: ImportableNumber[]; error?: string }> {
  const ctx = await getWorkspaceTwilioContext();
  if (ctx.error || !ctx.data) return { error: ctx.error };
  const { client, workspaceId, adminClient } = ctx.data;

  let owned: any[];
  try {
    owned = await client.incomingPhoneNumbers.list({ limit: 200 });
  } catch (err: any) {
    logger.warn({ err, workspaceId }, 'telephony.import.list_failed');
    return { error: humanizeTwilioError(err) };
  }

  const { data: existingRows, error } = await adminClient
    .from('workspace_phone_numbers')
    .select('twilio_number_sid')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (error) return { error: 'Could not check existing numbers.' };

  const existingSids = new Set((existingRows || []).map((r) => r.twilio_number_sid));

  return {
    data: owned
      .filter((n) => !existingSids.has(n.sid))
      .map((n) => ({
        twilioNumberSid: n.sid,
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName ?? null,
        capabilities: normalizeCapabilities(n.capabilities),
      })),
  };
}

// IMPORT (attach) — no Twilio purchase happens here; the number already exists on the account.
export async function importWorkspacePhoneNumber(twilioNumberSid: string): Promise<{ data?: WorkspacePhoneNumber; error?: string }> {
  if (!twilioNumberSid?.trim()) return { error: 'Missing number SID.' };

  const ctx = await getWorkspaceTwilioContext();
  if (ctx.error || !ctx.data) return { error: ctx.error };
  const { client, workspaceId, userId, adminClient } = ctx.data;

  let number: any;
  try {
    // Re-fetch (not trust the client-supplied SID blindly) to confirm it's really owned by
    // this Twilio account and get fresh capabilities before writing the row.
    number = await client.incomingPhoneNumbers(twilioNumberSid.trim()).fetch();
  } catch (err: any) {
    logger.warn({ err, workspaceId, twilioNumberSid }, 'telephony.import.fetch_failed');
    return { error: humanizeTwilioError(err) };
  }

  const { data, error } = await adminClient
    .from('workspace_phone_numbers')
    .upsert(
      {
        workspace_id: workspaceId,
        twilio_number_sid: number.sid,
        phone_number: number.phoneNumber,
        friendly_name: number.friendlyName ?? null,
        capabilities: normalizeCapabilities(number.capabilities),
        source: 'imported',
        status: 'active',
        released_at: null,
        created_by: userId,
      },
      { onConflict: 'workspace_id,twilio_number_sid' }
    )
    .select('id, twilio_number_sid, phone_number, friendly_name, capabilities, source, status, created_at')
    .single();

  if (error) {
    logger.error({ err: error, workspaceId, twilioNumberSid }, 'telephony.import.save_failed');
    return { error: 'Failed to save the imported number. Please try again.' };
  }

  revalidatePath('/settings');
  return { data: data as WorkspacePhoneNumber };
}

// LIST — the workspace's own tracked numbers, no Twilio call needed.
export async function listWorkspacePhoneNumbers(): Promise<{ data?: WorkspacePhoneNumber[]; error?: string }> {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('workspace_phone_numbers')
    .select('id, twilio_number_sid, phone_number, friendly_name, capabilities, source, status, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) return { error: 'Failed to load phone numbers.' };
  return { data: data as WorkspacePhoneNumber[] };
}

// RELEASE — a real, billing-stopping Twilio mutation. Releases on Twilio first; only marks the
// local row released once Twilio confirms (a 404 means it's already gone on Twilio's side,
// which we also treat as released so a stuck local row can't linger forever).
export async function releaseWorkspacePhoneNumber(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getWorkspaceTwilioContext();
  if (ctx.error || !ctx.data) return { error: ctx.error };
  const { client, workspaceId, adminClient } = ctx.data;

  const { data: row, error: fetchError } = await adminClient
    .from('workspace_phone_numbers')
    .select('id, twilio_number_sid, status')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (fetchError || !row) return { error: 'Number not found.' };
  if (row.status === 'released') return { success: true };

  try {
    await client.incomingPhoneNumbers(row.twilio_number_sid).remove();
  } catch (err: any) {
    if (err?.status !== 404 && err?.code !== 20404) {
      logger.error({ err, workspaceId, twilioNumberSid: row.twilio_number_sid }, 'telephony.release.twilio_failed');
      return { error: humanizeTwilioError(err) };
    }
    // Already gone on Twilio's side — fall through and reconcile the local row.
  }

  const { error: updateError } = await adminClient
    .from('workspace_phone_numbers')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (updateError) {
    logger.error({ err: updateError, workspaceId, id }, 'telephony.release.local_update_failed');
    return { error: 'Number was released on Twilio, but updating LeadsMind failed. Refresh the page — it should disappear from your list.' };
  }

  revalidatePath('/settings');
  return { success: true };
}

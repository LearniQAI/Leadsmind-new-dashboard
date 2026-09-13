'use server';

// Telephony Phase 3 — real IVR menu builder + menu-to-number assignment + call log reads.
//
// Reuses getWorkspaceTwilioContext() from telephony.ts (Phase 2) for the ONE place that needs a
// live Twilio call here: assignMenuToNumber(), which points the real Twilio number's Voice URL
// at the webhook in src/app/api/webhooks/twilio/voice. Everything else here is plain
// workspace-scoped CRUD guarded by RLS + requireWorkspaceRole.

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { getWorkspaceTwilioContext } from '@/app/actions/telephony';
import { humanizeTwilioError } from '@/lib/twilio/humanizeTwilioError';
import { logger } from '@/shared/logger';

const E164 = /^\+[1-9]\d{1,14}$/;

export interface IvrMenuOption {
  id: string;
  keypress: string;
  label: string | null;
  destination_type: 'submenu' | 'forward' | 'voicemail' | 'ring_group';
  destination_value: any;
}

export interface IvrMenu {
  id: string;
  name: string;
  greeting_text: string;
  retry_limit: number;
  fallback_destination_type: 'hangup' | 'voicemail' | 'forward';
  fallback_destination_value: any;
  record_calls: boolean;
  is_active: boolean;
  created_at: string;
  options?: IvrMenuOption[];
  assignedNumbers?: string[];
}

export interface CallLog {
  id: string;
  twilio_call_sid: string;
  from_number: string;
  to_number: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  call_status: string;
  menu_path: Array<{ menuId: string; menuName: string; keypress: string }>;
  outcome: string | null;
  recording_url: string | null;
  voicemail_url: string | null;
  voicemail_duration_seconds: number | null;
}

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error('[FATAL] NEXT_PUBLIC_APP_URL env var is not configured');
  return url.replace(/\/$/, '');
}

// LIST — menus plus which numbers (if any) each is currently assigned to, so the builder UI can
// show assignment state without a second round trip per menu.
export async function listIvrMenus(): Promise<{ data?: IvrMenu[]; error?: string }> {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const adminClient = createAdminClient();

  const { data: menus, error } = await adminClient
    .from('ivr_menus')
    .select('id, name, greeting_text, retry_limit, fallback_destination_type, fallback_destination_value, record_calls, is_active, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) return { error: 'Failed to load IVR menus.' };

  const { data: numberRows } = await adminClient
    .from('workspace_phone_numbers')
    .select('phone_number, active_ivr_menu_id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .not('active_ivr_menu_id', 'is', null);

  const assignmentsByMenu = new Map<string, string[]>();
  (numberRows || []).forEach((r) => {
    if (!r.active_ivr_menu_id) return;
    const list = assignmentsByMenu.get(r.active_ivr_menu_id) || [];
    list.push(r.phone_number);
    assignmentsByMenu.set(r.active_ivr_menu_id, list);
  });

  return {
    data: (menus || []).map((m) => ({ ...m, assignedNumbers: assignmentsByMenu.get(m.id) || [] })),
  };
}

// GET ONE — menu + its options, for the builder screen.
export async function getIvrMenu(menuId: string): Promise<{ data?: IvrMenu; error?: string }> {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const adminClient = createAdminClient();

  const { data: menu, error } = await adminClient
    .from('ivr_menus')
    .select('id, name, greeting_text, retry_limit, fallback_destination_type, fallback_destination_value, record_calls, is_active, created_at')
    .eq('id', menuId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !menu) return { error: 'Menu not found.' };

  const { data: options } = await adminClient
    .from('ivr_menu_options')
    .select('id, keypress, label, destination_type, destination_value')
    .eq('menu_id', menuId)
    .order('keypress', { ascending: true });

  return { data: { ...menu, options: options || [] } };
}

export async function createIvrMenu(input: {
  name: string;
  greetingText: string;
  retryLimit?: number;
  fallbackDestinationType?: 'hangup' | 'voicemail' | 'forward';
  fallbackDestinationValue?: any;
  recordCalls?: boolean;
}): Promise<{ data?: IvrMenu; error?: string }> {
  const { workspaceId, userId } = await requireWorkspaceRole(['admin', 'owner']);

  const name = input.name?.trim();
  const greetingText = input.greetingText?.trim();
  if (!name) return { error: 'Menu name is required.' };
  if (!greetingText) return { error: 'A greeting message is required.' };

  if (input.fallbackDestinationType === 'forward') {
    const number = input.fallbackDestinationValue?.number?.trim();
    if (!number || !E164.test(number)) return { error: 'Fallback forward number must be a valid E.164 number.' };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('ivr_menus')
    .insert({
      workspace_id: workspaceId,
      name,
      greeting_text: greetingText,
      retry_limit: input.retryLimit ?? 3,
      fallback_destination_type: input.fallbackDestinationType ?? 'hangup',
      fallback_destination_value: input.fallbackDestinationValue ?? {},
      record_calls: !!input.recordCalls,
      created_by: userId,
    })
    .select('id, name, greeting_text, retry_limit, fallback_destination_type, fallback_destination_value, record_calls, is_active, created_at')
    .single();

  if (error) {
    logger.error({ err: error, workspaceId }, 'ivr.create_menu.failed');
    return { error: 'Failed to create menu.' };
  }

  revalidatePath('/settings');
  return { data: { ...data, options: [] } };
}

export async function updateIvrMenu(menuId: string, input: {
  name?: string;
  greetingText?: string;
  retryLimit?: number;
  fallbackDestinationType?: 'hangup' | 'voicemail' | 'forward';
  fallbackDestinationValue?: any;
  recordCalls?: boolean;
}): Promise<{ success?: boolean; error?: string }> {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const adminClient = createAdminClient();

  const updates: Record<string, any> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) return { error: 'Menu name cannot be empty.' };
    updates.name = input.name.trim();
  }
  if (input.greetingText !== undefined) {
    if (!input.greetingText.trim()) return { error: 'Greeting message cannot be empty.' };
    updates.greeting_text = input.greetingText.trim();
  }
  if (input.retryLimit !== undefined) updates.retry_limit = input.retryLimit;
  if (input.fallbackDestinationType !== undefined) {
    if (input.fallbackDestinationType === 'forward') {
      const number = input.fallbackDestinationValue?.number?.trim();
      if (!number || !E164.test(number)) return { error: 'Fallback forward number must be a valid E.164 number.' };
    }
    updates.fallback_destination_type = input.fallbackDestinationType;
    updates.fallback_destination_value = input.fallbackDestinationValue ?? {};
  }
  if (input.recordCalls !== undefined) updates.record_calls = input.recordCalls;

  const { error } = await adminClient
    .from('ivr_menus')
    .update(updates)
    .eq('id', menuId)
    .eq('workspace_id', workspaceId);

  if (error) return { error: 'Failed to update menu.' };
  revalidatePath('/settings');
  return { success: true };
}

export async function deleteIvrMenu(menuId: string): Promise<{ success?: boolean; error?: string }> {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const adminClient = createAdminClient();

  const { data: assignedNumber } = await adminClient
    .from('workspace_phone_numbers')
    .select('phone_number')
    .eq('workspace_id', workspaceId)
    .eq('active_ivr_menu_id', menuId)
    .maybeSingle();

  if (assignedNumber) {
    return { error: `This menu is assigned to ${assignedNumber.phone_number}. Unassign it first.` };
  }

  // A menu referenced as another menu's submenu target would otherwise leave a dangling
  // {"menuId": "..."} destination_value that the live call router can't resolve.
  const { data: referencingOptions } = await adminClient
    .from('ivr_menu_options')
    .select('id, menu_id, ivr_menus!inner(workspace_id, name)')
    .eq('destination_type', 'submenu')
    .eq('ivr_menus.workspace_id', workspaceId)
    .contains('destination_value', { menuId });

  if (referencingOptions && referencingOptions.length > 0) {
    return { error: 'Another menu routes into this one as a submenu. Remove that option first.' };
  }

  const { error } = await adminClient
    .from('ivr_menus')
    .delete()
    .eq('id', menuId)
    .eq('workspace_id', workspaceId);

  if (error) return { error: 'Failed to delete menu.' };
  revalidatePath('/settings');
  return { success: true };
}

function validateOptionDestination(
  destinationType: string,
  destinationValue: any
): { error?: string } {
  if (destinationType === 'forward') {
    if (!E164.test(destinationValue?.number?.trim() || '')) {
      return { error: 'Forward destination must be a valid E.164 phone number.' };
    }
  } else if (destinationType === 'ring_group') {
    const numbers: string[] = destinationValue?.numbers || [];
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return { error: 'A ring group needs at least one phone number.' };
    }
    if (numbers.some((n) => !E164.test(n?.trim() || ''))) {
      return { error: 'Every ring group number must be a valid E.164 phone number.' };
    }
    if (!['simultaneous', 'sequential'].includes(destinationValue?.strategy)) {
      return { error: 'Ring group strategy must be "simultaneous" or "sequential".' };
    }
  } else if (destinationType === 'submenu') {
    if (!destinationValue?.menuId) {
      return { error: 'A submenu option must reference a menu.' };
    }
  } else if (destinationType !== 'voicemail') {
    return { error: 'Unknown destination type.' };
  }
  return {};
}

export async function upsertMenuOption(input: {
  id?: string;
  menuId: string;
  keypress: string;
  label?: string;
  destinationType: 'submenu' | 'forward' | 'voicemail' | 'ring_group';
  destinationValue: any;
}): Promise<{ data?: IvrMenuOption; error?: string }> {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const adminClient = createAdminClient();

  if (!/^[0-9]$/.test(input.keypress)) return { error: 'Keypress must be a single digit 0-9.' };

  const { data: menu } = await adminClient
    .from('ivr_menus')
    .select('id')
    .eq('id', input.menuId)
    .eq('workspace_id', workspaceId)
    .single();
  if (!menu) return { error: 'Menu not found.' };

  if (input.destinationType === 'submenu' && input.destinationValue?.menuId === input.menuId) {
    return { error: 'A menu option cannot route to its own menu.' };
  }

  if (input.destinationType === 'submenu') {
    const { data: submenu } = await adminClient
      .from('ivr_menus')
      .select('id')
      .eq('id', input.destinationValue?.menuId)
      .eq('workspace_id', workspaceId)
      .single();
    if (!submenu) return { error: 'The selected submenu was not found in this workspace.' };
  }

  const destinationValue = input.destinationType === 'voicemail' ? {} : input.destinationValue;
  const validation = validateOptionDestination(input.destinationType, destinationValue);
  if (validation.error) return { error: validation.error };

  const row = {
    menu_id: input.menuId,
    keypress: input.keypress,
    label: input.label?.trim() || null,
    destination_type: input.destinationType,
    destination_value: destinationValue,
  };

  const query = input.id
    ? adminClient.from('ivr_menu_options').update(row).eq('id', input.id).eq('menu_id', input.menuId)
    : adminClient.from('ivr_menu_options').upsert(row, { onConflict: 'menu_id,keypress' });

  const { data, error } = await query
    .select('id, keypress, label, destination_type, destination_value')
    .single();

  if (error) {
    logger.error({ err: error, menuId: input.menuId }, 'ivr.upsert_option.failed');
    return { error: 'Failed to save menu option.' };
  }

  revalidatePath('/settings');
  return { data: data as IvrMenuOption };
}

export async function deleteMenuOption(optionId: string, menuId: string): Promise<{ success?: boolean; error?: string }> {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const adminClient = createAdminClient();

  const { data: menu } = await adminClient.from('ivr_menus').select('id').eq('id', menuId).eq('workspace_id', workspaceId).single();
  if (!menu) return { error: 'Menu not found.' };

  const { error } = await adminClient.from('ivr_menu_options').delete().eq('id', optionId).eq('menu_id', menuId);
  if (error) return { error: 'Failed to delete option.' };

  revalidatePath('/settings');
  return { success: true };
}

// ASSIGN — the one action here that touches live Twilio. Points the number's real Voice URL +
// status callback at our webhook (or clears them on unassign) BEFORE flipping the local
// active_ivr_menu_id, so we never record an assignment that Twilio doesn't actually know about.
export async function assignMenuToNumber(phoneNumberId: string, menuId: string | null): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getWorkspaceTwilioContext();
  if (ctx.error || !ctx.data) return { error: ctx.error };
  const { client, workspaceId, adminClient } = ctx.data;

  const { data: numberRow, error: numberErr } = await adminClient
    .from('workspace_phone_numbers')
    .select('id, twilio_number_sid, phone_number')
    .eq('id', phoneNumberId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .single();
  if (numberErr || !numberRow) return { error: 'Phone number not found.' };

  if (menuId) {
    const { data: menu } = await adminClient
      .from('ivr_menus')
      .select('id')
      .eq('id', menuId)
      .eq('workspace_id', workspaceId)
      .single();
    if (!menu) return { error: 'Menu not found.' };

    const { count } = await adminClient
      .from('ivr_menu_options')
      .select('id', { count: 'exact', head: true })
      .eq('menu_id', menuId);
    if (!count || count === 0) {
      return { error: 'This menu has no options configured yet. Add at least one option before assigning it to a number.' };
    }
  }

  const base = appUrl();
  try {
    if (menuId) {
      await client.incomingPhoneNumbers(numberRow.twilio_number_sid).update({
        voiceUrl: `${base}/api/webhooks/twilio/voice`,
        voiceMethod: 'POST',
        statusCallback: `${base}/api/webhooks/twilio/voice/status`,
        statusCallbackMethod: 'POST',
      });
    } else {
      await client.incomingPhoneNumbers(numberRow.twilio_number_sid).update({
        voiceUrl: '',
        statusCallback: '',
      });
    }
  } catch (err: any) {
    logger.error({ err, workspaceId, phoneNumberId }, 'ivr.assign.twilio_update_failed');
    return { error: humanizeTwilioError(err) };
  }

  const { error } = await adminClient
    .from('workspace_phone_numbers')
    .update({ active_ivr_menu_id: menuId })
    .eq('id', phoneNumberId)
    .eq('workspace_id', workspaceId);

  if (error) {
    logger.error({ err: error, workspaceId, phoneNumberId, menuId }, 'ivr.assign.local_update_failed');
    return { error: 'Twilio was updated, but saving this in LeadsMind failed. Please retry — refresh first to check current state.' };
  }

  revalidatePath('/settings');
  return { success: true };
}

// CALL LOGS — read-only listing for the Phone & IVR settings area.
export async function listCallLogs(params: { phoneNumberId?: string; limit?: number } = {}): Promise<{ data?: CallLog[]; error?: string }> {
  const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
  const adminClient = createAdminClient();

  let query = adminClient
    .from('call_logs')
    .select('id, twilio_call_sid, from_number, to_number, started_at, ended_at, duration_seconds, call_status, menu_path, outcome, recording_url, voicemail_url, voicemail_duration_seconds')
    .eq('workspace_id', workspaceId)
    .order('started_at', { ascending: false })
    .limit(params.limit ?? 50);

  if (params.phoneNumberId) query = query.eq('phone_number_id', params.phoneNumberId);

  const { data, error } = await query;
  if (error) return { error: 'Failed to load call logs.' };
  return { data: data as CallLog[] };
}

'use server';

// WhatsApp automated replies (keyword-trigger chatbot) — Task 43. Deliberately
// scoped as simple keyword/pattern -> canned-response matching, not a
// conversational flow/state engine — see the Task 43 audit's recommendation
// to ship the small, real version. Rules are matched in
// webhooks/meta/route.ts's handleWhatsAppMessage(), after the existing
// STOP/START compliance check.

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { userSafeMessage } from '@/shared/errors/userSafe';
import { validateBotRule, REGEX_RULES_UNSUPPORTED } from '@/lib/whatsapp/botRuleValidation';

const RULE_NOT_FOUND = 'Rule not found';

export interface WhatsAppBotRulePayload {
  name: string;
  matchType: 'exact' | 'contains' | 'regex';
  matchValue: string;
  replyType: 'text' | 'template';
  replyText?: string | null;
  replyTemplateName?: string | null;
  replyTemplateLanguage?: string | null;
  replyTemplateParams?: string[] | null;
  priority?: number;
  active?: boolean;
}

function validateRulePayload(payload: WhatsAppBotRulePayload) {
  validateBotRule(payload);
}

export async function listWhatsAppBotRules() {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('whatsapp_bot_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;

    return { success: true as const, data: data ?? [] };
  } catch (error: any) {
    logger.error({ err: error }, 'list.whatsapp_bot_rules.failed');
    return { success: false as const, error: 'Failed to load automated reply rules' };
  }
}

export async function createWhatsAppBotRule(payload: WhatsAppBotRulePayload) {
  try {
    const { workspaceId, userId } = await requireWorkspaceAccess();
    validateRulePayload(payload);

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('whatsapp_bot_rules')
      .insert({
        workspace_id: workspaceId,
        name: payload.name.trim(),
        match_type: payload.matchType,
        match_value: payload.matchValue.trim(),
        reply_type: payload.replyType,
        reply_text: payload.replyType === 'text' ? payload.replyText!.trim() : null,
        reply_template_name: payload.replyType === 'template' ? payload.replyTemplateName!.trim() : null,
        reply_template_language: payload.replyType === 'template' ? (payload.replyTemplateLanguage?.trim() || 'en_US') : null,
        reply_template_params: payload.replyType === 'template' && payload.replyTemplateParams?.length ? payload.replyTemplateParams : null,
        priority: payload.priority ?? 0,
        active: payload.active ?? true,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;

    revalidatePath('/whatsapp-broadcasts');
    return { success: true as const, data };
  } catch (error: any) {
    logger.error({ err: error }, 'create.whatsapp_bot_rule.failed');
    return { success: false as const, error: userSafeMessage(error, 'Failed to create rule') };
  }
}

export async function updateWhatsAppBotRule(id: string, payload: WhatsAppBotRulePayload) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    validateRulePayload(payload);

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('whatsapp_bot_rules')
      .update({
        name: payload.name.trim(),
        match_type: payload.matchType,
        match_value: payload.matchValue.trim(),
        reply_type: payload.replyType,
        reply_text: payload.replyType === 'text' ? payload.replyText!.trim() : null,
        reply_template_name: payload.replyType === 'template' ? payload.replyTemplateName!.trim() : null,
        reply_template_language: payload.replyType === 'template' ? (payload.replyTemplateLanguage?.trim() || 'en_US') : null,
        reply_template_params: payload.replyType === 'template' && payload.replyTemplateParams?.length ? payload.replyTemplateParams : null,
        priority: payload.priority ?? 0,
        active: payload.active ?? true,
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .maybeSingle();
    if (error) throw error;
    // No row matched: it does not exist, or it belongs to another workspace (RLS + the workspace filter hide it).
    if (!data) return { success: false as const, error: RULE_NOT_FOUND };

    revalidatePath('/whatsapp-broadcasts');
    return { success: true as const, data };
  } catch (error: any) {
    logger.error({ err: error }, 'update.whatsapp_bot_rule.failed');
    return { success: false as const, error: userSafeMessage(error, 'Failed to update rule') };
  }
}

export async function toggleWhatsAppBotRule(id: string, active: boolean) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();
    const { data: existing, error: findErr } = await supabase
      .from('whatsapp_bot_rules')
      .select('id, match_type')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return { success: false as const, error: RULE_NOT_FOUND };
    if (active && existing.match_type === 'regex') return { success: false as const, error: REGEX_RULES_UNSUPPORTED };

    const { data: updated, error } = await supabase
      .from('whatsapp_bot_rules')
      .update({ active })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id');
    if (error) throw error;
    if (!updated || updated.length === 0) return { success: false as const, error: RULE_NOT_FOUND };

    revalidatePath('/whatsapp-broadcasts');
    return { success: true as const };
  } catch (error: any) {
    logger.error({ err: error }, 'toggle.whatsapp_bot_rule.failed');
    return { success: false as const, error: 'Failed to update rule' };
  }
}

export async function deleteWhatsAppBotRule(id: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();
    const { data: deleted, error } = await supabase
      .from('whatsapp_bot_rules')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id');
    if (error) throw error;
    if (!deleted || deleted.length === 0) return { success: false as const, error: RULE_NOT_FOUND };

    revalidatePath('/whatsapp-broadcasts');
    return { success: true as const };
  } catch (error: any) {
    logger.error({ err: error }, 'delete.whatsapp_bot_rule.failed');
    return { success: false as const, error: 'Failed to delete rule' };
  }
}

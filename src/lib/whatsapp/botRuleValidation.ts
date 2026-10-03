// Validation for WhatsApp keyword bot rules. Kept out of the 'use server' actions file (which may only export async
// functions) so it is importable by tests and by the UI.
import { ValidationError } from '@/shared/errors/AppError';

export const REGEX_RULES_UNSUPPORTED = 'Regex rules are no longer supported. Use "contains" or "exact" matching instead.';

export interface BotRuleInput {
  name: string;
  matchType: string;
  matchValue: string;
  replyType: string;
  replyText?: string | null;
  replyTemplateName?: string | null;
}

// Authored for the user, so safe to show as-is. Regex mode is rejected outright: user-supplied patterns would run on
// the native regex engine inside the shared webhook handler (ReDoS), and the runtime no longer evaluates them.
export function validateBotRule(payload: BotRuleInput): void {
  if (!payload.name?.trim()) throw new ValidationError('Rule name is required');
  if (!payload.matchValue?.trim()) throw new ValidationError('Match value is required');
  if (payload.matchType === 'regex') throw new ValidationError(REGEX_RULES_UNSUPPORTED);
  if (payload.matchType !== 'exact' && payload.matchType !== 'contains') {
    throw new ValidationError('Choose how the message should be matched');
  }
  if (payload.replyType === 'text' && !payload.replyText?.trim()) {
    throw new ValidationError('Reply text is required for a text reply');
  }
  if (payload.replyType === 'template' && !payload.replyTemplateName?.trim()) {
    throw new ValidationError('Select an approved template for a template reply');
  }
}

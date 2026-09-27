// Sender (From) display name rules for managed sending domains. Pure: shared by the server actions
// that enforce it and the settings UI that explains it.
//
// Why this is enforced, not optional: the display name is a spam signal on its own. Proven
// 2026-09-27 by single-variable real sends (identical HTML from hello@zainulhassan.site): Inbox as
// "Zain Ul Hassan", Spam as "LeadsMind", in two separate Gmail mailboxes. A name that doesn't look
// like a real sender (the platform brand, a signup-generated "Jane's Workspace", "Test") reads the
// same way to filters and recipients.

export const SENDER_NAME_MAX = 60;

// Flat (not a discriminated union): this project's TS config doesn't narrow on a boolean tag.
// name is the cleaned name when ok; reason is the user-facing problem when not ('' when ok).
export type SenderNameCheck = { ok: boolean; name: string; reason: string };

const fail = (reason: string): SenderNameCheck => ({ ok: false, name: '', reason });

// Names that say nothing about who is sending. Compared case-insensitively after trimming.
const GENERIC_NAMES = new Set([
  'workspace', 'my workspace', 'test', 'testing', 'test workspace', 'company', 'your company', 'my company',
  'sender', 'from', 'from name', 'name', 'admin', 'user', 'default', 'example', 'demo', 'sample',
  'noreply', 'no-reply', 'no reply', 'donotreply', 'do not reply', 'mailer', 'info', 'hello',
]);

export function validateSenderName(raw: string | null | undefined): SenderNameCheck {
  const name = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!name) return fail('Enter a From name, like your company or brand name.');
  if (name.length < 2) return fail('The From name is too short. Use your company or brand name.');
  if (name.length > SENDER_NAME_MAX) return fail(`Keep the From name under ${SENDER_NAME_MAX} characters.`);
  if (/[<>@"]/.test(name) || /https?:\/\/|www\./i.test(name)) {
    return fail('The From name must be a name, not an email address or link.');
  }
  if ((name.match(/\p{L}/gu) ?? []).length < 2) return fail('The From name needs real words, like your company name.');
  // The platform's own brand on a customer's domain is a brand/domain mismatch — the proven spam cause.
  if (/leads\s*mind/i.test(name)) return fail('Use your own company or brand name, not LeadsMind.');
  // The name every new workspace gets at signup (auth/callback: `${displayName}'s Workspace`).
  if (/['’]s workspace$/i.test(name)) {
    return fail('This looks like the default workspace name. Use the name your recipients know you by.');
  }
  if (GENERIC_NAMES.has(name.toLowerCase())) {
    return fail('This looks like a placeholder. Use the name your recipients know you by.');
  }
  return { ok: true, name, reason: '' };
}

export function isRealSenderName(raw: string | null | undefined): boolean {
  return validateSenderName(raw).ok;
}

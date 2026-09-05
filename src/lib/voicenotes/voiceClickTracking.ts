import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const VOICE_NOTE_LINK_PATTERN = /\/voice-note\/([0-9a-fA-F-]{36})(?:[/?]|$)/;

/**
 * Top-vs-bottom waveform click analytics (Email Channel Part 3, PRD's own
 * open question — answered by piggybacking on the real, already-live
 * /api/webhooks/email/deliverability click-event ingestion).
 *
 * Deliberately NOT written into email_tracking_logs — that table's
 * campaign_id column is NOT NULL and FK'd to email_campaigns, and a
 * voice-note email is a transactional send with no campaign at all, so a
 * literal "reuse email_tracking_logs" would violate that constraint. This
 * records directly onto the real message row (messages.metadata) instead,
 * reusing the same webhook endpoint, signature verification, and Resend
 * click-event shape — just a schema-appropriate landing spot.
 *
 * Position (top/bottom) comes from the `pos` query param Resend reports back
 * verbatim on `data.click.url`; the opaque token alone identifies the message.
 *
 * Returns true if `linkUrl` was recognized as a voice-note playback link
 * (whether or not a message was actually found/updated) — the caller uses
 * this to short-circuit before the campaign-scoped validation path, which
 * would otherwise silently ignore a click with no campaignId.
 */
export async function recordVoiceNoteClick(linkUrl: string): Promise<boolean> {
  const match = linkUrl.match(VOICE_NOTE_LINK_PATTERN);
  if (!match) return false;
  const token = match[1];

  let position: string | null = null;
  try {
    position = new URL(linkUrl).searchParams.get('pos');
  } catch {
    // Malformed URL — still a recognized voice-note link, just no position.
  }

  const { data: msg } = await supabaseAdmin
    .from('messages')
    .select('id, metadata')
    .eq('voice_playback_token', token)
    .maybeSingle();

  if (!msg) {
    logger.warn({ token }, 'webhook.email_deliverability.voice_note_click.token_not_found');
    return true;
  }

  const existingClicks = Array.isArray((msg.metadata as any)?.voice_clicks) ? (msg.metadata as any).voice_clicks : [];
  const updatedMetadata = {
    ...(msg.metadata || {}),
    voice_clicks: [...existingClicks, { position: position || 'unknown', at: new Date().toISOString() }].slice(-50),
    voice_click_count: ((msg.metadata as any)?.voice_click_count || 0) + 1,
  };

  const { error } = await supabaseAdmin.from('messages').update({ metadata: updatedMetadata }).eq('id', msg.id);
  if (error) {
    logger.error({ err: error, token }, 'webhook.email_deliverability.voice_note_click.update_failed');
  } else {
    logger.info({ token, position }, 'webhook.email_deliverability.voice_note_click.recorded');
  }
  return true;
}

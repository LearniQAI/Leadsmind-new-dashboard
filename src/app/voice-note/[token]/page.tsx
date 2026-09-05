import React from 'react';
import { MicOff } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { VoiceNotePlayer } from '@/components/common/VoiceNotePlayer';

export const dynamic = 'force-dynamic';

// Public voice-note playback page (Email Channel Part 3, PRD 4.5). No auth —
// an unguessable token tied to one specific message, the same discipline as
// /certificates/verify/[id]: a public, unauthenticated route reading via the
// service-role client (RLS would otherwise block an anonymous read), exposing
// ONLY the fields needed to play the clip and greet the visitor — nothing
// else about the message, the contact, or the workspace.
async function lookup(token: string) {
  if (!token || token.length > 64) return null;
  const db = createAdminClient();
  const { data } = await db
    .from('messages')
    .select('audio_url, audio_duration, sent_at, metadata')
    .eq('voice_playback_token', token)
    .maybeSingle();
  if (!data?.audio_url) return null;

  const snapshot = (data.metadata as any)?.voice_playback_snapshot || {};
  return {
    audioUrl: data.audio_url as string,
    duration: data.audio_duration as number | null,
    sentAt: data.sent_at as string,
    senderName: snapshot.sender_name || 'A team member',
    workspaceName: snapshot.workspace_name || 'LeadsMind',
    brandColor: snapshot.brand_color || '#5C4AC7',
  };
}

export default async function VoiceNotePlaybackPage({ params }: { params: { token: string } }) {
  const note = await lookup(decodeURIComponent(params.token));

  if (!note) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A2540] px-4 py-16 font-sans">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0F2E4C] p-8 text-center shadow-xl">
          <MicOff className="mx-auto h-10 w-10 text-white/40" />
          <h1 className="mt-4 text-[17px] font-semibold text-white">Voice message not found</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
            This link may have expired or the message no longer exists.
          </p>
        </div>
      </div>
    );
  }

  const sentDate = new Date(note.sentAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A2540] px-4 py-16 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0F2E4C] p-6 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: note.brandColor }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
            {note.workspaceName}
          </span>
        </div>

        <h1 className="mt-4 text-[17px] font-semibold text-white">
          Voice message from {note.senderName}
        </h1>
        <p className="mt-1 text-[12.5px] text-white/50">Sent {sentDate}</p>

        <div className="mt-5">
          <VoiceNotePlayer audioUrl={note.audioUrl} duration={note.duration ?? undefined} theme="dark" />
        </div>
      </div>
    </div>
  );
}

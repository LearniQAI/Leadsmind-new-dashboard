"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Speaker {
  id: string;
  name: string;
  display_name: string | null;
  role: string | null;
  image_url: string | null;
}

export interface LessonSpeaker {
  speaker_id: string;
  display_order: number;
  speakers: Speaker;
}

export interface SpeakerSegment {
  id: string;
  speaker_id: string | null;
  start_time_ms: number;
  end_time_ms: number;
  sequence: number;
}

export interface TranscriptLine {
  id: string;
  speaker_id: string | null;
  start_time_ms: number;
  end_time_ms: number;
  text: string;
  sequence: number;
}

export interface Chapter {
  id: string;
  title: string;
  start_time_ms: number;
  end_time_ms: number;
  display_order: number;
}

interface AudioLessonContent {
  loading: boolean;
  speakers: LessonSpeaker[];
  segments: SpeakerSegment[];
  transcript: TranscriptLine[];
  chapters: Chapter[];
  resumePositionSeconds: number | null;
}

const EMPTY: AudioLessonContent = {
  loading: true,
  speakers: [],
  segments: [],
  transcript: [],
  chapters: [],
  resumePositionSeconds: null,
};

// Client-side reads, gated entirely by the RLS policies Phase 1 shipped ("students read X for
// enrolled courses") — no dedicated student API route needed for any of this, the same pattern
// LiveHelpWidget already uses elsewhere on this page for its own data.
export function useAudioLessonContent(contentBlockId: string | null): AudioLessonContent {
  const [state, setState] = useState<AudioLessonContent>(EMPTY);

  useEffect(() => {
    if (!contentBlockId) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    (async () => {
      const supabase = createClient();

      const [speakersRes, segmentsRes, transcriptRes, chaptersRes, progressRes] = await Promise.all([
        supabase
          .from('audio_lesson_speakers')
          .select('speaker_id, display_order, speakers(*)')
          .eq('content_block_id', contentBlockId)
          .order('display_order', { ascending: true }),
        supabase
          .from('audio_speaker_segments')
          .select('id, speaker_id, start_time_ms, end_time_ms, sequence')
          .eq('content_block_id', contentBlockId)
          .order('sequence', { ascending: true }),
        supabase
          .from('transcript_segments')
          .select('id, speaker_id, start_time_ms, end_time_ms, text, sequence')
          .eq('content_block_id', contentBlockId)
          .order('sequence', { ascending: true }),
        supabase
          .from('audio_chapters')
          .select('id, title, start_time_ms, end_time_ms, display_order')
          .eq('content_block_id', contentBlockId)
          .order('display_order', { ascending: true }),
        supabase
          .from('audio_progress')
          .select('position_seconds')
          .eq('content_block_id', contentBlockId)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setState({
        loading: false,
        speakers: (speakersRes.data as any) || [],
        segments: segmentsRes.data || [],
        transcript: transcriptRes.data || [],
        chapters: chaptersRes.data || [],
        resumePositionSeconds: progressRes.data?.position_seconds ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [contentBlockId]);

  return state;
}

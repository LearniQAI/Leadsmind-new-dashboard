"use client";

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface AudioAssetData {
  id: string;
  google_drive_file_id: string;
  share_url: string;
  filename: string | null;
  mime_type: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  status: 'pending' | 'ready' | 'broken';
  last_validation_error: string | null;
}

export interface Speaker {
  id: string;
  name: string;
  display_name: string | null;
  role: string | null;
  image_url: string | null;
}

export interface LessonSpeaker {
  id: string;
  speaker_id: string;
  display_order: number;
  speakers: Speaker;
}

export interface SpeakerSegmentRow {
  id: string;
  speaker_id: string | null;
  start_time_ms: number;
  end_time_ms: number;
  sequence: number;
}

export interface TranscriptLineRow {
  id: string;
  speaker_id: string | null;
  start_time_ms: number;
  end_time_ms: number;
  text: string;
  sequence: number;
}

export interface ChapterRow {
  id: string;
  title: string;
  start_time_ms: number;
  end_time_ms: number;
  display_order: number;
}

export interface CourseInfo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  landing_page_settings: { template?: string } | null;
}

export interface LessonInfo {
  id: string;
  title: string;
}

export interface ContentBlockInfo {
  id: string;
  lesson_id: string;
  content: { mode?: string; audio_asset_id?: string } | null;
  completion_threshold: number | null;
}

// Bootstraps everything the Lesson Builder screen needs, then exposes granular refetchers so
// each editor (speaker timeline / transcript / chapters) can reload just its own slice after a
// mutation instead of refetching the whole page's data.
export function useAudioAuthoringData(contentBlockId: string, courseId: string, lessonId: string) {
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState<ContentBlockInfo | null>(null);
  const [asset, setAsset] = useState<AudioAssetData | null>(null);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [lesson, setLesson] = useState<LessonInfo | null>(null);
  const [allSpeakers, setAllSpeakers] = useState<Speaker[]>([]);
  const [lessonSpeakers, setLessonSpeakers] = useState<LessonSpeaker[]>([]);
  const [segments, setSegments] = useState<SpeakerSegmentRow[]>([]);
  const [transcript, setTranscript] = useState<TranscriptLineRow[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);

  const refetchSpeakers = useCallback(async () => {
    const [allRes, lessonRes] = await Promise.all([
      fetch('/api/lms/speakers').then((r) => r.json()),
      fetch(`/api/lms/audio-lesson-speakers?contentBlockId=${contentBlockId}`).then((r) => r.json()),
    ]);
    if (!allRes.error) setAllSpeakers(allRes.data || []);
    if (!lessonRes.error) setLessonSpeakers(lessonRes.data || []);
  }, [contentBlockId]);

  const refetchSegments = useCallback(async () => {
    const res = await fetch(`/api/lms/audio-speaker-segments?contentBlockId=${contentBlockId}`).then((r) => r.json());
    if (!res.error) setSegments(res.data || []);
  }, [contentBlockId]);

  const refetchTranscript = useCallback(async () => {
    const res = await fetch(`/api/lms/transcript-segments?contentBlockId=${contentBlockId}`).then((r) => r.json());
    if (!res.error) setTranscript(res.data || []);
  }, [contentBlockId]);

  const refetchChapters = useCallback(async () => {
    const res = await fetch(`/api/lms/audio-chapters?contentBlockId=${contentBlockId}`).then((r) => r.json());
    if (!res.error) setChapters(res.data || []);
  }, [contentBlockId]);

  const refetchAsset = useCallback(async (assetId: string) => {
    const res = await fetch(`/api/lms/audio-assets/${assetId}`).then((r) => r.json());
    if (!res.error) setAsset(res.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();

      const [blockRes, courseRes, lessonRes] = await Promise.all([
        fetch(`/api/lms/content-blocks/${contentBlockId}`).then((r) => r.json()),
        fetch(`/api/lms/course?id=${courseId}`).then((r) => r.json()),
        supabase.from('course_lessons').select('id, title').eq('id', lessonId).maybeSingle(),
      ]);
      if (cancelled) return;

      if (!blockRes.error) setBlock(blockRes.data);
      if (!courseRes.error) setCourse(courseRes.data);
      if (lessonRes.data) setLesson(lessonRes.data as LessonInfo);

      const assetId = blockRes.data?.content?.audio_asset_id;
      if (assetId) {
        const assetRes = await fetch(`/api/lms/audio-assets/${assetId}`).then((r) => r.json());
        if (!cancelled && !assetRes.error) setAsset(assetRes.data);
      }

      await Promise.all([refetchSpeakers(), refetchSegments(), refetchTranscript(), refetchChapters()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentBlockId, courseId, lessonId]);

  return {
    loading,
    block,
    setBlock,
    asset,
    setAsset,
    course,
    lesson,
    allSpeakers,
    lessonSpeakers,
    segments,
    setSegments,
    transcript,
    setTranscript,
    chapters,
    setChapters,
    refetchSpeakers,
    refetchSegments,
    refetchTranscript,
    refetchChapters,
    refetchAsset,
  };
}

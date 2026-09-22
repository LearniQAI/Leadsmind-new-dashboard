"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, AlertTriangle, RefreshCw, Loader2, X, Plus } from 'lucide-react';
import { AudioPlayerProvider } from '@/components/lms/AudioPlayerProvider';
import { useAudioAuthoringData } from './components/useAudioAuthoringData';
import AdminAudioPreview from './components/AdminAudioPreview';
import SpeakerTimelineEditor from './components/SpeakerTimelineEditor';
import TranscriptEditor from './components/TranscriptEditor';
import ChapterEditor from './components/ChapterEditor';

// Screen 2 (Phase 3 Part B): the core authoring screen, modeled on this app's real pattern for
// a spacious sub-editor (the quiz workbench at /courses/[id]/quiz/[quizId]) rather than
// squeezed into the 320px canvas settings panel Phase 1's quick editor lives in — a real
// timeline needs real width. Phase 1's panel gets a link to open this screen once an asset is
// attached; this screen is where the actual authoring happens.
export default function AudioLessonBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;
  const contentBlockId = params.blockId as string;

  const data = useAudioAuthoringData(contentBlockId, courseId, lessonId);
  const [shareUrlInput, setShareUrlInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [newSpeakerName, setNewSpeakerName] = useState('');

  const bump = <T extends (...args: any[]) => Promise<void>>(fn: T) => async (...args: Parameters<T>) => {
    await fn(...args);
    setPreviewVersion((v) => v + 1);
  };

  const handleValidate = async () => {
    const trimmed = shareUrlInput.trim();
    if (!trimmed) return;
    setIsValidating(true);
    try {
      const res = await fetch('/api/lms/audio-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_block_id: contentBlockId, share_url: trimmed }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      data.setAsset(json.data);
      if (json.data.status === 'ready') {
        setShareUrlInput('');
        setPreviewVersion((v) => v + 1);
        toast.success('Audio link validated');
      } else {
        toast.error(json.data.last_validation_error || 'This link could not be validated.');
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleRecheck = async () => {
    if (!data.asset) return;
    setIsValidating(true);
    try {
      const res = await fetch(`/api/lms/audio-assets/${data.asset.id}/recheck`, { method: 'POST' });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      data.setAsset(json.data);
      toast[json.data.status === 'ready' ? 'success' : 'error'](
        json.data.status === 'ready' ? 'Still accessible' : json.data.last_validation_error
      );
    } finally {
      setIsValidating(false);
    }
  };

  const attachSpeaker = async (speakerId: string) => {
    await fetch('/api/lms/audio-lesson-speakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_block_id: contentBlockId, speaker_id: speakerId, display_order: data.lessonSpeakers.length }),
    });
    await bump(data.refetchSpeakers)();
  };

  const handleCreateSpeaker = async () => {
    const name = newSpeakerName.trim();
    if (!name) return;
    const res = await fetch('/api/lms/speakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (json.error) {
      toast.error(json.error);
      return;
    }
    await attachSpeaker(json.data.id);
    setNewSpeakerName('');
  };

  const detachSpeaker = async (linkId: string) => {
    await fetch(`/api/lms/audio-lesson-speakers/${linkId}`, { method: 'DELETE' });
    await bump(data.refetchSpeakers)();
  };

  if (data.loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-dash-accent motion-reduce:animate-none" />
      </div>
    );
  }

  const assetId = data.block?.content?.audio_asset_id || null;
  const attachedSpeakerIds = new Set(data.lessonSpeakers.map((s) => s.speaker_id));
  const availableSpeakers = data.allSpeakers.filter((s) => !attachedSpeakerIds.has(s.id));

  return (
    <AudioPlayerProvider>
      <div className="min-h-screen bg-dash-bg p-6 md:p-8">
        <button
          onClick={() => router.push(`/courses/${courseId}/lessons/${lessonId}/builder`)}
          className="mb-4 flex items-center gap-1.5 text-[12px] font-bold !text-dash-textMuted hover:!text-dash-text"
        >
          <ArrowLeft size={14} /> Back to lesson
        </button>

        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">Audio Lesson Builder</div>
          <h1 className="mt-1 text-[22px] font-bold !text-dash-text">{data.lesson?.title || 'Lesson'}</h1>
          <p className="text-[12px] !text-dash-textMuted">{data.course?.title}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* Editing surface */}
          <div className="space-y-6">
            {/* Link input + status */}
            <section className="rounded-2xl border border-dash-border bg-white p-5">
              <h2 className="mb-3 text-[13px] font-bold !text-dash-text">Google Drive link</h2>
              <div className="flex gap-2">
                <input
                  value={shareUrlInput}
                  onChange={(e) => setShareUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view"
                  className="h-9 flex-1 rounded-lg border border-dash-border bg-white px-3 font-mono text-[12px] !text-dash-text outline-none focus:border-dash-accent"
                />
                <button
                  onClick={handleValidate}
                  disabled={isValidating || !shareUrlInput.trim()}
                  className="h-9 shrink-0 rounded-lg bg-dash-accent px-4 text-[12px] font-bold text-white disabled:opacity-50"
                >
                  {isValidating ? 'Validating...' : 'Validate'}
                </button>
              </div>

              {data.asset && (
                <div
                  className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold ${
                    data.asset.status === 'ready'
                      ? 'border-green/20 bg-green/10 text-green'
                      : 'border-amber-300 bg-amber-50 text-amber-700'
                  }`}
                >
                  {data.asset.status === 'ready' ? (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    {data.asset.status === 'ready' ? (
                      <>
                        {data.asset.filename} &middot; {data.asset.mime_type} &middot;{' '}
                        {data.asset.duration_seconds
                          ? `${Math.floor(data.asset.duration_seconds / 60)}:${String(Math.round(data.asset.duration_seconds % 60)).padStart(2, '0')}`
                          : 'duration unknown until first play'}
                      </>
                    ) : (
                      data.asset.last_validation_error || 'This link is broken.'
                    )}
                  </div>
                  <button onClick={handleRecheck} disabled={isValidating} className="shrink-0 font-bold !text-dash-text hover:underline">
                    <RefreshCw size={12} className={isValidating ? 'animate-spin motion-reduce:animate-none' : ''} />
                  </button>
                </div>
              )}
            </section>

            {assetId && (
              <>
                <section className="rounded-2xl border border-dash-border bg-white p-5">
                  <h2 className="mb-3 text-[13px] font-bold !text-dash-text">Speakers</h2>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {data.lessonSpeakers.map((ls) => (
                      <span
                        key={ls.id}
                        className="flex items-center gap-1.5 rounded-full border border-dash-border bg-dash-surface px-3 py-1 text-[11px] font-bold !text-dash-text"
                      >
                        {ls.speakers.display_name || ls.speakers.name}
                        <button onClick={() => detachSpeaker(ls.id)} className="!text-dash-textMuted hover:text-red">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {availableSpeakers.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) attachSpeaker(e.target.value);
                          e.target.value = '';
                        }}
                        defaultValue=""
                        className="h-9 flex-1 rounded-lg border border-dash-border bg-white px-2.5 text-[12px] !text-dash-text"
                      >
                        <option value="" disabled>
                          Add from speaker library...
                        </option>
                        {availableSpeakers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.display_name || s.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      value={newSpeakerName}
                      onChange={(e) => setNewSpeakerName(e.target.value)}
                      placeholder="Or create a new speaker..."
                      className="h-9 flex-1 rounded-lg border border-dash-border bg-white px-2.5 text-[12px] !text-dash-text"
                    />
                    <button
                      onClick={handleCreateSpeaker}
                      className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-dash-border bg-dash-surface px-3 text-[12px] font-bold !text-dash-text hover:bg-dash-border/40"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-dash-border bg-white p-5">
                  <h2 className="mb-3 text-[13px] font-bold !text-dash-text">Speaker timeline</h2>
                  <SpeakerTimelineEditor
                    contentBlockId={contentBlockId}
                    lessonSpeakers={data.lessonSpeakers}
                    segments={data.segments}
                    chapters={data.chapters}
                    onSegmentsChange={bump(data.refetchSegments)}
                  />
                </section>

                <section className="rounded-2xl border border-dash-border bg-white p-5">
                  <h2 className="mb-3 text-[13px] font-bold !text-dash-text">Chapters</h2>
                  <ChapterEditor
                    contentBlockId={contentBlockId}
                    chapters={data.chapters}
                    onChaptersChange={bump(data.refetchChapters)}
                  />
                </section>

                <section className="rounded-2xl border border-dash-border bg-white p-5">
                  <h2 className="mb-3 text-[13px] font-bold !text-dash-text">Transcript</h2>
                  <TranscriptEditor
                    contentBlockId={contentBlockId}
                    lessonSpeakers={data.lessonSpeakers}
                    transcript={data.transcript}
                    onTranscriptChange={bump(data.refetchTranscript)}
                  />
                </section>
              </>
            )}
          </div>

          {/* Live preview — sticky so it stays visible while the editing surface scrolls */}
          <div className="lg:sticky lg:top-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide !text-dash-textMuted">
              Live student preview
            </p>
            <AdminAudioPreview
              key={previewVersion}
              assetId={assetId}
              contentBlockId={contentBlockId}
              courseId={courseId}
              lessonId={lessonId}
              course={data.course}
              lesson={data.lesson}
              completionThreshold={data.block?.completion_threshold ?? 90}
            />
          </div>
        </div>
      </div>
    </AudioPlayerProvider>
  );
}

"use client";

import React, { useRef } from 'react';
import { useHasAudioPlayerProvider } from '@/components/lms/AudioPlayerProvider';
import AudioDrivePlayer from '@/app/student/courses/[id]/components/AudioDrivePlayer';
import { useLessonBuilder } from '../LessonBuilderContext';
import { AUDIO_CONTROL_SELECTOR, useCanvasInteractionShield } from './canvasMedia';

// The REAL signature audio player, fully interactive, inline on the lesson canvas — the same
// AudioDrivePlayer the student page and the Audio Lesson Builder preview mount, not a third
// implementation. Its provider (LessonCanvasMediaScope) and the event shield that lets its
// controls and Craft's block selection/drag coexist live in ./canvasMedia, shared with the
// canvas Drive video player.

const NOOP = () => {};

interface CanvasAudioPlayerProps {
  blockId: string;
  assetId: string;
  artworkUrl: string | null;
  waveformColor: string | null;
  completionThreshold: number | null;
}

// Memoised on primitive props so canvas-level re-renders (autosave state, selection outline,
// settings-panel edits to unrelated fields) don't re-render the player tree. Even when it does
// re-render, nothing restarts: the <audio> element + analyser live in the provider ABOVE the
// Craft frame, AudioDrivePlayer's load effect only re-runs on asset/artwork/colour change (and
// short-circuits for the same asset), and the visualizer's loop only re-initialises when its bar
// count changes.
export const CanvasAudioPlayer = React.memo(function CanvasAudioPlayer({
  blockId,
  assetId,
  artworkUrl,
  waveformColor,
  completionThreshold,
}: CanvasAudioPlayerProps) {
  const { lessonId, courseId, lessonTitle } = useLessonBuilder();
  const hasProvider = useHasAudioPlayerProvider();
  const shieldRef = useRef<HTMLDivElement>(null);
  useCanvasInteractionShield(shieldRef, AUDIO_CONTROL_SELECTOR);

  // The shield div always renders (its listeners attach once, on mount); only its contents vary.
  return (
    <div ref={shieldRef}>
      {hasProvider && lessonId && courseId ? (
        <AudioDrivePlayer
          assetId={assetId}
          contentBlockId={blockId}
          courseId={courseId}
          lessonId={lessonId}
          title={lessonTitle || 'Lesson'}
          artworkUrl={artworkUrl}
          waveformColor={waveformColor}
          completionThreshold={completionThreshold}
          isAlreadyCompleted={false}
          onComplete={NOOP}
        />
      ) : (
        <div className="rounded-lg border border-dash-border bg-dash-surface px-3 py-4 text-center text-[10px] !text-dash-textMuted">
          Google Drive audio linked
        </div>
      )}
    </div>
  );
});

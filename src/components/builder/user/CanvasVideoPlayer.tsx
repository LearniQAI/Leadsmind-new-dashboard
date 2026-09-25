"use client";

import React, { useRef } from 'react';
import VideoPlayer from '@/app/student/courses/[id]/components/VideoPlayer';
import { useCanvasInteractionShield } from './canvasMedia';

// The REAL Drive video player, fully interactive, inline on the lesson canvas — the same
// VideoPlayer (native <video> via forceDirect) the student page and the instructor lesson preview
// mount, playing the same access-gated /api/video/{asset}/stream route. Staff always pass that
// route's access check (resolveVideoAccess), so draft and unpublished lessons play too.
//
// The shield (./canvasMedia) is the audio player's, with one difference: a native <video>'s
// controls (play, scrubber, volume, fullscreen) live in the browser's shadow DOM, where every
// event is retargeted to the <video> element itself. There is no way to tell "pressed the
// scrubber" from "pressed the picture", so the whole <video> is the control: a press on it never
// selects or drags the block. The block header strip and the padding around the player stay the
// block's select/drag surface (exactly as the audio card's non-control areas do).
const VIDEO_CONTROL_SELECTOR = 'video';

// isAlreadyCompleted=true switches off VideoPlayer's only completion paths (timeupdate threshold
// and ended), and no onProgressUpdate is passed — an admin test-play writes nothing. The stream
// and poster routes themselves only read.
const NOOP = () => {};

interface CanvasVideoPlayerProps {
  src: string;
  poster: string;
}

// Memoised on its two URL strings so canvas-level re-renders (selection outline, autosave state,
// settings-panel edits) don't touch the player; even a re-render keeps the same <video> element,
// so playback position is never lost.
export const CanvasVideoPlayer = React.memo(function CanvasVideoPlayer({ src, poster }: CanvasVideoPlayerProps) {
  const shieldRef = useRef<HTMLDivElement>(null);
  useCanvasInteractionShield(shieldRef, VIDEO_CONTROL_SELECTOR);
  return (
    <div ref={shieldRef} data-canvas-video-player="">
      <VideoPlayer
        videoUrl={src}
        poster={poster}
        forceDirect
        isAlreadyCompleted
        onComplete={NOOP}
        lowBandwidthMode={false}
      />
    </div>
  );
});

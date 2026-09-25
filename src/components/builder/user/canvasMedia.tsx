"use client";

import React, { useEffect, useRef } from 'react';
import { AudioPlayerProvider } from '@/components/lms/AudioPlayerProvider';

// Shared plumbing for REAL, interactive media players inline on the lesson canvas (Drive audio:
// CanvasAudioPlayer, Drive video: CanvasVideoPlayer). The canvas is the same React tree as the
// rest of the builder (Craft.js <Frame> renders inline, no iframe), so two things are needed:
// (1) a canvas-scoped media context, and (2) an event shield that lets a player's controls and
// Craft's block selection/drag coexist.

/**
 * One scope for the whole lesson builder (canvas + settings panel):
 *  - One AudioPlayerProvider: one <audio> element, one analyser, one track at a time — the same
 *    "one shared element per player context" model as the student page, so pressing Play on a
 *    second audio block hands playback over instead of playing both. recordProgress=false: an
 *    admin test-play must never create a student contact for them or write audio_progress /
 *    completions (it would also skew listen-through analytics).
 *  - One-at-a-time across ALL media inside it: each video block owns its own <video> (a video
 *    has to render where its block is, so it can't share one element the way audio does), and
 *    starting any <audio>/<video> here pauses every other one — a second video, the canvas audio
 *    track, or the settings panel's Live Preview. Two soundtracks at once is never what an admin
 *    checking a lesson wants. `play` doesn't bubble, so this listens in the capture phase on a
 *    `display: contents` wrapper (no box, so the layout below is untouched).
 */
export function LessonCanvasMediaScope({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return (
    <OneMediaAtATime>
      <AudioPlayerProvider recordProgress={false}>{children}</AudioPlayerProvider>
    </OneMediaAtATime>
  );
}

export function OneMediaAtATime({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const onPlay = (e: Event) => {
      const started = e.target;
      if (!(started instanceof HTMLMediaElement)) return;
      root.querySelectorAll<HTMLMediaElement>('audio, video').forEach((m) => {
        if (m !== started && !m.paused) m.pause();
      });
    };
    root.addEventListener('play', onPlay, true);
    return () => root.removeEventListener('play', onPlay, true);
  }, []);
  return <div ref={ref} style={{ display: 'contents' }}>{children}</div>;
}

// What counts as "the player's own controls" for the audio player. Everything else inside it
// (title, waveform, artwork, card padding) stays a normal block surface: click selects, drag
// moves. `[data-player-control]` marks non-button interactive layers (e.g. the speed menu's
// click-away overlay).
export const AUDIO_CONTROL_SELECTOR = 'button, [role="slider"], summary, a[href], input, select, textarea, [data-player-control]';

/**
 * Craft.js (v0.2.12) wires every node with NATIVE, bubble-phase listeners on the node's DOM
 * element — `mousedown` selects it — and marks both the RenderNode wrapper and the LessonBlock
 * root `draggable="true"` (drag-anywhere; the toolbar's Move icon is decorative, not a handle).
 * `controlSelector` says which elements inside the shield are the player's controls.
 *
 * 1. Selection — a native `mousedown` stopPropagation here, ONLY when the press lands on a
 *    control, so it never reaches Craft's listeners on the ancestors. This must be native:
 *    React 17+ handlers run at the React root, i.e. AFTER the event already bubbled through
 *    Craft's element listeners, so a React e.stopPropagation() would be too late. `click` is
 *    deliberately NOT stopped — stopping it natively below the React root would silently kill
 *    every onClick in the player.
 * 2. Drag — stopPropagation can't help: `dragstart` fires on the draggable ANCESTOR, not on the
 *    control, so the shield never sees it. Instead, for the duration of a press on a control,
 *    draggable ancestors are switched to draggable="false" (the browser decides the drag source
 *    after pointerdown, on the first move past the drag threshold) and restored on
 *    pointerup/pointercancel/blur/unmount. Without this, pressing a scrubber and moving would
 *    start an HTML5 drag of the whole block and cancel the scrub. The pointerup listener is on
 *    window, so releasing the scrubber OFF the block still restores dragging.
 */
export function useCanvasInteractionShield(ref: React.RefObject<HTMLDivElement | null>, controlSelector: string) {
  useEffect(() => {
    const shield = ref.current;
    if (!shield) return;

    let suppressed: HTMLElement[] = [];

    const controlFor = (target: EventTarget | null): Element | null => {
      if (!(target instanceof Element)) return null;
      const control = target.closest(controlSelector);
      return control && shield.contains(control) ? control : null;
    };

    const restore = () => {
      for (const el of suppressed) el.setAttribute('draggable', 'true');
      suppressed = [];
      window.removeEventListener('pointerup', restore, true);
      window.removeEventListener('pointercancel', restore, true);
      window.removeEventListener('blur', restore);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!controlFor(e.target)) return;
      restore();
      for (let el = shield.parentElement; el; el = el.parentElement) {
        if (el.getAttribute('draggable') === 'true') {
          el.setAttribute('draggable', 'false');
          suppressed.push(el);
        }
      }
      window.addEventListener('pointerup', restore, true);
      window.addEventListener('pointercancel', restore, true);
      window.addEventListener('blur', restore);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (controlFor(e.target)) e.stopPropagation();
    };

    shield.addEventListener('pointerdown', onPointerDown);
    shield.addEventListener('mousedown', onMouseDown);
    return () => {
      shield.removeEventListener('pointerdown', onPointerDown);
      shield.removeEventListener('mousedown', onMouseDown);
      restore();
    };
  }, [ref, controlSelector]);
}

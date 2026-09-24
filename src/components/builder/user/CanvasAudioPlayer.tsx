"use client";

import React, { useEffect, useRef } from 'react';
import { AudioPlayerProvider, useHasAudioPlayerProvider } from '@/components/lms/AudioPlayerProvider';
import AudioDrivePlayer from '@/app/student/courses/[id]/components/AudioDrivePlayer';
import { useLessonBuilder } from '../LessonBuilderContext';

// The REAL signature audio player, fully interactive, inline on the lesson canvas — the same
// AudioDrivePlayer the student page and the Audio Lesson Builder preview mount, not a third
// implementation. The canvas is the same React tree as the rest of the builder (Craft.js
// <Frame> renders inline, no iframe), so the only new pieces are (1) a canvas-scoped provider
// and (2) the event shield below that lets the player's controls and Craft's block
// selection/drag coexist.

/** One provider for the whole lesson canvas: one <audio> element, one analyser, one track at a
 *  time — the same "one shared element per player context" model as the student page, so
 *  pressing Play on a second audio block hands playback over instead of playing both.
 *  recordProgress=false: an admin test-play must never create a student contact for them or
 *  write audio_progress / completions (it would also skew listen-through analytics). */
export function LessonCanvasAudioScope({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <AudioPlayerProvider recordProgress={false}>{children}</AudioPlayerProvider>;
}

// What counts as "the player's own controls". Everything else inside the player (title,
// waveform, artwork, card padding) stays a normal block surface: click selects, drag moves.
// `[data-player-control]` marks non-button interactive layers (e.g. the speed menu's
// click-away overlay).
const CONTROL_SELECTOR = 'button, [role="slider"], summary, a[href], input, select, textarea, [data-player-control]';

/**
 * Craft.js (v0.2.12) wires every node with NATIVE, bubble-phase listeners on the node's DOM
 * element — `mousedown` selects it — and marks both the RenderNode wrapper and the LessonBlock
 * root `draggable="true"` (drag-anywhere; the toolbar's Move icon is decorative, not a handle).
 *
 * 1. Selection — a native `mousedown` stopPropagation here, ONLY when the press lands on a
 *    control, so it never reaches Craft's listeners on the ancestors. This must be native:
 *    React 17+ handlers run at the React root, i.e. AFTER the event already bubbled through
 *    Craft's element listeners, so a React e.stopPropagation() would be too late. Nothing in the
 *    player listens to mousedown (buttons use onClick, the scrubber uses pointer events), so this
 *    costs the player nothing. `click` is deliberately NOT stopped — stopping it natively below
 *    the React root would silently kill every onClick in the player.
 * 2. Drag — stopPropagation can't help: `dragstart` fires on the draggable ANCESTOR, not on the
 *    control, so the shield never sees it. Instead, for the duration of a press on a control,
 *    draggable ancestors are switched to draggable="false" (the browser decides the drag source
 *    after pointerdown, on the first move past the drag threshold) and restored on
 *    pointerup/pointercancel/blur/unmount. Without this, pressing the scrubber and moving would
 *    start an HTML5 drag of the whole block and cancel the scrub.
 */
function useCanvasInteractionShield(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const shield = ref.current;
    if (!shield) return;

    let suppressed: HTMLElement[] = [];

    const controlFor = (target: EventTarget | null): Element | null => {
      if (!(target instanceof Element)) return null;
      const control = target.closest(CONTROL_SELECTOR);
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
  }, [ref]);
}

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
  useCanvasInteractionShield(shieldRef);

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

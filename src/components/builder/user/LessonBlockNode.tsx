"use client";

import React, { useEffect, useState } from 'react';
import { useNode } from '@craftjs/core';
import { Loader2, AlertCircle } from 'lucide-react';
import { useLessonBuilder } from '../LessonBuilderContext';
import { LessonBlockNodeSettings } from './LessonBlockNodeSettings';
import { BLOCK_TYPE_META, BlockCanvasPreview } from './LessonBlockPreviews';

export interface LessonBlockNodeProps {
  blockId: string | null;
  blockType: string;
  /** Template B pixel-accurate clone: some templates ship with a real value already attached
   *  (e.g. a specific YouTube video) rather than an empty block — used only in the
   *  create-on-first-render POST body below, never read again afterward (the real value
   *  lives in content_blocks once created, same as everything else this node touches). */
  presetVideoProvider?: string;
  presetFileUrl?: string;
}

// Lesson Builder Part 2 — Step 1 architecture decision: content_blocks stays the single
// source of truth for block data (video_provider, file_url, completion_rule, etc.) AND the
// thing Phase C's completion tracking / Next-button gate query directly by lesson_id. This
// canvas node carries ONLY `blockId` + `blockType` in its serialized Craft.js props — it's a
// thin positional wrapper, not a duplicate data store. Real data is fetched by blockId and
// edited through the exact same PATCH /api/lms/content-blocks/[id] route already built and
// verified in Phase B/C; nothing about that persistence path changes.
//
// Dragging a NEW block from the Blocks sidebar creates the node with blockId: null (Craft.js
// connectors.create needs a synchronous element — it can't await a DB insert mid-drag). On
// first render with blockId === null, this component creates the real content_blocks row via
// the existing POST /api/lms/content-blocks route, then writes the real id back into its own
// node props via actions.setProp — a real create-on-first-render pattern, not a placeholder
// that's silently never backed by a real row.
export const LessonBlockNode = (allProps: LessonBlockNodeProps & any) => {
  const { blockId, blockType, presetVideoProvider, presetFileUrl, dragRef, ...rest } = allProps;
  const {
    connectors: { connect, drag },
    actions: { setProp },
    selected,
  } = useNode((state) => ({ selected: state.events.selected }));
  const { lessonId } = useLessonBuilder();

  const [block, setBlock] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create-on-first-render for a freshly dragged block.
  useEffect(() => {
    if (blockId || !lessonId) return;
    let cancelled = false;
    (async () => {
      try {
        // Real thumbnail fetch at creation time (same route VideoBlockEditor's settings
        // panel already uses) so a preset video shows a real preview immediately, instead of
        // an empty canvas card until someone happens to open the settings panel.
        let presetContent: Record<string, any> = {};
        if (presetFileUrl && presetVideoProvider) {
          try {
            const thumbRes = await fetch(`/api/lms/video-thumbnail?provider=${presetVideoProvider}&url=${encodeURIComponent(presetFileUrl)}`);
            const thumbData = await thumbRes.json();
            if (!thumbData.unsupported && !thumbData.error) {
              presetContent = { thumbnail_url: thumbData.thumbnailUrl, title: thumbData.title, duration_seconds: thumbData.durationSeconds ?? null };
            }
          } catch {
            // Non-fatal — the block still creates with the real file_url; the settings panel
            // will retry the thumbnail fetch when opened.
          }
        }
        const res = await fetch('/api/lms/content-blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lesson_id: lessonId,
            type: blockType,
            content: presetContent,
            ...(presetVideoProvider ? { video_provider: presetVideoProvider } : {}),
            ...(presetFileUrl ? { file_url: presetFileUrl } : {}),
          }),
        });
        const dataJson = await res.json();
        if (cancelled) return;
        if (dataJson.error) {
          setError(dataJson.error);
        } else {
          setProp((props: LessonBlockNodeProps) => { props.blockId = dataJson.data.id; });
          setBlock(dataJson.data);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setError('Failed to create block');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, lessonId, blockType]);

  // Keep the canvas preview in sync with edits made in the settings panel (a separate mount).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.blockId === blockId) setBlock(detail.block);
    };
    window.addEventListener('lesson-block-updated', handler);
    return () => window.removeEventListener('lesson-block-updated', handler);
  }, [blockId]);

  // Load the real block for an already-created node (page load / reload).
  useEffect(() => {
    if (!blockId) return;
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/lms/content-blocks/${blockId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setBlock(data.data);
      })
      .catch(() => { if (!cancelled) setError('Failed to load block'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [blockId]);

  // Real behavior for ContentBox's quiz/assignment CTA (Part 3): scroll this block into view
  // when a colored-header callout elsewhere on the canvas points at the same blockId.
  const nodeRef = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.blockId === blockId && nodeRef.current) {
        nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    window.addEventListener('lesson-scroll-to-block', handler);
    return () => window.removeEventListener('lesson-scroll-to-block', handler);
  }, [blockId]);

  const meta = BLOCK_TYPE_META[blockType] || BLOCK_TYPE_META.rich_text;
  const Icon = meta.icon;

  return (
    <div
      {...rest}
      ref={(ref) => {
        if (ref) {
          nodeRef.current = ref;
          connect(drag(ref));
          if (dragRef) {
            if (typeof dragRef === 'function') dragRef(ref);
            else dragRef.current = ref;
          }
        }
      }}
      className={`relative rounded-xl border transition-all motion-reduce:transition-none ${
        selected ? 'border-dash-accent ring-2 ring-dash-accent/20' : 'border-dash-border hover:border-dash-accent/40'
      } bg-white overflow-hidden`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-dash-border bg-dash-surface/60">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${meta.color} text-white shrink-0`}>
          <Icon size={12} />
        </span>
        <span className="text-[11px] font-semibold !text-dash-text">{meta.label}</span>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[11px] !text-dash-textMuted">
            <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Loading block…
          </div>
        ) : error ? (
          <div className="flex items-center gap-1.5 py-4 text-[11px] text-red">
            <AlertCircle size={13} /> {error}
          </div>
        ) : block ? (
          <BlockCanvasPreview block={block} />
        ) : null}
      </div>
    </div>
  );
};

LessonBlockNode.craft = {
  displayName: 'LessonBlock',
  props: {
    blockId: null,
    blockType: 'rich_text',
  },
  related: {
    settings: LessonBlockNodeSettings,
  },
  rules: {
    canDrag: () => true,
    // Real bug found during the "Consistent Premium Settings Panels" pass: ElementProperties'
    // shared header trash button calls the generic Craft.js actions.delete(), which only
    // removes this canvas node — it never DELETEs the backing content_blocks row, orphaning it.
    // The settings panel's own delete button (LessonBlockNodeSettings) does both correctly, so
    // the generic header delete affordance is disabled here to force that single real path.
    canDelete: () => false,
  },
};

"use client";

import React, { useEffect, useState } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LessonBlockNodeProps } from './LessonBlockNode';
import { BLOCK_TYPE_META } from './LessonBlockPreviews';

// Reuses the exact same 10 real block-settings editors already built in Phase B/C — this is
// the "settings panel a user sees when they select that block" the master prompt requires be
// preserved verbatim, just now anchored to a canvas-selected Craft.js node instead of a modal
// list item. Same dispatch shape as LessonCreatorModal.tsx's renderBlockEditor switch.
import VideoBlockEditor from '@/app/courses/[id]/components/blocks/VideoBlockEditor';
import AudioBlockEditor from '@/app/courses/[id]/components/blocks/AudioBlockEditor';
import ReadingBlockEditor from '@/app/courses/[id]/components/blocks/ReadingBlockEditor';
import RichTextBlockEditor from '@/app/courses/[id]/components/blocks/RichTextBlockEditor';
import QuizBlockEditor from '@/app/courses/[id]/components/blocks/QuizBlockEditor';
import AssignmentBlockEditor from '@/app/courses/[id]/components/blocks/AssignmentBlockEditor';
import FlashcardsBlockEditor from '@/app/courses/[id]/components/blocks/FlashcardsBlockEditor';
import DownloadBlockEditor from '@/app/courses/[id]/components/blocks/DownloadBlockEditor';
import EmbedBlockEditor from '@/app/courses/[id]/components/blocks/EmbedBlockEditor';
import LiveSessionBlockEditor from '@/app/courses/[id]/components/blocks/LiveSessionBlockEditor';
import { useLessonBuilder } from '../LessonBuilderContext';

function renderEditor(block: any, courseId: string | null, onChange: (patch: any) => void) {
  switch (block.type) {
    case 'video': return <VideoBlockEditor block={block} onChange={onChange} />;
    case 'audio': return <AudioBlockEditor block={block} onChange={onChange} />;
    case 'rich_text': return <RichTextBlockEditor block={block} onChange={onChange} />;
    case 'reading':
    case 'slides': return <ReadingBlockEditor block={block} onChange={onChange} />;
    case 'quiz': return <QuizBlockEditor block={block} courseId={courseId || ''} />;
    case 'assignment': return <AssignmentBlockEditor block={block} onChange={onChange} />;
    case 'flashcards': return <FlashcardsBlockEditor block={block} onChange={onChange} />;
    case 'download': return <DownloadBlockEditor block={block} onChange={onChange} />;
    case 'embed': return <EmbedBlockEditor block={block} onChange={onChange} />;
    case 'live_session': return <LiveSessionBlockEditor block={block} onChange={onChange} />;
    default: return null;
  }
}

export const LessonBlockNodeSettings = () => {
  const {
    actions: { setProp },
    props,
    id: nodeId,
  } = useNode((node) => ({ props: node.data.props as LessonBlockNodeProps }));
  const { actions: editorActions } = useEditor();
  const { courseId } = useLessonBuilder();

  const [block, setBlock] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!props.blockId) return;
    setIsLoading(true);
    fetch(`/api/lms/content-blocks/${props.blockId}`)
      .then((res) => res.json())
      .then((data) => { if (!data.error) setBlock(data.data); })
      .finally(() => setIsLoading(false));
  }, [props.blockId]);

  const handleChange = async (patch: any) => {
    if (!props.blockId) return;
    // Optimistic local update so the settings UI (e.g. video live-preview thumbnail) reflects
    // the edit immediately, same as the old modal editor did.
    setBlock((prev: any) => ({ ...prev, ...patch, content: patch.content !== undefined ? patch.content : prev?.content }));
    try {
      const res = await fetch(`/api/lms/content-blocks/${props.blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const dataJson = await res.json();
      if (dataJson.error) {
        toast.error(dataJson.error);
      } else {
        // Real cross-component sync (canvas preview vs. this settings panel are separate
        // mounts) — same custom-event pattern already used elsewhere in the builder
        // (reload-custom-components in Sidebar.tsx), not a new mechanism.
        window.dispatchEvent(new CustomEvent('lesson-block-updated', { detail: { blockId: props.blockId, block: dataJson.data } }));
      }
    } catch {
      toast.error('Failed to save block');
    }
  };

  const handleDelete = async () => {
    if (!props.blockId || !window.confirm('Delete this block?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/lms/content-blocks/${props.blockId}`, { method: 'DELETE' });
      const dataJson = await res.json();
      if (dataJson.error) {
        toast.error(dataJson.error);
      } else {
        toast.success('Block deleted');
        editorActions.delete(nodeId);
      }
    } catch {
      toast.error('Failed to delete block');
    } finally {
      setIsDeleting(false);
    }
  };

  const meta = BLOCK_TYPE_META[props.blockType] || BLOCK_TYPE_META.rich_text;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold !text-dash-text">{meta.label} settings</h3>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-7 w-7 rounded-lg hover:bg-red/10 flex items-center justify-center text-red transition-colors disabled:opacity-60"
          title="Delete block"
        >
          {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>

      {isLoading || !block ? (
        <div className="flex items-center justify-center gap-2 py-8 text-[11px] !text-dash-textMuted">
          <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Loading…
        </div>
      ) : (
        renderEditor(block, courseId, handleChange)
      )}
    </div>
  );
};

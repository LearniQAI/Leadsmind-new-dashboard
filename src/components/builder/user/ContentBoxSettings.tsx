"use client";

import React, { useEffect, useState } from 'react';
import { useNode } from '@craftjs/core';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentBoxProps } from './ContentBox';
import ReadingBlockEditor from '@/app/courses/[id]/components/blocks/ReadingBlockEditor';
import DownloadBlockEditor from '@/app/courses/[id]/components/blocks/DownloadBlockEditor';
import QuizBlockEditor from '@/app/courses/[id]/components/blocks/QuizBlockEditor';
import AssignmentBlockEditor from '@/app/courses/[id]/components/blocks/AssignmentBlockEditor';
import { useLessonBuilder } from '../LessonBuilderContext';

function renderLinkedBlockEditor(block: any, courseId: string | null, onChange: (patch: any) => void) {
  switch (block.type) {
    case 'reading': return <ReadingBlockEditor block={block} onChange={onChange} />;
    case 'download': return <DownloadBlockEditor block={block} onChange={onChange} />;
    case 'quiz': return <QuizBlockEditor block={block} courseId={courseId || ''} />;
    case 'assignment': return <AssignmentBlockEditor block={block} onChange={onChange} />;
    default: return null;
  }
}

export const ContentBoxSettings = () => {
  const {
    actions: { setProp },
    props,
  } = useNode((node) => ({ props: node.data.props as ContentBoxProps }));
  const { courseId } = useLessonBuilder();

  const [block, setBlock] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!props.blockId) { setIsLoading(false); return; }
    setIsLoading(true);
    fetch(`/api/lms/content-blocks/${props.blockId}`)
      .then((res) => res.json())
      .then((data) => { if (!data.error) setBlock(data.data); })
      .finally(() => setIsLoading(false));
  }, [props.blockId]);

  const handleLinkedBlockChange = async (patch: any) => {
    if (!props.blockId) return;
    setBlock((prev: any) => ({ ...prev, ...patch }));
    try {
      const res = await fetch(`/api/lms/content-blocks/${props.blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else window.dispatchEvent(new CustomEvent('lesson-block-updated', { detail: { blockId: props.blockId, block: dataJson.data } }));
    } catch {
      toast.error('Failed to save linked block');
    }
  };

  return (
    <div className="p-5 space-y-5">
      <div className="space-y-3">
        <h3 className="text-[12px] font-bold !text-dash-text">Callout appearance</h3>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Header label</label>
          <input
            value={props.headerLabel}
            onChange={(e) => setProp((p: ContentBoxProps) => { p.headerLabel = e.target.value; })}
            className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Header color</label>
          <input
            type="color"
            value={props.headerColorHex}
            onChange={(e) => setProp((p: ContentBoxProps) => { p.headerColorHex = e.target.value; })}
            className="h-9 w-full rounded-lg border border-dash-border cursor-pointer"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Headline</label>
          <input
            value={props.headline}
            onChange={(e) => setProp((p: ContentBoxProps) => { p.headline = e.target.value; })}
            className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold !text-dash-textMuted block">Supporting text</label>
          <textarea
            value={props.body}
            onChange={(e) => setProp((p: ContentBoxProps) => { p.body = e.target.value; })}
            rows={3}
            className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold !text-dash-textMuted block">CTA button text</label>
          <input
            value={props.ctaText}
            onChange={(e) => setProp((p: ContentBoxProps) => { p.ctaText = e.target.value; })}
            className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-xs !text-dash-text outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="border-t border-dash-border pt-4 space-y-3">
        <h3 className="text-[12px] font-bold !text-dash-text capitalize">Linked {props.blockType} block</h3>
        {isLoading || !block ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[11px] !text-dash-textMuted">
            <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Loading…
          </div>
        ) : (
          renderLinkedBlockEditor(block, courseId, handleLinkedBlockChange)
        )}
      </div>
    </div>
  );
};

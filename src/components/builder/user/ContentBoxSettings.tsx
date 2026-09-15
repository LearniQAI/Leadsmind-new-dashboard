"use client";

import React, { useEffect, useState } from 'react';
import { useNode } from '@craftjs/core';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import type { ContentBoxProps } from './ContentBox';
import ReadingBlockEditor from '@/app/courses/[id]/components/blocks/ReadingBlockEditor';
import DownloadBlockEditor from '@/app/courses/[id]/components/blocks/DownloadBlockEditor';
import QuizBlockEditor from '@/app/courses/[id]/components/blocks/QuizBlockEditor';
import AssignmentBlockEditor from '@/app/courses/[id]/components/blocks/AssignmentBlockEditor';
import { useLessonBuilder } from '../LessonBuilderContext';
import { PropertyGroup } from '../inspector/primitives';
import { ColorPicker } from '../ColorPicker';

function renderLinkedBlockEditor(block: any, courseId: string | null, onChange: (patch: any) => void) {
  switch (block.type) {
    case 'reading': return <ReadingBlockEditor block={block} onChange={onChange} />;
    case 'download': return <DownloadBlockEditor block={block} onChange={onChange} />;
    case 'quiz': return <QuizBlockEditor block={block} courseId={courseId || ''} />;
    case 'assignment': return <AssignmentBlockEditor block={block} onChange={onChange} />;
    default: return null;
  }
}

// Consistent Premium Settings Panels pass — restyled onto the shared PropertyGroup (section
// titles) and ColorPicker (the same real hex-swatch-picker used by TypographyControl et al,
// replacing two raw <input type="color">) primitives. The real linked-block wiring below
// (fetch/PATCH content_blocks, the lesson-block-updated sync event, delegating to the actual
// ReadingBlockEditor/DownloadBlockEditor/QuizBlockEditor/AssignmentBlockEditor) is completely
// untouched — this is a visual pass only, per the master prompt's own repeated instruction.
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
      <PropertyGroup title="Callout appearance">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700 block">Header label</Label>
          <input
            value={props.headerLabel}
            onChange={(e) => setProp((p: ContentBoxProps) => { p.headerLabel = e.target.value; })}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-300"
          />
        </div>

        <ColorPicker
          label="Header color"
          value={props.headerColorHex}
          onChange={(val) => setProp((p: ContentBoxProps) => { p.headerColorHex = val; })}
        />

        <ColorPicker
          label="CTA button color"
          value={props.ctaColorHex || props.headerColorHex}
          onChange={(val) => setProp((p: ContentBoxProps) => { p.ctaColorHex = val; })}
        />

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700 block">Headline (supports basic HTML — &lt;br/&gt;, &lt;em&gt;, &lt;strong&gt;)</Label>
          <input
            value={props.headline}
            onChange={(e) => setProp((p: ContentBoxProps) => { p.headline = e.target.value; })}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-300"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700 block">Supporting text (supports basic HTML)</Label>
          <textarea
            value={props.body}
            onChange={(e) => setProp((p: ContentBoxProps) => { p.body = e.target.value; })}
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-300 resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700 block">CTA button text</Label>
          <input
            value={props.ctaText}
            onChange={(e) => setProp((p: ContentBoxProps) => { p.ctaText = e.target.value; })}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-300"
          />
        </div>
      </PropertyGroup>

      <div className="border-t border-slate-200 pt-4">
        <PropertyGroup title={`Linked ${props.blockType} block`}>
          {isLoading || !block ? (
            <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-slate-500">
              <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Loading…
            </div>
          ) : (
            renderLinkedBlockEditor(block, courseId, handleLinkedBlockChange)
          )}
        </PropertyGroup>
      </div>
    </div>
  );
};

"use client";

import React, { useEffect, useState } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { ArrowRight, FileText, Download, CheckSquare, FileEdit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLessonBuilder } from '../LessonBuilderContext';
import { ContentBoxSettings } from './ContentBoxSettings';
import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';

export interface ContentBoxProps {
  headerLabel: string;
  headerColorHex: string;
  /** CTA button fill — real, separate control from headerColorHex (Template B's reference
   *  pairs an orange-red header with a blue button, confirmed via the reference screenshot).
   *  Defaults to headerColorHex when unset, so existing ContentBox instances/templates that
   *  never set it keep their single-color look unchanged. */
  ctaColorHex?: string;
  headline: string;
  body: string;
  ctaText: string;
  blockId: string | null;
  blockType: 'reading' | 'download' | 'quiz' | 'assignment';
  useThemeFont?: boolean;
}

const ICONS: Record<string, any> = { reading: FileText, download: Download, quiz: CheckSquare, assignment: FileEdit };

// The "colored-header Content box" callout (Systeme-parity Master Prompt, Part 3, Step 1.4) —
// a real, reusable component, not a one-off hack for a single template: a solid-color header
// bar + all-caps label, a white body with headline/supporting text, and a real CTA wired to a
// real content_blocks row (reading/download/quiz/assignment) via the exact same
// create-on-first-render + GET/PATCH pattern LessonBlockNode uses (Part 2) — genuine reuse,
// not a second, parallel block-data mechanism.
export const ContentBox = (allProps: ContentBoxProps & any) => {
  const { headerLabel, headerColorHex, ctaColorHex, headline, body, ctaText, blockId, blockType, useThemeFont, dragRef, ...rest } = allProps;
  const {
    connectors: { connect, drag },
    actions: { setProp },
    selected,
  } = useNode((state) => ({ selected: state.events.selected }));
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const { lessonId, theme } = useLessonBuilder();

  const [block, setBlock] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (blockId || !lessonId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/lms/content-blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lesson_id: lessonId, type: blockType, content: {} }),
        });
        const dataJson = await res.json();
        if (cancelled) return;
        if (!dataJson.error) {
          setProp((props: ContentBoxProps) => { props.blockId = dataJson.data.id; });
          setBlock(dataJson.data);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, lessonId, blockType]);

  useEffect(() => {
    if (!blockId) return;
    let cancelled = false;
    fetch(`/api/lms/content-blocks/${blockId}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled && !data.error) setBlock(data.data); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [blockId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.blockId === blockId) setBlock(detail.block);
    };
    window.addEventListener('lesson-block-updated', handler);
    return () => window.removeEventListener('lesson-block-updated', handler);
  }, [blockId]);

  const Icon = ICONS[blockType] || FileText;
  const headingFontClass = useThemeFont && theme ? theme.headingFontClass : '';
  const bodyFontClass = useThemeFont && theme ? theme.bodyFontClass : '';

  const handleCtaClick = (e: React.MouseEvent) => {
    if (enabled) return; // In-editor: clicking selects the node, doesn't fire the real action.
    e.preventDefault();
    if ((blockType === 'reading' || blockType === 'download') && block?.file_url) {
      window.open(block.file_url, '_blank', 'noopener,noreferrer');
    } else if (blockType === 'quiz' || blockType === 'assignment') {
      // Real behavior, not decorative: jump to the matching block elsewhere on the canvas if
      // one is placed there, rather than pretending to navigate somewhere real.
      window.dispatchEvent(new CustomEvent('lesson-scroll-to-block', { detail: { blockId } }));
    } else {
      toast.info('This callout is not linked to a configured block yet.');
    }
  };

  return (
    <div
      {...rest}
      ref={(ref) => {
        if (ref) {
          connect(drag(ref));
          if (dragRef) {
            if (typeof dragRef === 'function') dragRef(ref);
            else dragRef.current = ref;
          }
        }
      }}
      className={`w-full rounded-2xl border overflow-hidden transition-all ${
        selected ? 'border-dash-accent ring-2 ring-dash-accent/20' : 'border-dash-border'
      }`}
    >
      <div
        className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white"
        style={{ backgroundColor: headerColorHex }}
      >
        {headerLabel}
      </div>
      <div className="bg-white px-6 py-8 text-center space-y-3">
        {/* headline/body render as real sanitized HTML (same mechanism as Heading/Paragraph's
            non-edit-mode render) rather than raw text — needed for real inline bold/italic/
            line-break spans within these fields, confirmed required by Template B's reference. */}
        <h3
          className={`text-xl font-bold text-[#111827] ${headingFontClass}`}
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(headline) }}
        />
        <div
          className={`text-[14px] text-[#4b5563] leading-relaxed max-w-lg mx-auto ${bodyFontClass}`}
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(body) }}
        />
        <div className="pt-2">
          <button
            onClick={handleCtaClick}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-bold text-white transition-transform active:scale-[0.98]"
            style={{ backgroundColor: ctaColorHex || headerColorHex }}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
            {ctaText}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

ContentBox.craft = {
  displayName: 'ContentBox',
  props: {
    headerLabel: 'READING MATERIAL',
    headerColorHex: '#1359FF',
    ctaColorHex: '#1359FF',
    headline: 'Dive deeper into this topic',
    body: 'A short line explaining what this resource covers and why it is worth opening.',
    ctaText: 'Open resource',
    blockId: null,
    blockType: 'reading',
    useThemeFont: false,
  },
  related: {
    settings: ContentBoxSettings,
  },
  rules: {
    canDrag: () => true,
  },
};

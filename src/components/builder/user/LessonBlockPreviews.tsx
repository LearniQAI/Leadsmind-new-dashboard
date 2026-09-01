"use client";

import React from 'react';
import {
  Video, Headphones, FileText, Type, CheckSquare, FileEdit, Layers,
  Download, Presentation, Code2, Radio, PlayCircle, FileCode2,
} from 'lucide-react';
import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';

export const BLOCK_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  video: { label: 'Video', icon: Video, color: 'bg-blue-500' },
  audio: { label: 'Audio', icon: Headphones, color: 'bg-cyan-500' },
  reading: { label: 'Reading (PDF)', icon: FileText, color: 'bg-purple-500' },
  rich_text: { label: 'Rich text', icon: Type, color: 'bg-slate-500' },
  quiz: { label: 'Quiz', icon: CheckSquare, color: 'bg-orange-500' },
  assignment: { label: 'Assignment', icon: FileEdit, color: 'bg-pink-500' },
  flashcards: { label: 'Flashcard set', icon: Layers, color: 'bg-emerald-500' },
  download: { label: 'Downloadable resource', icon: Download, color: 'bg-slate-500' },
  slides: { label: 'Presentation slides', icon: Presentation, color: 'bg-blue-500' },
  embed: { label: 'Embed', icon: Code2, color: 'bg-indigo-500' },
  live_session: { label: 'Live session', icon: Radio, color: 'bg-red-500' },
  html_code: { label: 'HTML code', icon: FileCode2, color: 'bg-slate-600' },
};

// Real, honest canvas-preview renderer per block type — same real field names verified in
// LessonPreviewModal.tsx (block.file_url, block.content.instructions, etc.), reused here
// rather than re-derived. This is what shows on the canvas when the block isn't selected;
// the full real editor (VideoBlockEditor etc.) still appears in the settings panel when it is.
export function BlockCanvasPreview({ block }: { block: any }) {
  switch (block.type) {
    case 'video':
      return block.content?.thumbnail_url ? (
        <div
          className="relative rounded-lg overflow-hidden aspect-video bg-black bg-cover bg-center"
          style={{ backgroundImage: `url(${block.content.thumbnail_url})` }}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <PlayCircle size={28} className="text-white" />
          </div>
        </div>
      ) : (
        <EmptyPreview label="No video linked yet" />
      );
    case 'audio':
      return block.file_url ? (
        <div className="text-[11px] !text-dash-textMuted truncate">🎧 {block.file_url}</div>
      ) : (
        <EmptyPreview label="No audio file yet" />
      );
    case 'reading':
    case 'slides':
      return block.file_url ? (
        <div className="text-[11px] !text-dash-textMuted truncate">📄 {block.file_url}</div>
      ) : (
        <EmptyPreview label="No file linked yet" />
      );
    case 'rich_text':
      return block.content?.text ? (
        <div
          className="text-[12px] !text-dash-text prose prose-sm max-w-none line-clamp-4"
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(block.content.text) }}
        />
      ) : (
        <EmptyPreview label="Empty rich text block" />
      );
    case 'quiz':
      return <div className="text-[11px] !text-dash-textMuted">Quiz block — open the Quiz Workbench in settings.</div>;
    case 'assignment':
      return block.content?.instructions ? (
        <div className="text-[11px] !text-dash-textMuted line-clamp-3 whitespace-pre-line">{block.content.instructions}</div>
      ) : (
        <EmptyPreview label="No instructions yet" />
      );
    case 'flashcards':
      return <div className="text-[11px] !text-dash-textMuted">{(block.content?.flashcards || []).length} flashcard(s)</div>;
    case 'download':
      return block.file_url ? (
        <div className="text-[11px] !text-dash-textMuted truncate">⬇ {block.content?.file_name || block.file_url}</div>
      ) : (
        <EmptyPreview label="No file attached yet" />
      );
    case 'embed':
      return block.content?.embed_url ? (
        <div className="text-[11px] !text-dash-textMuted font-mono truncate">{block.content.embed_url}</div>
      ) : (
        <EmptyPreview label="No embed URL yet" />
      );
    case 'html_code':
      return block.content?.html?.trim() ? (
        <div className="text-[11px] !text-dash-textMuted font-mono line-clamp-3 whitespace-pre-wrap break-all">
          {block.content.html.slice(0, 240)}
        </div>
      ) : (
        <EmptyPreview label="No HTML yet" />
      );
    case 'live_session':
      return block.file_url ? (
        <div className="text-[11px] !text-dash-textMuted truncate">📅 {block.file_url}</div>
      ) : (
        <EmptyPreview label="No meeting link yet" />
      );
    default:
      return <EmptyPreview label="Unconfigured block" />;
  }
}

function EmptyPreview({ label }: { label: string }) {
  return (
    <div className="text-[11px] !text-dash-textMuted italic py-2 text-center border border-dashed border-dash-border rounded-lg">
      {label} — click to configure
    </div>
  );
}

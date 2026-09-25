'use client';

import React from 'react';
import Link from 'next/link';
import { CanvasLessonImage } from './CanvasLessonImage';
import { CanvasItemSpacing } from './CanvasItemSpacing';
import { CANVAS_INLINE_HTML, canvasBlockTypeProps, useCanvasHeadingFonts } from './canvasHeadingType';
import { CanvasDivider } from './CanvasDivider';
import { CanvasContentBox, contentBoxCta } from './CanvasContentBox';
import { HEADING_BASE_SIZES } from '@/lib/builder/textBlockStyle';
import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';
import VideoPlayer from '@/app/student/courses/[id]/components/VideoPlayer';
import { driveVideoUrls } from '@/lib/lms/video/driveVideoUrls';
import { Lock, ArrowRight, Eye, PlayCircle, FileText, Download as DownloadIcon } from 'lucide-react';

// Course Start Method 3 (free preview lessons, then paywall) — the real "no enrollment at
// all" render path, reached from student/courses/[id]/page.tsx's own server-side gate.
// Deliberately separate from StudentPlayerClient (the real, full, enrolled-student player)
// rather than retrofitted into it: this only ever receives ONE real lesson's content (the
// one the server already verified is_preview === true) or none at all, has no contactId, and
// must never write progress/completion — a smaller, purpose-built surface keeps that
// guarantee obvious rather than threading a "previewMode" flag through 1300+ lines of a
// component built around a real, authenticated student session (heartbeats, block-completion
// writes, quiz/assignment/flashcard state). Interactive block types that inherently need a
// real contactId (quiz, assignment, flashcards) are shown as "enroll to access" rather than
// faked into working anonymously.

interface PreviewLessonClientProps {
  course: any;
  modules: any[];
  lessons: any[]; // lightweight metadata only: id, title, module_id, position, is_preview
  activeLesson: any | null; // full content (contentBlocks/canvasItems) when previewable, else null
  pricing: { headline: string; qualifier: string; cta: string };
  isSignedIn: boolean;
}

function PreviewBlock({ block }: { block: any }) {
  switch (block.type) {
    case 'video': {
      // Same player as the enrolled view, but isAlreadyCompleted keeps it from ever tracking or
      // writing completion (no contactId exists here). This used to be a bare <video src=file_url>,
      // which can't play a YouTube/Vimeo page URL — every embed-provider video was a dead
      // player on the free-preview page. A Drive video streams through the gated proxy, which
      // admits free-preview lessons (see resolveVideoAccess).
      const drive = driveVideoUrls(block);
      if (drive) {
        return (
          <VideoPlayer videoUrl={drive.src} poster={drive.poster} forceDirect onComplete={() => {}} isAlreadyCompleted lowBandwidthMode={false} />
        );
      }
      return block.video_provider !== 'gdrive' && block.file_url ? (
        <VideoPlayer videoUrl={block.file_url} onComplete={() => {}} isAlreadyCompleted lowBandwidthMode={false} />
      ) : null;
    }
    case 'rich_text':
      return block.content?.text ? (
        <div
          className="prose prose-slate max-w-none text-[14px] leading-relaxed !text-dash-text"
          dangerouslySetInnerHTML={{ __html: block.content.text }}
        />
      ) : null;
    case 'html_code':
      return block.content?.html ? (
        <div className="rounded-xl border border-dash-border overflow-hidden">
          <iframe srcDoc={block.content.html} className="w-full min-h-[300px]" sandbox="allow-scripts" />
        </div>
      ) : null;
    case 'download':
      return block.file_url ? (
        <a
          href={block.file_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-white px-4 py-2 text-[12px] font-semibold !text-dash-text hover:bg-dash-surface"
        >
          <DownloadIcon size={14} /> Download attachment
        </a>
      ) : null;
    case 'embed':
      return block.content?.embed_url ? (
        <div className="aspect-video overflow-hidden rounded-xl border border-dash-border bg-black">
          <iframe src={block.content.embed_url} className="h-full w-full" allowFullScreen />
        </div>
      ) : null;
    case 'reading':
    case 'slides':
      return block.file_url ? (
        <a
          href={block.file_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-white px-4 py-2 text-[12px] font-semibold !text-dash-text hover:bg-dash-surface"
        >
          <FileText size={14} /> {block.type === 'slides' ? 'Open slides' : 'Open reading'}
        </a>
      ) : null;
    case 'quiz':
    case 'assignment':
    case 'flashcards':
      return (
        <div className="rounded-xl border border-dash-border bg-dash-surface px-4 py-3 text-[12px] !text-dash-textMuted">
          This interactive content requires enrollment to access.
        </div>
      );
    default:
      return null;
  }
}

export default function PreviewLessonClient({
  course,
  modules,
  lessons,
  activeLesson,
  pricing,
}: PreviewLessonClientProps) {
  const contentBlocksById = new Map((activeLesson?.contentBlocks || []).map((b: any) => [b.id, b]));

  useCanvasHeadingFonts(activeLesson?.canvasItems);

  const renderPreviewCanvasItem = (item: any, idx: number): React.ReactNode => {
    // Same typography as the student view (canvasBlockTypeProps: the builder's size, weight,
    // colour, line height, letter spacing, font), and sanitised like it — this page is public.
    if (item.kind === 'heading') {
      const type = canvasBlockTypeProps(item);
      return (
        <div
          key={idx}
          role="heading"
          aria-level={Number(String(item.level).replace('h', '')) || 2}
          className={`font-display font-bold leading-tight tracking-tight ${type.setsColor ? '' : '!text-dash-text'} ${HEADING_BASE_SIZES[item.level] || HEADING_BASE_SIZES.h2} ${CANVAS_INLINE_HTML} ${type.className}`}
          style={{ textAlign: item.align, ...type.style }}
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(item.html) }}
        />
      );
    }
    if (item.kind === 'richtext') {
      const type = canvasBlockTypeProps(item);
      return (
        <div
          key={idx}
          className={`text-[15px] leading-relaxed ${type.setsColor ? '' : '!text-dash-text'} ${CANVAS_INLINE_HTML} [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_ol]:list-decimal [&_ol]:pl-5 ${type.className}`}
          style={{ textAlign: item.align, ...type.style }}
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(item.html) }}
        />
      );
    }
    if (item.kind === 'image') {
      return <CanvasLessonImage key={idx} item={item} />;
    }
    if (item.kind === 'divider') {
      return <CanvasDivider key={idx} item={item} />;
    }
    if (item.kind === 'block') {
      const block = contentBlocksById.get(item.blockId);
      return block ? <PreviewBlock key={idx} block={block} /> : null;
    }
    if (item.kind === 'contentbox') {
      // The builder's ContentBox: header colour + label, headline/body as real (sanitised) HTML
      // — the body used to print its <p> tags as text — and the CTA. On this public page the CTA
      // opens a reading/download file like PreviewBlock does; quiz/assignment need enrolment.
      const block: any = item.blockId ? contentBlocksById.get(item.blockId) : null;
      return <CanvasContentBox key={idx} item={item} cta={contentBoxCta(block, 'preview')} />;
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-dash-accent/20 bg-dash-accent/5 px-4 py-3 text-[13px] !text-dash-text">
        <Eye size={16} className="shrink-0 !text-dash-accent" />
        <span>
          You're previewing <strong>{course.title}</strong> without enrolling.{' '}
          <Link href={`/checkout/${course.id}`} className="font-semibold underline !text-dash-accent">
            Enroll to unlock everything
          </Link>
          .
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Syllabus — every lesson listed for real navigation context; only is_preview ones
            are genuinely open, everything else routes back through this same server gate
            and correctly renders the paywall instead. */}
        <aside className="space-y-1 rounded-2xl border border-dash-border bg-white p-3">
          {modules.map((mod: any) => (
            <div key={mod.id} className="mb-2">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide !text-dash-textMuted">
                {mod.title}
              </div>
              {lessons
                .filter((l: any) => l.module_id === mod.id)
                .map((l: any) => (
                  <Link
                    key={l.id}
                    href={`/student/courses/${course.id}?lessonId=${l.id}`}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[12.5px] transition-colors ${
                      activeLesson?.id === l.id
                        ? 'bg-dash-accent/10 font-semibold !text-dash-accent'
                        : '!text-dash-text hover:bg-dash-surface'
                    }`}
                  >
                    <span className="truncate">{l.title}</span>
                    {l.is_preview ? (
                      <Eye size={13} className="shrink-0 !text-dash-textMuted" />
                    ) : (
                      <Lock size={13} className="shrink-0 !text-dash-textMuted" />
                    )}
                  </Link>
                ))}
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="rounded-2xl border border-dash-border bg-white p-6 md:p-8">
          {activeLesson ? (
            <div className="space-y-6">
              <h1 className="font-display text-xl font-bold !text-dash-text">{activeLesson.title}</h1>
              <div className="space-y-5">
                {activeLesson.canvasItems && activeLesson.canvasItems.length > 0
                  ? activeLesson.canvasItems.map((item: any, idx: number) => (
                      <CanvasItemSpacing key={idx} spacing={item.spacing}>{renderPreviewCanvasItem(item, idx)}</CanvasItemSpacing>
                    ))
                  : (activeLesson.contentBlocks || []).map((block: any) => (
                      <PreviewBlock key={block.id} block={block} />
                    ))}
              </div>

              <div className="rounded-xl border border-dash-border bg-dash-surface p-4 text-[12px] !text-dash-textMuted">
                This is a free preview lesson — your progress isn't tracked until you enroll.
              </div>
            </div>
          ) : (
            // Real paywall — requested lesson is not free. Real pricing, real checkout route.
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-dash-accent/10 text-dash-accent">
                <Lock size={26} />
              </div>
              <h2 className="font-display text-lg font-bold !text-dash-text">This lesson is locked</h2>
              <p className="max-w-sm text-[13px] !text-dash-textMuted">
                Enroll in <strong className="!text-dash-text">{course.title}</strong> to unlock this lesson and the rest of the course.
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold !text-dash-text">{pricing.headline}</span>
                {pricing.qualifier && <span className="text-[12px] !text-dash-textMuted">{pricing.qualifier}</span>}
              </div>
              <Link
                href={`/checkout/${course.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-dash-accent px-6 py-3 text-[13px] font-semibold text-white hover:bg-dash-accent/90"
              >
                <PlayCircle size={16} /> {pricing.cta} <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

import React from 'react';
import { ArrowRight, CheckSquare, Download, FileEdit, FileText } from 'lucide-react';
import { sanitizeRichTextHtml } from '@/lib/security/sanitizeHtml';
import type { LessonCanvasItem } from '@/lib/lms/flattenLessonCanvas';

type ContentBoxItem = Extract<LessonCanvasItem, { kind: 'contentbox' }>;

/** CTA icon per linked block type — shared with the builder's ContentBox. */
export const CONTENT_BOX_ICONS: Record<string, React.ElementType> = {
  reading: FileText,
  download: Download,
  quiz: CheckSquare,
  assignment: FileEdit,
};

/** What pressing the CTA does — decided by the surface (student player / public preview). */
export type ContentBoxCta =
  | { kind: 'button'; onClick: () => void }
  | { kind: 'link'; href: string; newTab?: boolean }
  | { kind: 'disabled'; reason: string };

export const CTA_UNAVAILABLE = "This resource isn't available yet.";

/**
 * What the CTA does for a ContentBox's linked block, on each surface:
 *  - student: the linked block's own real action, the same one its block body used to offer —
 *    reading/slides open the reader AND record completion (the completion gate counts this
 *    block); download opens the file; quiz goes to the quiz; assignment reveals the
 *    submission panel under the button.
 *  - preview (public, not enrolled): files open like PreviewBlock; quiz/assignment need enrolment.
 * Anything not wired to a usable block is shown, disabled, with the reason.
 */
export function contentBoxCta(
  block: { id: string; type: string; file_url?: string | null } | null | undefined,
  surface: 'student' | 'preview',
  actions: { openReading?: (id: string) => void; togglePanel?: (id: string) => void; quizHref?: string } = {},
): ContentBoxCta {
  if (!block) return { kind: 'disabled', reason: CTA_UNAVAILABLE };
  const hasFile = !!block.file_url;
  if ((block.type === 'reading' || block.type === 'slides') && hasFile) {
    return surface === 'student' && actions.openReading
      ? { kind: 'button', onClick: () => actions.openReading!(block.id) }
      : { kind: 'link', href: block.file_url!, newTab: true };
  }
  if (block.type === 'download' && hasFile) return { kind: 'link', href: block.file_url!, newTab: true };
  if (block.type === 'quiz' || block.type === 'assignment') {
    if (surface === 'preview') return { kind: 'disabled', reason: 'Enrol in the course to access this.' };
    if (block.type === 'quiz' && actions.quizHref) return { kind: 'link', href: actions.quizHref };
    if (block.type === 'assignment' && actions.togglePanel) return { kind: 'button', onClick: () => actions.togglePanel!(block.id) };
  }
  return { kind: 'disabled', reason: CTA_UNAVAILABLE };
}

const CTA_CLS =
  'inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[13px] font-bold !text-white transition-transform active:scale-[0.98]';

/**
 * Student-facing ContentBox, matching the builder's (components/builder/user/ContentBox.tsx):
 * coloured header bar + label, centred headline and body, and the configured CTA button in its
 * own colour. Inner <p>s inherit the body's size / line height / colour instead of taking the
 * global template `p` rule (14px / grey / 15px margin). `children` renders under the CTA (e.g.
 * an assignment's submission panel once the CTA is pressed).
 */
export function CanvasContentBox({ item, cta, children }: { item: ContentBoxItem; cta: ContentBoxCta; children?: React.ReactNode }) {
  const Icon = CONTENT_BOX_ICONS[item.blockType] || FileText;
  const content = (
    <>
      <Icon size={14} aria-hidden />
      {item.ctaText}
      <ArrowRight size={14} aria-hidden />
    </>
  );
  const style = { backgroundColor: item.ctaColorHex };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-dash-border">
      <div
        className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] !text-white"
        style={{ backgroundColor: item.headerColorHex }}
      >
        {item.headerLabel}
      </div>
      <div className="space-y-3 bg-white px-6 py-8 text-center">
        {item.headline && (
          <h3
            className="text-xl font-bold !text-[#111827]"
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(item.headline) }}
          />
        )}
        {item.body && (
          <div
            className="mx-auto max-w-lg text-[14px] leading-relaxed !text-[#4b5563] [&_p]:![font-size:inherit] [&_p]:![line-height:inherit] [&_p]:![color:inherit] [&_p]:my-0 [&_p+p]:mt-2"
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(item.body) }}
          />
        )}
        <div className="pt-2">
          {cta.kind === 'link' ? (
            <a href={cta.href} {...(cta.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={CTA_CLS} style={style}>
              {content}
            </a>
          ) : cta.kind === 'button' ? (
            <button type="button" onClick={cta.onClick} className={CTA_CLS} style={style}>
              {content}
            </button>
          ) : (
            <button type="button" disabled aria-disabled title={cta.reason} className={`${CTA_CLS} cursor-not-allowed opacity-60`} style={style}>
              {content}
            </button>
          )}
          {cta.kind === 'disabled' && <p className="mt-2 text-[11px] !text-dash-textMuted">{cta.reason}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

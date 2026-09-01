"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Loader2,
  FileText,
  Download,
  Video as VideoIcon,
  Headphones,
  HelpCircle,
  Layers,
  ExternalLink,
} from "lucide-react";
import VideoPlayer from "@/app/student/courses/[id]/components/VideoPlayer";
import { VoiceNotePlayer } from "@/components/common/VoiceNotePlayer";
import { sanitizeRichTextHtml } from "@/lib/security/sanitizeHtml";
import { SandboxedHtml } from "@/components/lms/SandboxedHtml";

interface LessonPreviewModalProps {
  lessonId: string;
  lessonTitle: string;
  /** Full mapped lesson row — lets the preview also render legacy single-type lessons
   *  (video / pdf / audio / text) that have no content_blocks. */
  lesson?: any;
  onClose: () => void;
}

/** Local copy of the student player's PDF-embed resolver (kept private there). */
function embedPdfUrl(url: string): string {
  if (!url) return "";
  if (url.includes("google.com")) {
    const m = url.match(/\/d\/([^/]+)/);
    if (m?.[1]) return `https://drive.google.com/file/d/${m[1].split(/[/?]/)[0]}/preview`;
    try {
      const id = new URL(url).searchParams.get("id");
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    } catch {
      /* noop */
    }
  }
  if (url.includes("dropbox.com")) return url.replace("dl=0", "raw=1").replace("dl=1", "raw=1");
  if (url.includes("box.com/s/")) return url.replace("/s/", "/embed/s/");
  return url;
}

function BlockTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted">
      {children}
    </div>
  );
}

function PdfPreview({ url }: { url: string }) {
  return (
    <div className="space-y-2">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-dash-border bg-dash-surface">
        <iframe src={embedPdfUrl(url)} title="PDF preview" className="h-full w-full border-0" />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sky-600 hover:underline"
      >
        <ExternalLink size={13} /> Open in new tab
      </a>
    </div>
  );
}

export default function LessonPreviewModal({
  lessonId,
  lessonTitle,
  lesson,
  onClose,
}: LessonPreviewModalProps) {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/lms/content-blocks?lessonId=${lessonId}`)
      .then((res) => res.json())
      .then((data) => setBlocks(data.data || []))
      .finally(() => setIsLoading(false));
  }, [lessonId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const legacyType: string = (lesson?.lesson_type || "").toLowerCase();
  const legacyVideo = lesson?.content?.video_url || lesson?.video_url || "";
  const legacyText =
    typeof lesson?.content === "string" ? lesson.content : lesson?.content?.text || "";
  const flashcards: { front: string; back: string }[] = lesson?.metadata?.flashcards || [];

  const renderLegacy = () => {
    switch (legacyType) {
      case "video":
        return legacyVideo ? (
          <VideoPlayer videoUrl={legacyVideo} onComplete={() => {}} isAlreadyCompleted lowBandwidthMode={false} />
        ) : (
          <Empty icon={<VideoIcon />} label="No video URL set on this lesson yet." />
        );
      case "pdf":
      case "reading":
      case "slides":
        return legacyVideo ? (
          <PdfPreview url={legacyVideo} />
        ) : (
          <Empty icon={<FileText />} label="No document attached to this lesson yet." />
        );
      case "audio":
        return legacyVideo ? (
          <div className="space-y-3">
            <VoiceNotePlayer audioUrl={legacyVideo} theme="light" isAlreadyCompleted />
            {legacyText && (
              <div className="max-h-[240px] overflow-y-auto whitespace-pre-line rounded-xl border border-dash-border bg-dash-surface/60 p-3.5 text-[13px] leading-relaxed !text-dash-text">
                {legacyText}
              </div>
            )}
          </div>
        ) : (
          <Empty icon={<Headphones />} label="No audio file attached yet." />
        );
      case "quiz":
        return (
          <Empty
            icon={<HelpCircle />}
            label="This is a quiz lesson — open the Quiz Workbench to preview its questions."
          />
        );
      case "flashcards":
        return flashcards.length ? (
          <div className="space-y-2">
            {flashcards.map((c, i) => (
              <div key={i} className="rounded-xl border border-dash-border bg-white p-3 text-[13px]">
                <div className="font-semibold !text-dash-text">{c.front || "—"}</div>
                <div className="mt-1 !text-dash-textMuted">{c.back || "—"}</div>
              </div>
            ))}
          </div>
        ) : (
          <Empty icon={<Layers />} label="No flashcards in this deck yet." />
        );
      case "live_session":
        return legacyVideo ? (
          <a
            href={legacyVideo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-sky-600 hover:underline"
          >
            <ExternalLink size={14} /> Join link
          </a>
        ) : (
          <Empty icon={<VideoIcon />} label="No meeting link set yet." />
        );
      default:
        return legacyText ? (
          <div
            className="prose prose-slate max-w-none text-[14px] leading-relaxed !text-dash-text"
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(legacyText) }}
          />
        ) : (
          <Empty icon={<FileText />} label="This lesson has no content yet." />
        );
    }
  };

  const hasBlocks = blocks.length > 0;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-5">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
              Preview · student view
            </div>
            <h2 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] !text-dash-text">
              {lesson?.title || lessonTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[12px] !text-dash-textMuted">
              <Loader2 size={14} className="animate-spin" /> Loading preview…
            </div>
          ) : hasBlocks ? (
            blocks.map((block, i) => (
              <div key={block.id} className="rounded-xl border border-dash-border bg-white p-4">
                <BlockTag>
                  Block {i + 1} · {block.type.replace("_", " ")}
                </BlockTag>
                {block.type === "video" && block.file_url && (
                  <VideoPlayer videoUrl={block.file_url} onComplete={() => {}} isAlreadyCompleted lowBandwidthMode={false} />
                )}
                {block.type === "audio" && block.content?.mode === "embed" && block.content?.embed_html && (
                  <SandboxedHtml
                    html={block.content.embed_html}
                    className="h-[180px] overflow-hidden rounded-xl border border-dash-border bg-dash-surface"
                    title="Audio embed"
                  />
                )}
                {block.type === "audio" && block.content?.mode !== "embed" && block.file_url && (
                  <VoiceNotePlayer
                    audioUrl={block.file_url}
                    waveformBars={block.content?.waveform_bars}
                    theme="light"
                    isAlreadyCompleted
                  />
                )}
                {(block.type === "reading" || block.type === "slides") && block.file_url && (
                  <PdfPreview url={block.file_url} />
                )}
                {block.type === "rich_text" && block.content?.text && (
                  <div
                    className="prose prose-slate max-w-none text-[14px] leading-relaxed !text-dash-text"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(block.content.text) }}
                  />
                )}
                {block.type === "download" && block.file_url && (
                  <a
                    href={block.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sky-600 hover:underline"
                  >
                    <Download size={13} /> Download resource
                  </a>
                )}
                {block.type === "quiz" && (
                  <Empty icon={<HelpCircle />} label="Quiz block — open the Quiz Workbench to preview questions." />
                )}
                {block.type === "assignment" && block.content?.instructions && (
                  <div className="whitespace-pre-line text-[13px] leading-relaxed !text-dash-text">
                    {block.content.instructions}
                  </div>
                )}
                {block.type === "flashcards" && (
                  <div className="text-[13px] !text-dash-textMuted">
                    {(block.content?.flashcards || []).length} flashcard(s) in this deck.
                  </div>
                )}
                {block.type === "embed" && block.content?.embed_url && (
                  <div className="truncate font-mono text-[12px] !text-dash-textMuted">
                    {block.content.embed_url}
                  </div>
                )}
                {block.type === "html_code" && block.content?.html && (
                  <SandboxedHtml
                    html={block.content.html}
                    className="h-[360px] overflow-hidden rounded-xl border border-dash-border bg-white"
                    title="HTML block preview"
                  />
                )}
                {block.type === "live_session" && block.file_url && (
                  <a
                    href={block.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-semibold text-sky-600 hover:underline"
                  >
                    Meeting link
                  </a>
                )}
              </div>
            ))
          ) : lesson ? (
            <div className="rounded-xl border border-dash-border bg-white p-4">
              <BlockTag>{lesson.type || legacyType || "Lesson"}</BlockTag>
              {renderLegacy()}
            </div>
          ) : (
            <Empty icon={<FileText />} label="No content in this lesson yet." />
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-dash-border bg-dash-surface text-dash-textMuted [&_svg]:size-4">
        {icon}
      </span>
      <p className="max-w-xs text-[12px] leading-relaxed !text-dash-textMuted">{label}</p>
    </div>
  );
}

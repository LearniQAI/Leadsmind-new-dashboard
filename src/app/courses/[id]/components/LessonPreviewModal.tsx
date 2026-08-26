"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, FileText, Download } from "lucide-react";
import VideoPlayer from "@/app/student/courses/[id]/components/VideoPlayer";
import { VoiceNotePlayer } from "@/components/common/VoiceNotePlayer";
import { sanitizeRichTextHtml } from "@/lib/security/sanitizeHtml";

interface LessonPreviewModalProps {
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
}

// "View" action (Section C, Step 4) — a real admin preview of what a student would see,
// without needing a separate real student account. Reuses the same content-block renderer
// sub-components the real student player uses (VideoPlayer, VoiceNotePlayer, the same
// sanitizeRichTextHtml call) in read-only mode, rather than building a second content
// renderer from scratch. Completion-writing calls are intentionally never made here — this
// is a preview, not a real student session, so it must never create real
// lesson_block_completions rows.
export default function LessonPreviewModal({ lessonId, lessonTitle, onClose }: LessonPreviewModalProps) {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/lms/content-blocks?lessonId=${lessonId}`)
      .then((res) => res.json())
      .then((data) => setBlocks(data.data || []))
      .finally(() => setIsLoading(false));
  }, [lessonId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
      <div className="bg-[#0a0f28] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-[#0a0f28] border-b border-white/10 p-5 flex items-center justify-between z-10">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Admin Preview — Student View</span>
            <h3 className="text-sm font-bold text-white mt-0.5">{lessonTitle}</h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-white/40 text-xs py-10">
              <Loader2 size={14} className="animate-spin" /> Loading preview...
            </div>
          ) : blocks.length === 0 ? (
            <div className="text-center text-white/30 text-xs py-10">No content blocks in this lesson yet.</div>
          ) : (
            blocks.map((block, i) => (
              <div key={block.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="text-[9px] text-white/40 uppercase font-mono mb-3 tracking-wider">
                  Block {i + 1} · {block.type.replace("_", " ")}
                </div>
                {block.type === "video" && block.file_url && (
                  <VideoPlayer videoUrl={block.file_url} onComplete={() => {}} isAlreadyCompleted lowBandwidthMode={false} />
                )}
                {block.type === "audio" && block.file_url && (
                  <VoiceNotePlayer audioUrl={block.file_url} waveformBars={block.content?.waveform_bars} theme="dark" isAlreadyCompleted />
                )}
                {(block.type === "reading" || block.type === "slides") && block.file_url && (
                  <a href={block.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary text-xs font-bold">
                    <FileText size={13} /> Open PDF
                  </a>
                )}
                {block.type === "rich_text" && block.content?.text && (
                  <div
                    className="text-sm text-white/80 leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(block.content.text) }}
                  />
                )}
                {block.type === "download" && block.file_url && (
                  <a href={block.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary text-xs font-bold">
                    <Download size={13} /> Download resource
                  </a>
                )}
                {block.type === "quiz" && (
                  <div className="text-xs text-white/50">Quiz block — open the Quiz Workbench to preview questions.</div>
                )}
                {block.type === "assignment" && block.content?.instructions && (
                  <div className="text-xs text-white/70 whitespace-pre-line">{block.content.instructions}</div>
                )}
                {block.type === "flashcards" && (
                  <div className="text-xs text-white/50">{(block.content?.flashcards || []).length} flashcard(s) in this deck.</div>
                )}
                {block.type === "embed" && block.content?.embed_url && (
                  <div className="text-xs text-white/50 font-mono truncate">{block.content.embed_url}</div>
                )}
                {block.type === "live_session" && block.file_url && (
                  <a href={block.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-bold">Meeting link</a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

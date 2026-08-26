'use client';

import React, { useEffect } from 'react';
import { FileText, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReadingModalProps {
  title: string;
  embedUrl: string;
  downloadUrl?: string;
  onClose: () => void;
}

// In-page modal sized to exactly 60% of the viewport width/height (PRD Section 8's
// resolved decision) — never a new tab, so a student can't lose their place in the
// course or get distracted navigating away. Because this is a position:fixed overlay
// rather than a route change or an in-page scroll/anchor jump, the lesson content
// underneath never scrolls while the modal is open — closing it returns the student to
// exactly the same scroll position with no extra bookkeeping required.
export default function ReadingModal({ title, embedUrl, downloadUrl, onClose }: ReadingModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-[#04091a]/80 backdrop-blur-sm z-[999] flex items-center justify-center animate-in fade-in duration-200">
      <div
        style={{ width: '60vw', height: '60vh' }}
        className="flex flex-col bg-[#080f28] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#080f28]/60 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-primary shrink-0" />
            <span className="text-xs font-bold text-white uppercase tracking-wider truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-lg text-[10px] font-black uppercase tracking-wider h-9 px-3.5 items-center justify-center gap-1.5 transition-all"
              >
                <Download size={13} /> Download
              </a>
            )}
            <Button
              onClick={onClose}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-lg text-[10px] font-black uppercase tracking-wider h-9 px-3.5 flex items-center justify-center gap-1.5"
            >
              <X size={13} /> Close
            </Button>
          </div>
        </div>
        <iframe src={embedUrl} className="flex-1 w-full border-0 bg-white" title={title} />
      </div>
    </div>
  );
}

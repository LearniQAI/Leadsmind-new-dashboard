'use client';

import React from 'react';
import { ShieldCheck, GitPullRequest, ArrowRight, Check, X, AlertTriangle } from 'lucide-react';

interface ChangeReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  proposalTitle: string;
  originalText?: string;
  proposedText?: string;
  type: string;
}

export function ChangeReviewPanel({
  isOpen,
  onClose,
  onConfirm,
  proposalTitle,
  originalText = '',
  proposedText = '',
  type
}: ChangeReviewPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#040819]/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-dm-sans">
      <div className="bg-[#0b132c] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header banner */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <GitPullRequest className="text-blue-400" size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82]">
              AI Draft Patch Proposal
            </span>
            <h3 className="text-sm font-black uppercase tracking-wide text-white font-space-grotesk mt-0.5">
              Review Recommended Changes
            </h3>
          </div>
        </div>

        {/* Change comparison display */}
        <div className="p-6 flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82]">
              Optimization Target
            </span>
            <p className="text-xs font-bold text-white bg-white/5 px-3 py-2 rounded-lg border border-white/5">
              {proposalTitle} ({type})
            </p>
          </div>

          {/* Diffs visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Original content panel */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1">
                Original Layout/Copy
              </span>
              <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300 min-h-[90px] font-mono whitespace-pre-wrap">
                {originalText || '— (No previous value set)'}
              </div>
            </div>

            {/* Proposed patch panel */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                AI Proposed Patch
              </span>
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 min-h-[90px] font-mono whitespace-pre-wrap">
                {proposedText}
              </div>
            </div>

          </div>

          {/* Compliance warnings banner */}
          <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400 mt-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              Applying this recommendation modifies the builder active draft only. Changes will not impact production until next publish.
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-[#040819]/50 border-t border-white/10 p-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 hover:text-white transition-all text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            <X size={14} /> Cancel Review
          </button>
          
          <button
            onClick={onConfirm}
            className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            <Check size={14} /> Apply to Draft
          </button>
        </div>

      </div>
    </div>
  );
}

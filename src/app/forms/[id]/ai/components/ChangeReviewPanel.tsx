'use client';

import React from 'react';
import { GitPullRequest, Check, X, AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white border border-dash-border rounded-3xl w-full max-w-lg overflow-hidden shadow-xl flex flex-col max-h-[90vh] overflow-y-auto">

        {/* Header banner */}
        <div className="bg-dash-accent/5 border-b border-dash-border p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center shrink-0">
            <GitPullRequest className="text-dash-accent" size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold !text-dash-textMuted">
              AI draft patch proposal
            </span>
            <h3 className="text-sm font-bold !text-dash-text mt-0.5">
              Review recommended changes
            </h3>
          </div>
        </div>

        {/* Change comparison display */}
        <div className="p-6 flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold !text-dash-textMuted">
              Optimization target
            </span>
            <p className="text-xs font-bold !text-dash-text bg-dash-surface px-3 py-2 rounded-lg border border-dash-border">
              {proposalTitle} ({type})
            </p>
          </div>

          {/* Diffs visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Original content panel */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-red flex items-center gap-1">
                Original layout/copy
              </span>
              <div className="bg-red/5 border border-red/20 rounded-xl p-3 text-xs text-red min-h-[90px] font-mono whitespace-pre-wrap">
                {originalText || '— (No previous value set)'}
              </div>
            </div>

            {/* Proposed patch panel */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-green flex items-center gap-1">
                AI proposed patch
              </span>
              <div className="bg-green/5 border border-green/20 rounded-xl p-3 text-xs text-green min-h-[90px] font-mono whitespace-pre-wrap">
                {proposedText}
              </div>
            </div>

          </div>

          {/* Compliance warnings banner */}
          <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-600 mt-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              Applying this recommendation modifies the builder active draft only. Changes will not impact production until next publish.
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-dash-surface border-t border-dash-border p-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-dash-border hover:bg-white !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none text-xs font-bold flex items-center gap-1.5"
          >
            <X size={14} /> Cancel review
          </button>

          <button
            onClick={onConfirm}
            className="h-9 px-5 rounded-xl bg-dash-accent hover:bg-dash-accent/90 text-white transition-colors motion-reduce:transition-none text-xs font-bold flex items-center gap-1.5"
          >
            <Check size={14} /> Apply to draft
          </button>
        </div>

      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play, Trash2 } from 'lucide-react';

interface ResumeRuntimeProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDiscard: () => void;
  savedTimestamp: number;
  completionPercentage: number;
  stepName?: string;
}

export function ResumeRuntime({
  isOpen,
  onClose,
  onConfirm,
  onDiscard,
  savedTimestamp,
  completionPercentage,
  stepName,
}: ResumeRuntimeProps) {
  if (!isOpen) return null;

  const formattedDate = new Date(savedTimestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white border border-[#e6e9f2] p-6 rounded-3xl shadow-2xl flex flex-col gap-5 relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        {/* Subtle top decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase text-[#101B4C] font-space-grotesk tracking-tight">Resume Session?</h3>
            <p className="text-xs text-[#64748b] font-bold uppercase tracking-widest mt-0.5">Unfinished progress found</p>
          </div>
        </div>

        <div className="bg-[#f8fafc] border border-[#e2e8f0] p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#64748b]">Saved On</span>
            <span className="font-bold text-[#0f172a]">{formattedDate}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-[#64748b]">Form Progress</span>
            <span className="font-black text-blue-600 uppercase tracking-wider">{Math.round(completionPercentage)}% Complete</span>
          </div>

          {stepName && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#64748b]">Active Step</span>
              <span className="font-bold text-[#0f172a] truncate max-w-[200px]">{stepName}</span>
            </div>
          )}

          {/* Simple progress bar */}
          <div className="w-full bg-[#e2e8f0] h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-[#94a3b8] leading-relaxed">
          Would you like to resume your form submission from where you left off, or start fresh with a clean form?
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onDiscard}
            className="flex-1 border-[#e2e8f0] bg-transparent text-[10px] font-black uppercase tracking-widest text-[#64748b] hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 rounded-xl h-11 transition-all flex items-center justify-center gap-1.5"
          >
            <Trash2 size={13} /> Start Fresh
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl h-11 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5"
          >
            <Play size={13} /> Resume
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tag: string) => void;
  selectedCount: number;
}

export function TagDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount
}: TagDialogProps) {
  const [tag, setTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tag.trim()) {
      onConfirm(tag.trim());
      setTag('');
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1001] bg-[#000000c1] backdrop-blur-sm animate-in fade-in duration-300" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1002] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-[#080f28] border border-white/5 p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-300 focus:outline-none">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#2563eb]/10 border border-[#2563eb]/20 flex items-center justify-center mb-6 shadow-lg shadow-[#2563eb]/5">
              <i className="fa-solid fa-tags text-[#3b82f6] text-[24px]"></i>
            </div>
            
            <Dialog.Title className="text-[20px] font-bold text-[#eef2ff] mb-2 font-space-grotesk uppercase tracking-tight">
              Apply <span className="text-[#3b82f6]">Strategic Tag</span>
            </Dialog.Title>
            
            <Dialog.Description className="text-[13px] text-[#4a5a82] mb-8 font-dm-sans leading-relaxed">
              You are applying a tactical tag to <span className="text-[#eef2ff] font-bold">{selectedCount}</span> selected leads. This will help in high-fidelity segmentation.
            </Dialog.Description>
            
            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="relative group">
                <i className="fa-solid fa-tag absolute left-4 top-1/2 -translate-y-1/2 text-[12px] text-[#4a5a82] group-focus-within:text-[#3b82f6] transition-colors"></i>
                <input
                  autoFocus
                  type="text"
                  placeholder="Enter tag name (e.g. Q2-Lead, Priority...)"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-xl px-11 text-[14px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb]/50 focus:ring-4 focus:ring-[#2563eb]/10 transition-all font-dm-sans"
                />
              </div>

              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[13px] font-bold font-dm-sans transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!tag.trim()}
                  className="flex-1 h-11 rounded-xl bg-[#2563eb] text-white hover:bg-[#2563eb]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[13px] font-bold font-dm-sans transition-all shadow-lg shadow-[#2563eb]/20"
                >
                  Apply Tag
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

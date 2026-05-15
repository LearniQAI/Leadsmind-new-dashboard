'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger'
}: ConfirmDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger': return 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20';
      case 'warning': return 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20';
      default: return 'bg-[#2563eb] text-white hover:bg-[#2563eb]/90 shadow-[#2563eb]/20';
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger': return 'fa-triangle-exclamation text-red-400';
      case 'warning': return 'fa-circle-exclamation text-amber-400';
      default: return 'fa-circle-question text-[#3b82f6]';
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1001] bg-[#000000c1] backdrop-blur-sm animate-in fade-in duration-300" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1002] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-[#080f28] border border-white/5 p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
          <div className="flex flex-col items-center text-center">
            <div className={cn(
              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 bg-white/[0.03] border border-white/5 shadow-xl rotate-6 transition-transform hover:rotate-0 duration-500"
            )}>
              <i className={cn("fa-solid text-[24px]", getIcon())}></i>
            </div>

            <Dialog.Title className="text-[20px] font-bold text-[#eef2ff] mb-2 font-space-grotesk uppercase tracking-tight">
              {title}
            </Dialog.Title>

            <Dialog.Description className="text-[13.5px] text-[#4a5a82] mb-8 font-dm-sans leading-relaxed max-w-[320px]">
              {description}
            </Dialog.Description>

            <div className="flex w-full gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-[12px] bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[13px] font-bold font-dm-sans transition-all"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "flex-1 h-11 rounded-[12px] text-[13px] font-bold font-dm-sans transition-all shadow-lg active:scale-95",
                  getVariantStyles()
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

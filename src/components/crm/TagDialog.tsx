'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Tags, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashButton } from '@/components/dashboard-ui/Button';

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
        <Dialog.Overlay className="fixed inset-0 z-[1001] bg-dash-text/40 backdrop-blur-sm animate-in fade-in duration-300 motion-reduce:animate-none" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1002] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-dash-border p-6 shadow-xl animate-in zoom-in-95 fade-in duration-300 motion-reduce:animate-none focus:outline-none max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center mb-4">
              <Tags className="text-dash-accent" size={24} />
            </div>

            <Dialog.Title className="text-[20px] font-bold !text-dash-text mb-2">
              Apply <span className="text-dash-accent">Strategic Tag</span>
            </Dialog.Title>

            <Dialog.Description className="text-[13px] !text-dash-textMuted mb-5 leading-relaxed">
              You are applying a tactical tag to <span className="!text-dash-text font-bold">{selectedCount}</span> selected leads. This will help in high-fidelity segmentation.
            </Dialog.Description>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="relative group">
                <TagIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-dash-textMuted group-focus-within:text-dash-accent transition-colors" size={12} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Enter tag name (e.g. Q2-Lead, Priority...)"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full h-12 bg-white border border-dash-border rounded-xl px-11 text-[14px] !text-dash-text placeholder:text-dash-textMuted focus:outline-none focus:border-dash-accent/50 focus:ring-4 focus:ring-dash-accent/10 transition-all"
                />
              </div>

              <div className="flex w-full gap-3">
                <DashButton
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </DashButton>
                <DashButton
                  type="submit"
                  disabled={!tag.trim()}
                  className="flex-1"
                >
                  Apply Tag
                </DashButton>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

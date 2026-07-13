'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashButton } from '@/components/dashboard-ui/Button';

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
  const iconWrapClass = {
    danger: 'bg-red/10 text-red',
    warning: 'bg-amber/10 text-amber',
    info: 'bg-dash-accent/10 text-dash-accent',
  }[variant];

  const Icon = { danger: AlertTriangle, warning: AlertCircle, info: HelpCircle }[variant];

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1001] bg-dash-text/40 backdrop-blur-sm animate-in fade-in duration-300 motion-reduce:animate-none" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1002] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-dash-border p-6 shadow-xl animate-in zoom-in-95 fade-in duration-300 motion-reduce:animate-none max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col items-center text-center">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4", iconWrapClass)}>
              <Icon size={22} strokeWidth={2} />
            </div>

            <Dialog.Title className="text-[17px] font-bold !text-dash-text mb-2">
              {title}
            </Dialog.Title>

            <Dialog.Description className="text-[13.5px] !text-dash-textMuted mb-5 leading-relaxed max-w-[320px]">
              {description}
            </Dialog.Description>

            <div className="flex w-full gap-3">
              <DashButton variant="secondary" size="default" className="flex-1" onClick={onClose}>
                {cancelLabel}
              </DashButton>
              <DashButton
                variant={variant === 'danger' ? 'destructive' : 'primary'}
                size="default"
                className="flex-1"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmLabel}
              </DashButton>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

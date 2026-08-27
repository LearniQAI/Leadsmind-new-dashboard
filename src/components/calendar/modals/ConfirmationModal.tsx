'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] z-[1100] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDestructive ? 'bg-red/10 text-red' : 'bg-dash-accent/10 text-dash-accent'}`}>
               <AlertTriangle size={24} />
            </div>
            <div>
               <DialogTitle className="text-[18px] font-bold !text-dash-text">
                 {title}
               </DialogTitle>
               <DialogDescription className="text-[13px] !text-dash-textMuted mt-1">
                 {description}
               </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? <Loader2 className="animate-spin motion-reduce:animate-none" size={14} /> : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

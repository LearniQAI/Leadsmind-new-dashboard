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
      <DialogContent className="sm:max-w-[400px] z-[1100] bg-[var(--n800)] border-[var(--bdr)] text-[var(--t1)]">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-[var(--accent)]/10 text-[var(--accent2)]'}`}>
               <AlertTriangle size={24} />
            </div>
            <div>
               <DialogTitle className="text-[18px] font-bold font-['Space_Grotesk'] text-[var(--t1)]">
                 {title}
               </DialogTitle>
               <DialogDescription className="text-[13px] text-[var(--t4)] mt-1">
                 {description}
               </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-[var(--t3)] hover:text-[var(--t1)] text-[11px] font-bold uppercase tracking-widest"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-w-[120px] h-11 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all ${
              isDestructive 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' 
                : 'bg-[var(--accent)] hover:bg-[var(--accent2)] text-white'
            }`}
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

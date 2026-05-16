'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Eraser, Loader2 } from 'lucide-react';
import { PremiumTextarea, PremiumInput } from '@/components/ui/premium-inputs';
import { toast } from 'sonner';

interface WriteOffDialogProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { amount: number; reason: string }) => Promise<void>;
}

const WriteOffDialog: React.FC<WriteOffDialogProps> = ({
  invoice,
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [amount, setAmount] = useState(Number(invoice?.total_amount) || 0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the write-off');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onConfirm({ amount, reason });
      onOpenChange(false);
      setReason('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--n800)] border border-[var(--bdrh)] rounded-[var(--r24)] max-w-md p-8 shadow-2xl">
        <DialogHeader className="mb-6 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center border border-[rgba(239,68,68,0.2)] mb-4">
            <Eraser className="h-8 w-8 text-[var(--red)]" />
          </div>
          <DialogTitle className="text-2xl font-bold font-space text-[var(--t1)] uppercase tracking-tight">
            DEBT <span className="text-[var(--red)]">ERASURE</span>
          </DialogTitle>
          <p className="text-[var(--t3)] text-[11px] font-medium uppercase tracking-widest mt-2 max-w-[280px]">
            Permanently write off outstanding balance for {invoice?.invoice_number}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 rounded-[var(--r16)] bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.1)] flex items-start gap-3">
             <AlertTriangle className="h-5 w-5 text-[var(--red)] shrink-0 mt-0.5" />
             <p className="text-[11px] text-[var(--t2)] leading-relaxed">
               This action will mark the invoice as <strong>Written Off</strong> and record the loss in your ledger. This cannot be reversed.
             </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">
              Amount to Write Off
            </label>
            <PremiumInput
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-12 text-lg font-bold font-space"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">
              Justification / Reason
            </label>
            <PremiumTextarea
              placeholder="e.g. Bad debt, client liquidation, dispute settlement..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="mt-8 gap-3">
          <button 
            onClick={() => onOpenChange(false)} 
            className="btn-ghost flex-1 h-12"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={isSubmitting}
            className="btn-danger flex-1 h-12 gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser size={16} />}
            Confirm Write-Off
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WriteOffDialog;

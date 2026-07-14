'use client';

import React, { useState } from 'react';
import {
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashModalFooter,
} from '@/components/dashboard-ui/Modal';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { AlertTriangle, Eraser, Loader2 } from 'lucide-react';
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
    <DashModal open={open} onOpenChange={onOpenChange}>
      <DashModalContent className="max-w-md">
        <DashModalHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red/10 border border-red/20 flex items-center justify-center mb-2 mx-auto">
            <Eraser className="h-6 w-6 text-red" />
          </div>
          <DashModalTitle className="text-center">
            Write off debt
          </DashModalTitle>
          <p className="!text-dash-textMuted text-[13px] mt-1 max-w-[280px] mx-auto">
            Permanently write off the outstanding balance for {invoice?.invoice_number}
          </p>
        </DashModalHeader>

        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-red/5 border border-red/10 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red shrink-0 mt-0.5" />
            <p className="text-[12px] !text-dash-textMuted leading-relaxed">
              This action will mark the invoice as <strong className="!text-dash-text">Written Off</strong> and record the loss in your ledger. This cannot be reversed.
            </p>
          </div>

          <DashFormField label="Amount to write off">
            <DashInput
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-12 text-lg font-bold"
            />
          </DashFormField>

          <DashFormField label="Justification / reason" required>
            <DashTextarea
              placeholder="e.g. Bad debt, client liquidation, dispute settlement..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </DashFormField>
        </div>

        <DashModalFooter>
          <DashButton variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </DashButton>
          <DashButton
            variant="destructive"
            className="flex-1"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser size={16} />}
            Confirm write-off
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
};

export default WriteOffDialog;

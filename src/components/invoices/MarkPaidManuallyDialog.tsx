'use client';

import React, { useState } from 'react';
import {
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashModalFooter,
} from '@/components/dashboard-ui/Modal';
import { DashFormField, DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface MarkPaidManuallyDialogProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

const MarkPaidManuallyDialog: React.FC<MarkPaidManuallyDialogProps> = ({
  invoice,
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setValidationError('Please provide a reason for marking this invoice as paid manually.');
      return;
    }
    setValidationError('');
    setIsSubmitting(true);
    try {
      await onConfirm(reason);
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
          <div className="w-14 h-14 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center mb-2 mx-auto">
            <CheckCircle2 className="h-6 w-6 text-green" />
          </div>
          <DashModalTitle className="text-center">
            Mark as paid (manual)
          </DashModalTitle>
          <p className="!text-dash-textMuted text-[13px] mt-1 max-w-[300px] mx-auto">
            Record a payment received outside PayFast for {invoice?.invoice_number}
          </p>
        </DashModalHeader>

        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-800 leading-relaxed">
              Only use this for a real payment received outside PayFast (e.g. cash or EFT). This is
              logged separately from a PayFast-verified payment and requires admin/owner approval.
            </p>
          </div>

          <DashFormField label="Reason / payment reference" required>
            <DashTextarea
              placeholder="e.g. Cash received in person, 20 Aug 2026, receipt #4021"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setValidationError(''); }}
              className="min-h-[100px]"
            />
            {validationError && (
              <p className="text-[11px] text-red mt-1.5">{validationError}</p>
            )}
          </DashFormField>
        </div>

        <DashModalFooter>
          <DashButton variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </DashButton>
          <DashButton
            variant="primary"
            className="flex-1"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
            Confirm payment
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
};

export default MarkPaidManuallyDialog;

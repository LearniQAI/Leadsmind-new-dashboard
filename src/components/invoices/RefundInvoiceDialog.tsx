'use client';

import React, { useEffect, useState } from 'react';
import {
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashModalFooter,
} from '@/components/dashboard-ui/Modal';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { AlertTriangle, Undo2, Loader2 } from 'lucide-react';

interface RefundInvoiceDialogProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { reason: string; amount: number }) => Promise<{ recordOnly: boolean; gateway: 'stripe' | 'payfast' }>;
}

// Mirrors refundInvoice()'s own gateway resolution in src/app/actions/refunds.ts — a real
// stripe.refunds.create() call only happens when stripe_payment_intent_id is on record.
// Everything else (PayFast, or a historical Stripe invoice predating payment_intent capture)
// is record-only: no money moves through LeadsMind for it.
function resolveGateway(invoice: any): 'stripe' | 'payfast' {
  return invoice?.stripe_payment_intent_id ? 'stripe' : 'payfast';
}

const RefundInvoiceDialog: React.FC<RefundInvoiceDialogProps> = ({
  invoice,
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const gateway = resolveGateway(invoice);
  const isRealRefund = gateway === 'stripe';
  const maxAmount = Number(invoice?.total_amount ?? invoice?.amount_paid ?? 0);

  useEffect(() => {
    if (open) {
      setAmount(maxAmount);
      setReason('');
      setValidationError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?.id]);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setValidationError('Please provide a reason for this refund.');
      return;
    }
    if (!amount || amount <= 0 || amount > maxAmount) {
      setValidationError(`Refund amount must be between 0 and ${maxAmount.toLocaleString(undefined, { style: 'currency', currency: invoice?.currency || 'USD' })}.`);
      return;
    }
    setValidationError('');
    setIsSubmitting(true);
    try {
      await onConfirm({ reason, amount });
      onOpenChange(false);
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
            <Undo2 className="h-6 w-6 text-red" />
          </div>
          <DashModalTitle className="text-center">Refund invoice</DashModalTitle>
          <p className="!text-dash-textMuted text-[13px] mt-1 max-w-[300px] mx-auto">
            {invoice?.invoice_number}
          </p>
        </DashModalHeader>

        <div className="space-y-5">
          {isRealRefund ? (
            <div className="p-4 rounded-xl bg-red/5 border border-red/20 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red shrink-0 mt-0.5" />
              <p className="text-[12px] !text-dash-text leading-relaxed">
                This will process a <strong>real refund through Stripe</strong> for up to the amount
                below. The customer's card will actually be credited — this cannot be undone.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-800 leading-relaxed">
                <strong>No money will move automatically.</strong> PayFast has no refund API available
                to standard merchants, so this only marks the invoice as refunded in LeadsMind — you
                must separately process the actual refund yourself in your{' '}
                <strong>PayFast merchant dashboard</strong>. The customer has not been refunded until
                you do that.
              </p>
            </div>
          )}

          <DashFormField label="Refund amount" required>
            <DashInput
              type="number"
              min={0}
              max={maxAmount}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-12 text-lg font-bold"
            />
          </DashFormField>

          <DashFormField label="Reason" required>
            <DashTextarea
              placeholder="e.g. Customer requested cancellation, service not delivered..."
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
            className="flex-1 !bg-red hover:!bg-red/90"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 size={16} />}
            {isRealRefund ? 'Refund via Stripe' : 'Mark as refunded'}
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
};

export default RefundInvoiceDialog;

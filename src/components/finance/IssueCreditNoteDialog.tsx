'use client';

import React, { useState, useEffect } from 'react';
import {
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashModalFooter,
} from '@/components/dashboard-ui/Modal';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { FileMinus, Loader2 } from 'lucide-react';

interface InvoiceOption {
  id: string;
  invoice_number: string;
  total_amount: number;
  amount_due: number | null;
  amount_paid: number | null;
  currency: string;
  contact?: { first_name?: string; last_name?: string } | null;
}

interface IssueCreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: InvoiceOption[];
  defaultInvoiceId?: string | null;
  onConfirm: (data: { invoiceId: string; amount: number; reason: string }) => Promise<void>;
}

function outstandingOf(invoice: InvoiceOption): number {
  const due = Number(invoice.amount_due ?? invoice.total_amount ?? 0);
  const paid = Number(invoice.amount_paid ?? 0);
  return Math.max(0, due - paid);
}

const IssueCreditNoteDialog: React.FC<IssueCreditNoteDialogProps> = ({
  open,
  onOpenChange,
  invoices,
  defaultInvoiceId,
  onConfirm,
}) => {
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId || '');
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setInvoiceId(defaultInvoiceId || '');
      const selected = invoices.find(i => i.id === defaultInvoiceId);
      setAmount(selected ? outstandingOf(selected) : 0);
      setReason('');
    }
  }, [open, defaultInvoiceId, invoices]);

  const selectedInvoice = invoices.find(i => i.id === invoiceId);
  const outstanding = selectedInvoice ? outstandingOf(selectedInvoice) : 0;

  const handleInvoiceChange = (id: string) => {
    setInvoiceId(id);
    const selected = invoices.find(i => i.id === id);
    setAmount(selected ? outstandingOf(selected) : 0);
  };

  const handleConfirm = async () => {
    if (!invoiceId) return;
    if (!reason.trim()) return;
    if (amount <= 0 || amount > outstanding) return;

    setIsSubmitting(true);
    try {
      await onConfirm({ invoiceId, amount, reason });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashModal open={open} onOpenChange={onOpenChange}>
      <DashModalContent className="max-w-md">
        <DashModalHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center mb-2 mx-auto">
            <FileMinus className="h-6 w-6 text-dash-accent" />
          </div>
          <DashModalTitle className="text-center">Issue Credit Note</DashModalTitle>
          <p className="!text-dash-textMuted text-[13px] mt-1 max-w-[280px] mx-auto">
            Reduces the outstanding balance owed on an invoice without recording a refund of paid money.
          </p>
        </DashModalHeader>

        <div className="space-y-5">
          <DashFormField label="Invoice" required>
            <select
              value={invoiceId}
              onChange={e => handleInvoiceChange(e.target.value)}
              disabled={!!defaultInvoiceId}
              className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent disabled:opacity-60"
            >
              <option value="">Select an invoice...</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — {inv.contact ? `${inv.contact.first_name || ''} ${inv.contact.last_name || ''}`.trim() : 'Unknown Client'} (outstanding {outstandingOf(inv).toFixed(2)})
                </option>
              ))}
            </select>
          </DashFormField>

          {selectedInvoice && (
            <div className="p-3 rounded-xl bg-dash-surface border border-dash-border text-[12px] !text-dash-textMuted">
              Outstanding balance: <strong className="!text-dash-text">{outstanding.toLocaleString(undefined, { style: 'currency', currency: selectedInvoice.currency || 'USD' })}</strong>
            </div>
          )}

          <DashFormField label="Credit amount" required>
            <DashInput
              type="number"
              min={0}
              max={outstanding}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-12 text-lg font-bold"
            />
          </DashFormField>

          <DashFormField label="Reason" required>
            <DashTextarea
              placeholder="e.g. Service not delivered, billing error, goodwill adjustment..."
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
            variant="primary"
            className="flex-1"
            onClick={handleConfirm}
            disabled={isSubmitting || !invoiceId || !reason.trim() || amount <= 0 || amount > outstanding}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileMinus size={16} />}
            Issue Credit Note
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
};

export default IssueCreditNoteDialog;

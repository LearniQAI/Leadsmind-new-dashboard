'use client';

import React, { useState, useEffect } from 'react';
import {
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashModalFooter,
} from '@/components/dashboard-ui/Modal';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { Wallet, Loader2 } from 'lucide-react';

interface ContactOption {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface RetainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ContactOption[];
  existingContactIds: string[];
  defaultContactId?: string | null;
  onConfirm: (data: { contactId: string; amount: number }) => Promise<void>;
}

const RetainerDialog: React.FC<RetainerDialogProps> = ({
  open,
  onOpenChange,
  contacts,
  existingContactIds,
  defaultContactId,
  onConfirm,
}) => {
  const [contactId, setContactId] = useState(defaultContactId || '');
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setContactId(defaultContactId || '');
      setAmount(0);
    }
  }, [open, defaultContactId]);

  const isTopUp = existingContactIds.includes(contactId);

  const handleConfirm = async () => {
    if (!contactId || amount <= 0) return;
    setIsSubmitting(true);
    try {
      await onConfirm({ contactId, amount });
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
            <Wallet className="h-6 w-6 text-dash-accent" />
          </div>
          <DashModalTitle className="text-center">New Retainer Deposit</DashModalTitle>
          <p className="!text-dash-textMuted text-[13px] mt-1 max-w-[280px] mx-auto">
            Record an advance payment as prepaid credit for a contact. Applying it to a future invoice reduces the balance due.
          </p>
        </DashModalHeader>

        <div className="space-y-5">
          <DashFormField label="Contact" required>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              disabled={!!defaultContactId}
              className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent disabled:opacity-60"
            >
              <option value="">Select a contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || c.id}
                  {existingContactIds.includes(c.id) ? ' (has an existing retainer)' : ''}
                </option>
              ))}
            </select>
          </DashFormField>

          {contactId && (
            <div className="p-3 rounded-xl bg-dash-surface border border-dash-border text-[12px] !text-dash-textMuted">
              {isTopUp
                ? 'This contact already has a retainer — this deposit will top up their existing balance.'
                : 'This will create a new retainer for this contact.'}
            </div>
          )}

          <DashFormField label="Deposit amount" required>
            <DashInput
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-12 text-lg font-bold"
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
            disabled={isSubmitting || !contactId || amount <= 0}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet size={16} />}
            {isTopUp ? 'Top Up Retainer' : 'Create Retainer'}
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
};

export default RetainerDialog;

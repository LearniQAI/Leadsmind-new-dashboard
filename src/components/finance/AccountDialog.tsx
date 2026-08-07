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
import { Landmark, Loader2 } from 'lucide-react';
import type { AccountType } from '@/app/actions/chartOfAccounts';

export interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: AccountType;
}

export interface AccountFormData {
  code: string;
  name: string;
  type: AccountType;
  category?: string;
  parentId?: string | null;
  taxCategory?: string;
}

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
  editing?: (AccountFormData & { id: string }) | null;
  onConfirm: (data: AccountFormData) => Promise<void>;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue / Income' },
  { value: 'expense', label: 'Expense' },
];

const EMPTY_FORM: AccountFormData = { code: '', name: '', type: 'expense', category: '', parentId: null, taxCategory: '' };

const AccountDialog: React.FC<AccountDialogProps> = ({ open, onOpenChange, accounts, editing, onConfirm }) => {
  const [form, setForm] = useState<AccountFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...editing } : EMPTY_FORM);
    }
  }, [open, editing]);

  const parentOptions = accounts.filter(a => a.type === form.type && a.id !== editing?.id);

  const handleConfirm = async () => {
    if (!form.code.trim() || !form.name.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm(form);
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
            <Landmark className="h-6 w-6 text-dash-accent" />
          </div>
          <DashModalTitle className="text-center">{editing ? 'Edit Account' : 'New Account'}</DashModalTitle>
          <p className="!text-dash-textMuted text-[13px] mt-1 max-w-[300px] mx-auto">
            {editing ? 'Update this ledger account.' : 'Add a new account to your chart of accounts.'}
          </p>
        </DashModalHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <DashFormField label="Code" required>
              <DashInput
                value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g. 6000"
              />
            </DashFormField>
            <DashFormField label="Type" required>
              <select
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value as AccountType, parentId: null }))}
                className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
              >
                {ACCOUNT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </DashFormField>
          </div>

          <DashFormField label="Account name" required>
            <DashInput
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Office Supplies"
            />
          </DashFormField>

          <DashFormField label="Category">
            <DashInput
              value={form.category || ''}
              onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="e.g. operating_expense (optional)"
            />
          </DashFormField>

          <DashFormField label="Parent account">
            <select
              value={form.parentId || ''}
              onChange={(e) => setForm(f => ({ ...f, parentId: e.target.value || null }))}
              className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
            >
              <option value="">No parent (top-level)</option>
              {parentOptions.map(a => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </DashFormField>

          <DashFormField label="Tax category">
            <DashInput
              value={form.taxCategory || ''}
              onChange={(e) => setForm(f => ({ ...f, taxCategory: e.target.value }))}
              placeholder="e.g. VAT201 (optional)"
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
            disabled={isSubmitting || !form.code.trim() || !form.name.trim()}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark size={16} />}
            {editing ? 'Save Changes' : 'Create Account'}
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
};

export default AccountDialog;

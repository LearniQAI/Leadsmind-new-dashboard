'use client';

import React, { useMemo, useState } from 'react';
import LineItemBuilder from './LineItemBuilder';
import TotalsSummaryPanel from './TotalsSummaryPanel';
import CustomFieldsRenderer, { CustomFieldDefinition } from './CustomFieldsRenderer';
import AttachmentDropzone from './AttachmentDropzone';
import ContactSelector from './ContactSelector';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { LineItem, calculateInvoiceTotals } from '@/lib/invoicing/calculations';
import { Loader2, Send, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceFormContainerProps {
  initialData?: any;
  contacts: any[];
  customFieldDefinitions?: CustomFieldDefinition[];
  onSave: (data: any) => void;
  isSaving?: boolean;
  /** Workspace's invoice_settings.vat_rate when vat_enabled, else 0 — the starting tax rate
   * for newly-added line items (still editable per line). */
  defaultTaxRate?: number;
  /** A failed save/send, shown inline above the action bar. The form state is never cleared on failure. */
  saveError?: { message: string; retryLabel: string } | null;
  onRetry?: () => void;
  onDismissError?: () => void;
}

const InvoiceFormContainer: React.FC<InvoiceFormContainerProps> = ({
  initialData,
  contacts,
  customFieldDefinitions = [],
  onSave,
  isSaving = false,
  defaultTaxRate = 0,
  saveError = null,
  onRetry,
  onDismissError,
}) => {
  const [contactId, setContactId] = useState(initialData?.contact_id || '');
  // Clients created (or picked from the duplicate prompt) inside the selector: the server-fetched `contacts` list
  // doesn't have them until the page reloads, but their email is needed right now to decide if "Save & Send" can work.
  const [createdContacts, setCreatedContacts] = useState<any[]>([]);
  const allContacts = useMemo(() => {
    const known = new Set(contacts.map((c) => c.id));
    return [...createdContacts.filter((c) => !known.has(c.id)), ...contacts];
  }, [contacts, createdContacts]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoice_number || '');
  const [issueDate, setIssueDate] = useState(
    initialData?.issue_date || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(initialData?.due_date || '');
  const [items, setItems] = useState<(LineItem & { id: string; description: string })[]>(
    initialData?.items || []
  );
  const [shippingCharges, setShippingCharges] = useState(initialData?.shipping_charges || 0);
  const [adjustment, setAdjustment] = useState(initialData?.adjustment || 0);
  const [terms, setTerms] = useState(initialData?.terms_and_conditions || '');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(
    initialData?.custom_field_values || {}
  );
  // LeadsMind's default currency is ZAR — see src/lib/utils.ts formatCurrency.
  // Previously this form had no currency state at all: the totals panel showed
  // "R" purely from TotalsSummaryPanel's own hardcoded prop default, while the
  // save payload never included a currency key, so every invoice silently
  // inherited the invoices.currency column's DEFAULT 'USD'. Owning the value
  // here ties what's displayed to what's actually persisted.
  const [currency, setCurrency] = useState(initialData?.currency || 'ZAR');

  const handleSave = (status: 'draft' | 'sent') => {
    setLocalError(null);
    if (!contactId) {
      setLocalError('Please select a client before saving the invoice.');
      return;
    }
    if (items.length === 0) {
      setLocalError('Add at least one line item before saving the invoice.');
      return;
    }
    if (status === 'sent') {
      const chosen = allContacts.find((c) => c.id === contactId);
      if (chosen && !chosen.email) {
        setLocalError("This client has no email address, so the invoice can't be emailed. Add an email to the client, or choose Save as draft.");
        return;
      }
    }

    const totals = calculateInvoiceTotals(items, shippingCharges, adjustment);
    onSave({
      contact_id: contactId,
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate,
      items,
      shipping_charges: shippingCharges,
      adjustment,
      subtotal: totals.subtotal,
      tax_total: totals.taxTotal,
      total_amount: totals.grandTotal,
      amount_due: totals.grandTotal,
      amount_paid: 0,
      terms_and_conditions: terms,
      custom_field_values: customFieldValues,
      currency,
      status,
    });
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-24">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white border border-dash-border rounded-2xl">
        <div className="md:col-span-2 space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="!text-dash-text text-xl font-bold">
              Invoice <span className="text-dash-accent">details</span>
            </h2>
            <p className="!text-dash-textMuted text-xs font-semibold">
              General information & configuration
            </p>
          </div>

          <ContactSelector
            contacts={allContacts}
            selectedId={contactId}
            onChange={(id) => { setContactId(id); setLocalError(null); }}
            onContactAvailable={(c) => setCreatedContacts((prev) => [c, ...prev.filter((p) => p.id !== c.id)])}
          />

          <CustomFieldsRenderer
            definitions={customFieldDefinitions}
            values={customFieldValues}
            placement="header"
            onChange={(id, val) => setCustomFieldValues(prev => ({ ...prev, [id]: val }))}
          />
        </div>

        <div className="bg-dash-surface p-4 rounded-xl border border-dash-border flex flex-col gap-4">
          <DashFormField label="Invoice number">
            <DashInput
              placeholder="e.g. INV-001"
              className="h-10"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </DashFormField>
          <DashFormField label="Issue date">
            <DashInput
              type="date"
              className="h-10"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </DashFormField>
          <DashFormField label="Due date">
            <DashInput
              type="date"
              className="h-10"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </DashFormField>
          <DashFormField label="Currency">
            <select
              className="w-full h-10 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {['ZAR', 'USD', 'EUR', 'GBP'].map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </DashFormField>
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="!text-dash-text text-lg font-semibold">
            Line <span className="text-dash-accent">items</span>
          </h3>
          <p className="!text-dash-textMuted text-[11px] font-medium">
            Products and services billed
          </p>
        </div>

        <div className="bg-white border border-dash-border rounded-2xl overflow-hidden">
          <LineItemBuilder items={items} onItemsChange={setItems} defaultTaxRate={defaultTaxRate} />
        </div>
      </div>

      {/* Footer / Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <DashFormField label="Terms & conditions">
            <DashTextarea
              placeholder="Enter your payment terms, late fees, or special instructions..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="min-h-[120px]"
            />
          </DashFormField>

          <CustomFieldsRenderer
            definitions={customFieldDefinitions}
            values={customFieldValues}
            placement="footer"
            onChange={(id, val) => setCustomFieldValues(prev => ({ ...prev, [id]: val }))}
          />
        </div>

        <TotalsSummaryPanel
          items={items}
          shippingCharges={shippingCharges}
          adjustment={adjustment}
          currency={currency}
          onShippingChange={setShippingCharges}
          onAdjustmentChange={setAdjustment}
        />
      </div>

      {(saveError || localError) && (
        <div role="alert" data-testid="invoice-inline-error" className="rounded-xl border border-red/30 bg-red/5 p-4 text-[13px] !text-red flex flex-wrap items-start justify-between gap-3">
          <span className="flex items-start gap-2 min-w-0"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{saveError?.message ?? localError}</span></span>
          <span className="flex items-center gap-2 shrink-0">
            {saveError && onRetry && (
              <DashButton variant="secondary" size="sm" onClick={onRetry} disabled={isSaving}>
                <RefreshCw size={14} /> {saveError.retryLabel}
              </DashButton>
            )}
            <button type="button" className="text-[12px] font-bold underline" onClick={() => { setLocalError(null); onDismissError?.(); }}>Dismiss</button>
          </span>
        </div>
      )}

      {/* Action Bar */}
      <div className="sticky bottom-8 left-0 right-0 flex justify-end gap-3 p-4 bg-white border border-dash-border rounded-xl shadow-lg backdrop-blur-md">
        <DashButton
          variant="secondary"
          onClick={() => handleSave('draft')}
          disabled={isSaving}
          className="px-8"
        >
          Save as draft
        </DashButton>
        <DashButton
          variant="primary"
          onClick={() => handleSave('sent')}
          disabled={isSaving}
          className="px-8"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Save & Send</span>
            </>
          )}
        </DashButton>
      </div>
    </div>
  );
};

export default InvoiceFormContainer;

'use client';

import React, { useState } from 'react';
import LineItemBuilder from './LineItemBuilder';
import TotalsSummaryPanel from './TotalsSummaryPanel';
import CustomFieldsRenderer, { CustomFieldDefinition } from './CustomFieldsRenderer';
import AttachmentDropzone from './AttachmentDropzone';
import ContactSelector from './ContactSelector';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { LineItem, calculateInvoiceTotals } from '@/lib/invoicing/calculations';
import { Loader2 } from 'lucide-react';

interface InvoiceFormContainerProps {
  initialData?: any;
  contacts: any[];
  customFieldDefinitions?: CustomFieldDefinition[];
  onSave: (data: any) => void;
  isSaving?: boolean;
}

const InvoiceFormContainer: React.FC<InvoiceFormContainerProps> = ({
  initialData,
  contacts,
  customFieldDefinitions = [],
  onSave,
  isSaving = false,
}) => {
  const [contactId, setContactId] = useState(initialData?.contact_id || '');
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoice_number || '');
  const [issueDate, setIssueDate] = useState(initialData?.created_at || new Date().toISOString().split('T')[0]);
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

  const handleSave = () => {
    const totals = calculateInvoiceTotals(items, shippingCharges, adjustment);
    onSave({
      contact_id: contactId,
      invoice_number: invoiceNumber,
      created_at: issueDate,
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
            contacts={contacts}
            selectedId={contactId}
            onChange={setContactId}
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
          <LineItemBuilder items={items} onItemsChange={setItems} />
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
          onShippingChange={setShippingCharges}
          onAdjustmentChange={setAdjustment}
        />
      </div>

      {/* Action Bar */}
      <div className="sticky bottom-8 left-0 right-0 flex justify-end gap-3 p-4 bg-white border border-dash-border rounded-xl shadow-lg backdrop-blur-md">
        <DashButton variant="secondary" disabled={isSaving} className="px-8">Save as draft</DashButton>
        <DashButton
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          className="px-8"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            'Finalise document'
          )}
        </DashButton>
      </div>
    </div>
  );
};

export default InvoiceFormContainer;

'use client';

import React, { useState } from 'react';
import LineItemBuilder from './LineItemBuilder';
import TotalsSummaryPanel from './TotalsSummaryPanel';
import CustomFieldsRenderer, { CustomFieldDefinition } from './CustomFieldsRenderer';
import AttachmentDropzone from './AttachmentDropzone';
import ContactSelector from './ContactSelector';
import { PremiumInput, PremiumTextarea } from '@/components/ui/premium-inputs';
import { LineItem, calculateInvoiceTotals } from '@/lib/invoicing/calculations';

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
    <div className="flex flex-col gap-8 max-w-5xl mx-auto p-8 bg-[var(--n900)] min-h-screen">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-[var(--card)] border border-[var(--bdr)] rounded-[var(--r16)]">
        <div className="md:col-span-2 space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-[var(--t1)] font-space text-xl font-bold">
              Invoice <span className="text-[var(--accent2)]">Details</span>
            </h2>
            <p className="text-[var(--t3)] text-xs uppercase tracking-widest font-semibold">
              General Information & Configuration
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
        
        <div className="bg-[var(--n800)] p-4 rounded-[var(--r12)] border border-[var(--bdr)] flex flex-col gap-4">
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-[var(--t3)] uppercase">Invoice Number</label>
             <PremiumInput 
               placeholder="e.g. INV-001" 
               className="h-10" 
               value={invoiceNumber}
               onChange={(e) => setInvoiceNumber(e.target.value)}
             />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-[var(--t3)] uppercase">Issue Date</label>
             <PremiumInput 
               type="date" 
               className="h-10" 
               value={issueDate}
               onChange={(e) => setIssueDate(e.target.value)}
             />
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-[var(--t3)] uppercase">Due Date</label>
             <PremiumInput 
               type="date" 
               className="h-10" 
               value={dueDate}
               onChange={(e) => setDueDate(e.target.value)}
             />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-[var(--t1)] font-space text-lg font-semibold">
              Line <span className="text-[var(--accent2)]">Items</span>
            </h3>
            <p className="text-[var(--t3)] text-[11px] uppercase tracking-wider font-medium">
              Products and services billed
            </p>
          </div>
        </div>
        
        <div className="bg-[var(--card)] border border-[var(--bdr)] rounded-[var(--r16)] overflow-hidden">
          <LineItemBuilder items={items} onItemsChange={setItems} />
        </div>
      </div>

      {/* Footer / Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--t3)]">
              Terms & Conditions
            </label>
            <PremiumTextarea
              placeholder="Enter your payment terms, late fees, or special instructions..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

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
      <div className="sticky bottom-8 left-0 right-0 flex justify-end gap-3 p-4 bg-[var(--n800)] border border-[var(--bdrh)] rounded-[var(--r12)] shadow-2xl backdrop-blur-md">
        <button disabled={isSaving} className="btn-ghost px-8">Save as Draft</button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary px-8 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            'Finalise Document'
          )}
        </button>
      </div>
    </div>
  );
};

export default InvoiceFormContainer;

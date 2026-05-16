'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import InvoiceFormContainer from '../invoices/InvoiceFormContainer';
import { saveQuote, updateQuote } from '@/app/actions/quotes';

interface QuoteClientWrapperProps {
  workspaceId: string;
  contacts: any[];
  initialData?: any;
  quoteId?: string;
}

const QuoteClientWrapper: React.FC<QuoteClientWrapperProps> = ({
  workspaceId,
  contacts,
  initialData,
  quoteId,
}) => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      // Remove fields not present in 'quotes' table and map others
      const { amount_due, amount_paid, invoice_number, due_date, custom_field_values, ...rest } = data;

      let res;
      if (quoteId) {
        res = await updateQuote(quoteId, {
          ...rest,
          workspace_id: workspaceId,
          quote_number: invoice_number,
          valid_until: due_date || null,
        });
      } else {
        res = await saveQuote({
          ...rest,
          workspace_id: workspaceId,
          status: 'draft',
          quote_number: invoice_number.includes('Q-') ? invoice_number : invoice_number.replace('INV-', 'Q-'),
          valid_until: due_date || null,
        });
      }

      if (res.success) {
        toast.success(quoteId ? 'Proposal updated successfully' : 'Proposal created successfully');
        router.push('/quotes');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to save proposal');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <InvoiceFormContainer
      initialData={{
        ...initialData,
        invoice_number: initialData?.invoice_number || 'Q-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
      }}
      contacts={contacts}
      onSave={handleSave}
      isSaving={isSaving}
    />
  );
};

export default QuoteClientWrapper;

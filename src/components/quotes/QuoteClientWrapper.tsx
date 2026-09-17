'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import InvoiceFormContainer from '../invoices/InvoiceFormContainer';
import { saveQuote, updateQuote, sendQuoteNow } from '@/app/actions/quotes';

interface QuoteClientWrapperProps {
  workspaceId: string;
  contacts: any[];
  initialData?: any;
  quoteId?: string;
  /** Open Pipeline deals available to link this quote to (public.opportunities). */
  deals?: any[];
}

const QuoteClientWrapper: React.FC<QuoteClientWrapperProps> = ({
  workspaceId,
  contacts,
  initialData,
  quoteId,
  deals = [],
}) => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [dealId, setDealId] = useState(initialData?.deal_id || '');

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      // Remove fields not present in 'quotes' table and map others
      const { amount_due, amount_paid, invoice_number, due_date, custom_field_values, status, ...rest } = data;

      // InvoiceFormContainer's "Save & Send" button submits status:'sent' to mean
      // "save and send now" — that must not be written to the DB directly (a quote
      // shouldn't read as 'sent' if the email never actually goes out). Save as
      // draft/unchanged here and let sendQuoteNow() below flip it to 'sent' only
      // once the email genuinely succeeds. Mirrors InvoiceClientWrapper.tsx.
      const wantsSendNow = status === 'sent';

      let res;
      if (quoteId) {
        res = await updateQuote(quoteId, {
          ...rest,
          workspace_id: workspaceId,
          quote_number: invoice_number,
          valid_until: due_date || null,
          deal_id: dealId || null,
        });
      } else {
        res = await saveQuote({
          ...rest,
          workspace_id: workspaceId,
          status: 'draft',
          quote_number: invoice_number.includes('Q-') ? invoice_number : invoice_number.replace('INV-', 'Q-'),
          valid_until: due_date || null,
          deal_id: dealId || null,
        });
      }

      if (res.success) {
        if (wantsSendNow) {
          const newQuoteId = quoteId || (res as any).data?.id;
          const sendResult = newQuoteId ? await sendQuoteNow(newQuoteId) : { success: false, error: 'Quote id missing' };
          if (sendResult.success) {
            toast.success('Quote sent');
          } else {
            toast.success(quoteId ? 'Quote updated' : 'Quote saved');
            toast.error(sendResult.error || 'Saved, but the email failed to send');
          }
        } else {
          toast.success(quoteId ? 'Quote updated successfully' : 'Quote created successfully');
        }
        router.push('/quotes');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to save quote');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {deals.length > 0 && (
        <div className="p-4 bg-white border border-dash-border rounded-2xl flex flex-col gap-2">
          <label className="text-xs font-bold !text-dash-text">Linked deal (optional)</label>
          <select
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
            className="w-full h-10 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus:ring-2 focus:ring-dash-accent"
          >
            <option value="">No linked deal</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>{deal.title}</option>
            ))}
          </select>
        </div>
      )}
      <InvoiceFormContainer
        initialData={{
          ...initialData,
          invoice_number: initialData?.invoice_number || 'Q-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
        }}
        contacts={contacts}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
};

export default QuoteClientWrapper;

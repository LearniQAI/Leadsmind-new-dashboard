'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, Wallet } from 'lucide-react';
import InvoiceFormContainer from './InvoiceFormContainer';
import { saveInvoice, updateInvoice, sendInvoiceNow } from '@/app/actions/finance';
import { applyRetainerToInvoice } from '@/app/actions/retainers';
import SchedulingModal, { SchedulingConfig } from './SchedulingModal';

interface InvoiceClientWrapperProps {
  workspaceId: string;
  contacts: any[];
  initialData?: any;
  customFieldDefinitions?: any[];
  defaultTaxRate?: number;
  retainerBalance?: number;
}

const InvoiceClientWrapper: React.FC<InvoiceClientWrapperProps> = ({
  workspaceId,
  contacts,
  initialData,
  customFieldDefinitions = [],
  defaultTaxRate = 0,
  retainerBalance = 0,
}) => {
  const router = useRouter();
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingRetainer, setIsApplyingRetainer] = useState(false);

  const outstanding = Number(initialData?.amount_due ?? initialData?.total_amount ?? 0);
  const canApplyRetainer = !!initialData?.id && retainerBalance > 0 && outstanding > 0;

  const handleApplyRetainer = async () => {
    setIsApplyingRetainer(true);
    try {
      const res = await applyRetainerToInvoice(initialData.id, initialData.contact_id, workspaceId);
      if (res.success) {
        toast.success(`Applied ${res.appliedAmount?.toFixed(2)} from retainer balance`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to apply retainer credit');
      }
    } catch {
      toast.error('Failed to apply retainer credit');
    } finally {
      setIsApplyingRetainer(false);
    }
  };

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      // InvoiceFormContainer's "Finalise document" button submits status:'sent'
      // to signal "save and send now" — that must NOT be written to the DB
      // directly (an invoice shouldn't read as 'sent' if the email never
      // actually goes out). Strip status here and let sendInvoiceNow() below
      // flip it to 'sent' only once the email genuinely succeeds.
      const wantsSendNow = data.status === 'sent';
      const { status, ...rest } = data;
      const payload = {
        ...rest,
        ...(wantsSendNow ? {} : { status }),
        workspace_id: workspaceId,
      };

      const res = initialData?.id
        ? await updateInvoice(initialData.id, payload)
        // skipAutoNotify: wantsSendNow — when the user asked to send now,
        // saveInvoice()'s own draft-status auto-notify must be suppressed so
        // sendInvoiceNow() below is the only email that goes out.
        : await saveInvoice(payload, { skipAutoNotify: wantsSendNow });

      if (res.success) {
        if (wantsSendNow) {
          const invoiceId = initialData?.id || (res as any).data?.id;
          const sendResult = invoiceId ? await sendInvoiceNow(invoiceId) : { success: false, error: 'Invoice id missing' };
          if (sendResult.success) {
            toast.success('Invoice sent');
          } else {
            toast.success(initialData?.id ? 'Invoice updated' : 'Invoice saved');
            toast.error(sendResult.error || 'Saved, but the email failed to send');
          }
        } else {
          toast.success(initialData?.id ? 'Invoice updated successfully' : 'Invoice saved as draft — notification email sent');
        }
        router.push('/invoices');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to save invoice');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {canApplyRetainer && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-dash-border bg-dash-surface p-4 no-print">
          <div className="flex items-center gap-3">
            <Wallet size={18} className="text-dash-accent" />
            <div>
              <p className="text-sm font-bold !text-dash-text">Retainer credit available</p>
              <p className="text-xs !text-dash-textMuted">
                This contact has {retainerBalance.toFixed(2)} available. Apply it against the {outstanding.toFixed(2)} still owed on this invoice.
              </p>
            </div>
          </div>
          <button
            onClick={handleApplyRetainer}
            disabled={isApplyingRetainer}
            className="shrink-0 rounded-lg bg-dash-accent px-4 py-2 text-xs font-bold text-white hover:bg-dash-accent/90 disabled:opacity-50 transition-all motion-reduce:transition-none"
          >
            {isApplyingRetainer ? 'Applying...' : 'Apply retainer credit'}
          </button>
        </div>
      )}

      <InvoiceFormContainer
        initialData={initialData}
        contacts={contacts}
        customFieldDefinitions={customFieldDefinitions}
        onSave={handleSave}
        isSaving={isSaving}
        defaultTaxRate={defaultTaxRate}
      />

      <div className="fixed bottom-12 left-12 z-[100] no-print">
         <button
           onClick={() => setIsScheduling(true)}
           className="bg-dash-accent hover:bg-dash-accent/90 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all motion-reduce:transition-none group"
           title="Schedule Delivery"
         >
            <CalendarClock size={24} className="group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform motion-reduce:transition-none" />
         </button>
      </div>

      <SchedulingModal 
        open={isScheduling}
        onOpenChange={setIsScheduling}
        onSchedule={(config: SchedulingConfig) => {
          toast.info("Scheduling configuration captured. Please finalise the invoice.");
        }}
      />
    </>
  );
};

export default InvoiceClientWrapper;

'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, Wallet } from 'lucide-react';
import InvoiceFormContainer from './InvoiceFormContainer';
import { saveInvoice, updateInvoice, sendInvoiceNow } from '@/app/actions/finance';
import { applyRetainerToInvoice } from '@/app/actions/retainers';
import SchedulingModal, { SchedulingConfig } from './SchedulingModal';

const SAVE_TIMEOUT_MS = 45_000;
// Sending renders a PDF (headless Chromium) and calls the email provider, so it gets longer.
const SEND_TIMEOUT_MS = 60_000;

/** Hard client-side cap so a hung request becomes a visible, retryable error instead of a spinner that never ends. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

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

  // One operation id for this form. Re-sent on every Retry/double-click of the same Save so a retry after a lost
  // response returns the invoice that was already created instead of creating a second one.
  const operationIdRef = useRef<string>(crypto.randomUUID());
  // Once the invoice row exists (even if the email step then failed), later attempts update THAT invoice.
  const savedInvoiceIdRef = useRef<string | null>(null);
  const lastDataRef = useRef<any>(null);
  const savingRef = useRef(false); // blocks a second submit in the same tick
  const [saveError, setSaveError] = useState<{ message: string; retryLabel: string } | null>(null);

  const handleSave = async (data: any) => {
    if (savingRef.current) return;
    savingRef.current = true;
    lastDataRef.current = data;
    setIsSaving(true);
    setSaveError(null);
    // The form (InvoiceFormContainer) owns every field and is never unmounted or reset here, so whatever the user typed
    // survives any failure below; the inline banner offers Retry.
    try {
      // InvoiceFormContainer's "Save & Send" button submits status:'sent' to signal "save and send now" — that must NOT
      // be written to the DB directly (an invoice shouldn't read as 'sent' if the email never actually goes out). Strip
      // status here and let sendInvoiceNow() flip it to 'sent' only once the email genuinely succeeds.
      const wantsSendNow = data.status === 'sent';
      const { status, ...rest } = data;
      const payload = {
        ...rest,
        ...(wantsSendNow ? {} : { status }),
        workspace_id: workspaceId,
        clientOperationId: operationIdRef.current,
      };

      let invoiceId: string | null = initialData?.id || savedInvoiceIdRef.current;
      let res: any = invoiceId
        ? await withTimeout(updateInvoice(invoiceId, payload), SAVE_TIMEOUT_MS)
        // skipAutoNotify: wantsSendNow — the draft auto-notify must be suppressed so sendInvoiceNow() below is the
        // only email that goes out.
        : await withTimeout(saveInvoice(payload, { skipAutoNotify: wantsSendNow }), SAVE_TIMEOUT_MS);

      // A replay means an earlier attempt already created the row: apply what is in the form NOW to that invoice.
      if (res.success && res.replayed && res.data?.id) {
        res = await withTimeout(updateInvoice(res.data.id, payload), SAVE_TIMEOUT_MS);
      }

      if (!res.success) {
        setSaveError({ message: res.error || 'The invoice could not be saved. Your entries are still here — try again.', retryLabel: 'Retry save' });
        return;
      }
      invoiceId = invoiceId || res.data?.id || null;
      savedInvoiceIdRef.current = invoiceId;

      if (wantsSendNow) {
        const sendResult: any = invoiceId
          ? await withTimeout(sendInvoiceNow(invoiceId), SEND_TIMEOUT_MS)
          : { success: false, error: 'Invoice id missing' };
        if (!sendResult.success) {
          setSaveError({
            message: `The invoice was saved as a draft, but it could not be sent: ${
              sendResult.error === 'Contact has no email address'
                ? 'this client has no email address. Add one to the client, then retry.'
                : sendResult.error || 'unknown error'
            }`,
            retryLabel: 'Retry sending',
          });
          return;
        }
        toast.success('Invoice sent');
      } else {
        toast.success(initialData?.id ? 'Invoice updated successfully' : 'Invoice saved');
      }
      operationIdRef.current = crypto.randomUUID(); // consumed
      // Land on the saved invoice's preview (where it can be reviewed and sent).
      router.push(invoiceId ? `/invoices?selected=${invoiceId}` : '/invoices');
      router.refresh();
    } catch (error: any) {
      setSaveError({
        message: error?.message === 'timeout'
          ? 'This is taking longer than expected. Your entries are kept. Press Retry — it will not create a duplicate invoice.'
          : 'Network problem — your entries are kept. Check your connection and press Retry.',
        retryLabel: 'Retry',
      });
    } finally {
      savingRef.current = false;
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
        saveError={saveError}
        onRetry={() => lastDataRef.current && handleSave(lastDataRef.current)}
        onDismissError={() => setSaveError(null)}
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

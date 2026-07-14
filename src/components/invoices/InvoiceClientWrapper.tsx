'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';
import InvoiceFormContainer from './InvoiceFormContainer';
import { saveInvoice, updateInvoice } from '@/app/actions/finance';
import SchedulingModal, { SchedulingConfig } from './SchedulingModal';

interface InvoiceClientWrapperProps {
  workspaceId: string;
  contacts: any[];
  initialData?: any;
  customFieldDefinitions?: any[];
}

const InvoiceClientWrapper: React.FC<InvoiceClientWrapperProps> = ({
  workspaceId,
  contacts,
  initialData,
  customFieldDefinitions = [],
}) => {
  const router = useRouter();
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      const res = initialData?.id
        ? await updateInvoice(initialData.id, {
            ...data,
            workspace_id: workspaceId,
          })
        : await saveInvoice({
            ...data,
            workspace_id: workspaceId,
          });

      if (res.success) {
        toast.success(initialData?.id ? 'Invoice updated successfully' : 'Invoice saved successfully');
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
      <InvoiceFormContainer
        initialData={initialData}
        contacts={contacts}
        customFieldDefinitions={customFieldDefinitions}
        onSave={handleSave}
        isSaving={isSaving}
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

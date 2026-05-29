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
           className="bg-[var(--accent)] hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all group"
           title="Schedule Delivery"
         >
            <CalendarClock size={24} className="group-hover:scale-110 transition-transform" />
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

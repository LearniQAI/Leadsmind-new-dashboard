'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { ErasureReceipt } from '@/app/actions/popia';
import { BadgeCheck, CheckCircle2, Printer } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';

interface ErasureReceiptModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ErasureReceipt | null;
}

export function ErasureReceiptModal({ isOpen, onOpenChange, receipt }: ErasureReceiptModalProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-dash-border !text-dash-text max-w-lg rounded-2xl overflow-hidden shadow-xl p-6">

        {/* Printable Area Wrapper */}
        <div id="popia-receipt-print-area" className="space-y-4 print:bg-white print:text-black print:p-8 print:rounded-none">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #popia-receipt-print-area, #popia-receipt-print-area * {
                visibility: visible;
              }
              #popia-receipt-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          {/* Header */}
          <div className="text-center pb-4 border-b border-dash-border print:border-black/20">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green/15 text-green mb-2 print:text-emerald-600 print:bg-emerald-50">
              <BadgeCheck size={20} />
            </div>
            <h3 className="text-[16px] font-bold !text-dash-text tracking-tight print:text-black">
              POPIA Deletion Certificate
            </h3>
            <p className="text-[10px] !text-dash-textMuted font-semibold print:text-gray-500">
              Right-to-Erasure Transaction Log
            </p>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 text-[12px]">
            <div className="flex justify-between py-1.5 border-b border-dash-border print:border-black/10">
              <span className="!text-dash-textMuted print:text-gray-600">Receipt Reference:</span>
              <span className="font-mono font-bold !text-dash-text print:text-black">{receipt.receiptId}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dash-border print:border-black/10">
              <span className="!text-dash-textMuted print:text-gray-600">Timestamp:</span>
              <span className="!text-dash-text print:text-black">{new Date(receipt.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dash-border print:border-black/10">
              <span className="!text-dash-textMuted print:text-gray-600">Legal Reference:</span>
              <span className="!text-dash-text font-semibold print:text-black text-right">{receipt.legalReference}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dash-border print:border-black/10">
              <span className="!text-dash-textMuted print:text-gray-600">Scrubbed Email:</span>
              <span className="font-mono !text-dash-text print:text-black">{receipt.originalEmail}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dash-border print:border-black/10">
              <span className="!text-dash-textMuted print:text-gray-600">Anonymized Identifier:</span>
              <span className="font-mono text-dash-accent print:text-blue-600">{receipt.anonymizedEmail}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dash-border print:border-black/10">
              <span className="!text-dash-textMuted print:text-gray-600">Sequences Purged:</span>
              <span className="!text-dash-text print:text-black">{receipt.purgedExecutionsCount} active runs</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dash-border print:border-black/10">
              <span className="!text-dash-textMuted print:text-gray-600">Queue Items Removed:</span>
              <span className="!text-dash-text print:text-black">{receipt.purgedQueueCount} queued</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dash-border print:border-black/10">
              <span className="!text-dash-textMuted print:text-gray-600">Suppression Status:</span>
              <span className="text-green font-bold print:text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={10} /> Active Suppression
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-dash-border print:border-black/10">
              <span className="!text-dash-textMuted print:text-gray-600">CRM Contacts Scour:</span>
              <span className="!text-dash-text print:text-black">
                {receipt.anonymizedCRM ? 'Scrubbed CRM Linked Entities' : 'No LinkedIn Entity'}
              </span>
            </div>
          </div>

          {/* Legal Compliance declaration */}
          <div className="p-3 bg-dash-surface rounded-lg border border-dash-border text-[10px] !text-dash-textMuted leading-normal print:bg-gray-50 print:border-gray-200 print:text-gray-600">
            <strong>Compliance Declaration:</strong> This transaction confirms that the workspace has fully executed the request for erasure under Section 24 of the South African Protection of Personal Information Act. Core PII attributes have been permanently anonymized, marketing campaigns have been cancelled, and the email has been routed to the workspace suppression list to prevent future imports.
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="pt-4 border-t border-dash-border flex items-center justify-end gap-3 w-full no-print">
          <DashButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close Receipt
          </DashButton>
          <DashButton
            type="button"
            size="sm"
            onClick={handlePrint}
          >
            <Printer size={11} />
            Print / Save PDF
          </DashButton>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

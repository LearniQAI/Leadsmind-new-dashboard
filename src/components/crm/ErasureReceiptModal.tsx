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
      <DialogContent className="bg-[#080f28] border border-white/10 text-white max-w-lg rounded-[16px] overflow-hidden shadow-2xl p-6 font-dm-sans">
        
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
          <div className="text-center pb-4 border-b border-white/10 print:border-black/20">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#10b981]/15 text-[#10b981] mb-2 print:text-emerald-600 print:bg-emerald-50">
              <i className="fa-solid fa-certificate text-xl"></i>
            </div>
            <h3 className="text-[16px] font-bold text-[#eef2ff] font-space-grotesk tracking-tight uppercase print:text-black">
              POPIA Deletion Certificate
            </h3>
            <p className="text-[10px] text-[#4a5a82] uppercase tracking-[0.8px] font-semibold print:text-gray-500">
              Right-to-Erasure Transaction Log
            </p>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 text-[12px]">
            <div className="flex justify-between py-1.5 border-b border-white/5 print:border-black/10">
              <span className="text-[#94a3c8] print:text-gray-600">Receipt Reference:</span>
              <span className="font-mono font-bold text-[#eef2ff] print:text-black">{receipt.receiptId}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 print:border-black/10">
              <span className="text-[#94a3c8] print:text-gray-600">Timestamp:</span>
              <span className="text-[#eef2ff] print:text-black">{new Date(receipt.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 print:border-black/10">
              <span className="text-[#94a3c8] print:text-gray-600">Legal Reference:</span>
              <span className="text-[#eef2ff] font-semibold print:text-black text-right">{receipt.legalReference}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 print:border-black/10">
              <span className="text-[#94a3c8] print:text-gray-600">Scrubbed Email:</span>
              <span className="font-mono text-[#eef2ff] print:text-black">{receipt.originalEmail}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 print:border-black/10">
              <span className="text-[#94a3c8] print:text-gray-600">Anonymized Identifier:</span>
              <span className="font-mono text-[#3b82f6] print:text-blue-600">{receipt.anonymizedEmail}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 print:border-black/10">
              <span className="text-[#94a3c8] print:text-gray-600">Sequences Purged:</span>
              <span className="text-[#eef2ff] print:text-black">{receipt.purgedExecutionsCount} active runs</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 print:border-black/10">
              <span className="text-[#94a3c8] print:text-gray-600">Queue Items Removed:</span>
              <span className="text-[#eef2ff] print:text-black">{receipt.purgedQueueCount} queued</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 print:border-black/10">
              <span className="text-[#94a3c8] print:text-gray-600">Suppression Status:</span>
              <span className="text-[#10b981] font-bold print:text-emerald-600 flex items-center gap-1">
                <i className="fa-solid fa-circle-check text-[10px]"></i> Active Suppression
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5 print:border-black/10">
              <span className="text-[#94a3c8] print:text-gray-600">CRM Contacts Scour:</span>
              <span className="text-[#eef2ff] print:text-black">
                {receipt.anonymizedCRM ? 'Scrubbed CRM Linked Entities' : 'No LinkedIn Entity'}
              </span>
            </div>
          </div>

          {/* Legal Compliance declaration */}
          <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-[10px] text-[#94a3c8] leading-normal print:bg-gray-50 print:border-gray-200 print:text-gray-600">
            <strong>Compliance Declaration:</strong> This transaction confirms that the workspace has fully executed the request for erasure under Section 24 of the South African Protection of Personal Information Act. Core PII attributes have been permanently anonymized, marketing campaigns have been cancelled, and the email has been routed to the workspace suppression list to prevent future imports.
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="pt-4 border-t border-white/5 flex items-center justify-end gap-3 w-full no-print">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-white/5 text-[#94a3c8] hover:text-[#eef2ff] hover:bg-white/10 border border-white/5 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all"
          >
            Close Receipt
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="bg-[#2563eb] text-white hover:bg-[#2563eb]/90 rounded-lg px-4 py-2 text-[12px] font-bold transition-all shadow-lg shadow-[#2563eb]/20 flex items-center gap-2"
          >
            <i className="fa-solid fa-print text-[11px]"></i>
            Print / Save PDF
          </button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

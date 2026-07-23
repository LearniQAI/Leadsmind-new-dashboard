'use client';

import React from 'react';
import { format } from 'date-fns';
import { ShieldCheck, FileText, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOCUMENT_MUTED_TEXT } from '@/lib/design/documentTemplateTokens';

interface SarsTaxInvoicePdfProps {
  invoice: any;
  workspace: {
    registered_name: string;
    registered_address: string;
    vat_number: string;
  };
  customer: {
    registered_name?: string;
    address?: string;
    vat_number?: string;
  };
}

const SarsTaxInvoicePdf: React.FC<SarsTaxInvoicePdfProps> = ({
  invoice,
  workspace,
  customer,
}) => {
  const subtotal = Number(invoice.subtotal) || 0;
  const taxTotal = Number(invoice.tax_total) || 0;
  const grandTotal = Number(invoice.total_amount) || 0;

  return (
    <div className="bg-white text-[#04091a] p-16 rounded-none shadow-none printable-area font-sans max-w-[210mm] mx-auto min-h-[297mm]">
      {/* 1. Prominent "Tax Invoice" Header */}
      <div className="flex justify-between items-start border-b-4 border-gray-900 pb-8 mb-12">
        <div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-gray-900 mb-2">
            Tax Invoice
          </h1>
          <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
            <ShieldCheck size={14} /> SARS Compliant Document
          </div>
        </div>
        <div className="text-right">
          <p className={`text-[10px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT} mb-1`}>Invoice Number</p>
          <p className="text-xl font-black text-gray-900">{invoice.invoice_number}</p>
          <p className={`text-[10px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT} mt-4 mb-1`}>Date of Issue</p>
          <p className="text-sm font-bold">{format(new Date(invoice.created_at), 'dd MMMM yyyy')}</p>
        </div>
      </div>

      {/* 2. Seller & Customer Registered Details */}
      <div className="grid grid-cols-2 gap-16 mb-16">
        {/* Seller Info */}
        <div className="space-y-4">
          <p className={`text-[9px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT} border-b border-gray-100 pb-2`}>Seller (VAT Registered)</p>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">{workspace.registered_name}</h3>
            <p className={`text-[11px] ${DOCUMENT_MUTED_TEXT} font-medium leading-relaxed mt-1 whitespace-pre-line`}>
              {workspace.registered_address}
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100 inline-block">
               <p className={`text-[9px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT}`}>VAT Registration No.</p>
               <p className="text-sm font-black text-gray-900">{workspace.vat_number || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="space-y-4">
          <p className={`text-[9px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT} border-b border-gray-100 pb-2`}>Recipient / Billed To</p>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">
               {customer.registered_name || `${invoice.contact?.first_name} ${invoice.contact?.last_name}`}
            </h3>
            <p className={`text-[11px] ${DOCUMENT_MUTED_TEXT} font-medium leading-relaxed mt-1 whitespace-pre-line`}>
               {customer.address || 'Address not provided'}
            </p>
            {customer.vat_number && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100 inline-block">
                <p className={`text-[9px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT}`}>Customer VAT No.</p>
                <p className="text-sm font-black text-gray-900">{customer.vat_number}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Line Items Matrix */}
      <table className="w-full mb-16 border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-900">
            <th className={`py-4 text-[9px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT} text-left w-1/2`}>Detailed Description</th>
            <th className={`py-4 text-[9px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT} text-right`}>Qty</th>
            <th className={`py-4 text-[9px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT} text-right`}>Unit Price</th>
            <th className={`py-4 text-[9px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT} text-right`}>Tax</th>
            <th className={`py-4 text-[9px] font-black uppercase tracking-widest ${DOCUMENT_MUTED_TEXT} text-right`}>Amount (ZAR)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(invoice.items || []).map((item: any, idx: number) => {
            const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
            // No per-line-item tax rate/amount is captured anywhere in the invoice-creation
            // flow today (see Task 14 audit — tax_total is always 0, nothing calculates VAT).
            // This used to fabricate a flat 15% here regardless of the real stored tax_total,
            // producing a document that contradicted itself. Line-item tax is always 0 until
            // real per-line tax calculation is designed and added — not invented here.
            const lineTax = 0;
            return (
              <tr key={idx} className="group">
                <td className="py-6 pr-4">
                   <p className="font-bold text-sm text-gray-900">{item.description}</p>
                   {item.product_id && <p className={`text-[10px] ${DOCUMENT_MUTED_TEXT} mt-0.5`}>SKU: {item.product_id.substring(0,8).toUpperCase()}</p>}
                </td>
                <td className={`py-6 text-right text-sm font-bold ${DOCUMENT_MUTED_TEXT}`}>{item.quantity}</td>
                <td className={`py-6 text-right text-sm font-bold ${DOCUMENT_MUTED_TEXT}`}>${(Number(item.rate) || 0).toLocaleString()}</td>
                <td className={`py-6 text-right text-sm font-bold ${DOCUMENT_MUTED_TEXT}`}>${lineTax.toLocaleString()}</td>
                <td className="py-6 text-right font-black text-base text-gray-900 font-space">${lineTotal.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 4. Explicit Tax Split Block */}
      <div className="flex justify-between items-start pt-12 border-t-4 border-gray-900">
        <div className="max-w-md">
           <div className={`flex items-center gap-2 ${DOCUMENT_MUTED_TEXT} mb-4`}>
              <Scale size={18} />
              <p className="text-[10px] font-black uppercase tracking-widest">SARS Tax Declaration</p>
           </div>
           <p className={`text-[10px] ${DOCUMENT_MUTED_TEXT} leading-relaxed italic`}>
              All amounts are in South African Rand (ZAR) unless otherwise specified.
           </p>
        </div>

        <div className="w-80 space-y-4">
          <div className={`flex justify-between ${DOCUMENT_MUTED_TEXT} text-xs font-bold`}>
            <span>Total Value (Excl. VAT)</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="space-y-1">
               <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Total VAT</p>
               <p className="text-xl font-black text-gray-900 font-space">${taxTotal.toLocaleString()}</p>
            </div>
            <div className="text-right">
               <FileText size={20} className="text-gray-200" />
            </div>
          </div>

          <div className="flex justify-between items-end pt-4 border-t border-gray-100">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900">Total Amount Due</span>
            <span className="text-4xl font-black text-gray-900 font-space tracking-tighter">${grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Legal Footer */}
      <div className="mt-auto pt-24 text-center">
         <div className="inline-block px-6 py-2 border-2 border-gray-900 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-gray-900">
            Official Tax Document
         </div>
         <p className={`text-[9px] ${DOCUMENT_MUTED_TEXT} mt-6 uppercase tracking-widest font-bold`}>
            Generated by Leadsmind Invoicing Engine — {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
         </p>
      </div>
    </div>
  );
};

export default SarsTaxInvoicePdf;

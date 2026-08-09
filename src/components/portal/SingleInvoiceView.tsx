'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, FileText, Calendar, ShieldCheck, 
  CreditCard, Package, ExternalLink, Printer,
  Eye, Monitor, ZoomIn, ZoomOut, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import SarsTaxInvoicePdf from '@/components/invoices/templates/SarsTaxInvoicePdf';
import { captureInvoiceView } from '@/app/actions/portal';
import { DOCUMENT_MUTED_TEXT } from '@/lib/design/documentTemplateTokens';

interface SingleInvoiceViewProps {
  invoice: any;
  attachments?: any[];
}

export default function SingleInvoiceView({
  invoice,
  attachments = [],
}: SingleInvoiceViewProps) {
  const [paying, setPaying] = useState(false);
  const [viewMode, setViewMode] = useState<'detail' | 'pdf'>('detail');
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (invoice?.id) {
      captureInvoiceView(invoice.id).catch((err) => {
        console.error('Error capturing invoice view telemetry:', err);
      });
    }
  }, [invoice?.id]);

  
  const outstanding = Number(invoice.amount_due || invoice.total_amount || 0) - Number(invoice.amount_paid || 0);
  const settings = invoice.workspace?.invoice_settings || {};
  const allowPartial = settings.allow_partial_payments ?? false;
  
  const [paymentMode, setPaymentMode] = useState<'full' | 'partial'>('full');
  const [customAmount, setCustomAmount] = useState('');

  const handlePrint = () => window.print();

  const handlePayNow = async () => {
    setPaying(true);
    try {
      let amountToPay = outstanding;
      if (paymentMode === 'partial') {
        const parsed = parseFloat(customAmount);
        if (isNaN(parsed) || parsed <= 0) {
          toast.error('Please enter a valid payment amount greater than R0.');
          setPaying(false);
          return;
        }
        if (parsed > outstanding) {
          toast.error(`Payment amount cannot exceed the outstanding balance of R${outstanding.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}.`);
          setPaying(false);
          return;
        }
        amountToPay = parsed;
      }

      const { generateInvoicePayFastUrl } = await import('@/app/actions/finance');
      const returnUrl = `${window.location.origin}/portal/invoices/${invoice.id}?payment=success`;
      const cancelUrl = `${window.location.origin}/portal/invoices/${invoice.id}?payment=canceled`;

      toast.loading('Initializing secure checkout redirect...');
      const res = await generateInvoicePayFastUrl(invoice.id, amountToPay, returnUrl, cancelUrl);
      
      if (res.error) {
        toast.dismiss();
        toast.error(res.error);
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error('Failed to initiate secure checkout session');
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadPdf = () => {
    // Falls back to browser printing/saving dialog
    window.print();
  };

  if (!invoice) return null;

  const workspaceDetails = {
    registered_name: invoice.workspace?.registered_name || invoice.workspace?.name || 'LeadsMind Merchant',
    registered_address: invoice.workspace?.registered_address || 'Address not configured',
    vat_number: invoice.workspace?.vat_number || '',
  };

  const customerDetails = {
    registered_name: `${invoice.contact?.first_name || ''} ${invoice.contact?.last_name || ''}`.trim() || 'Valued Customer',
    address: invoice.contact?.address || '',
    vat_number: invoice.contact?.vat_number || '',
  };

  return (
    <div className="min-h-screen bg-[#04091a] text-[var(--t1)] selection:bg-[var(--accent)] selection:text-white">
      {/* Top Navbar */}
      <nav className="border-b border-[var(--bdr)] bg-[rgba(11,17,33,0.8)] backdrop-blur-md sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xl font-space font-black tracking-tighter text-[var(--accent2)]">
              {invoice.workspace?.name || 'LEADSMIND'}
            </div>
            <span className="h-4 w-px bg-[var(--bdr)] mx-2" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--t3)] font-sans">Secure Portal</span>
          </div>

          {/* Toggle View Mode Buttons */}
          <div className="flex items-center bg-[#111d47]/40 border border-white/5 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('detail')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                viewMode === 'detail' ? "bg-accent text-white" : "text-[#4a5a82] hover:text-white"
              )}
            >
              <Monitor size={14} /> Detail Info
            </button>
            <button
              onClick={() => setViewMode('pdf')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                viewMode === 'pdf' ? "bg-accent text-white" : "text-[#4a5a82] hover:text-white"
              )}
            >
              <FileText size={14} /> PDF Document Reader
            </button>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={handlePrint} className="btn-ghost !h-10 !px-4 text-xs gap-2 flex items-center">
                <Printer size={16} /> Print
             </button>
             <button onClick={handleDownloadPdf} className="btn-primary !h-10 !px-6 text-xs gap-2 flex items-center">
                <Download size={16} /> Save PDF
             </button>
          </div>
        </div>
      </nav>

      {viewMode === 'detail' ? (
        /* Regular Invoice Detail Layout */
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12 items-start animate-in fade-in duration-300">
          {/* Left Column: Document */}
          <div className="lg:col-span-2 space-y-8">
             <div className="bg-white !text-slate-900 p-12 md:p-16 rounded-[var(--r24)] shadow-2xl printable-area font-sans border border-gray-100">
                {/* Header: brand lockup + invoice meta, separated by a single rule.
                    No status badge here — that indicator stays in dashboard/portal
                    chrome only, never on the downloadable/printable document. */}
                <div className="flex justify-between items-start pb-9 mb-9 border-b border-slate-100">
                   <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-lg font-bold uppercase tracking-tight !text-slate-900">
                          Leadsmind <span className="!text-primary">HQ</span>
                        </div>
                        <div className={`text-xs ${DOCUMENT_MUTED_TEXT} leading-relaxed mt-1`}>
                           <p className={`!${DOCUMENT_MUTED_TEXT}`}>{invoice.workspace?.invoice_settings?.company_address || invoice.workspace?.registered_address || 'Address not configured'}</p>
                           <p className={`!${DOCUMENT_MUTED_TEXT}`}>{invoice.workspace?.invoice_settings?.company_email || 'billing@leadsmind.io'}</p>
                        </div>
                      </div>
                   </div>
                   <div className="text-right shrink-0 pl-8">
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] !text-primary mb-2">Invoice</p>
                      <p className="text-lg font-bold !text-slate-900 tracking-tight">{invoice.invoice_number}</p>
                   </div>
                </div>

                {/* Billed To / dates — plain columns, no boxed cards */}
                <div className="flex justify-between items-start gap-10 mb-12">
                   <div>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] !${DOCUMENT_MUTED_TEXT} mb-3`}>Billed To</p>
                      <p className="text-base font-semibold !text-slate-900 mb-1">
                         {invoice.contact?.first_name} {invoice.contact?.last_name || ''}
                      </p>
                      <p className={`text-sm !${DOCUMENT_MUTED_TEXT}`}>{invoice.contact?.email}</p>
                   </div>

                   <div className="flex gap-10 text-right shrink-0">
                      <div>
                         <p className={`text-[10px] font-bold uppercase tracking-[0.2em] !${DOCUMENT_MUTED_TEXT} mb-2`}>Issue Date</p>
                         <p className="text-sm font-semibold !text-slate-900">{invoice.created_at ? format(new Date(invoice.created_at), 'dd MMM yyyy') : 'N/A'}</p>
                      </div>
                      <div>
                         <p className={`text-[10px] font-bold uppercase tracking-[0.2em] !${DOCUMENT_MUTED_TEXT} mb-2`}>Due Date</p>
                         <p className={`text-sm font-semibold ${invoice.due_date && new Date(invoice.due_date) < new Date() ? '!text-red' : '!text-slate-900'}`}>
                            {invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : 'On Receipt'}
                         </p>
                      </div>
                   </div>
                </div>

                {(settings.show_line_items ?? true) ? (
                  <div className="overflow-x-auto mb-10">
                  <table className="w-full min-w-[500px] border-collapse">
                     <thead>
                        <tr className="border-b-2 border-slate-900/90">
                           <th className={`py-3 text-[10px] font-bold uppercase tracking-[0.2em] ${DOCUMENT_MUTED_TEXT} text-left`}>Description</th>
                           <th className={`py-3 text-[10px] font-bold uppercase tracking-[0.2em] ${DOCUMENT_MUTED_TEXT} text-right`}>Qty</th>
                           <th className={`py-3 text-[10px] font-bold uppercase tracking-[0.2em] ${DOCUMENT_MUTED_TEXT} text-right`}>Rate</th>
                           <th className={`py-3 text-[10px] font-bold uppercase tracking-[0.2em] ${DOCUMENT_MUTED_TEXT} text-right`}>Amount</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {(invoice.items || []).map((item: any, idx: number) => {
                          const rate = Number(item.unit_price ?? item.rate ?? 0);
                          const quantity = Number(item.quantity ?? 1);
                          const amount = rate * quantity;
                          return (
                            <tr key={idx}>
                               <td className="py-4 text-sm font-medium !text-slate-900">{item.description}</td>
                               <td className={`py-4 text-right text-sm ${DOCUMENT_MUTED_TEXT} tabular-nums`}>{quantity}</td>
                               <td className={`py-4 text-right text-sm ${DOCUMENT_MUTED_TEXT} tabular-nums`}>R {rate.toLocaleString('en-ZA')}</td>
                               <td className="py-4 text-right text-sm font-semibold !text-slate-900 tabular-nums">R {amount.toLocaleString('en-ZA')}</td>
                            </tr>
                          );
                        })}
                     </tbody>
                  </table>
                  </div>
                ) : (
                  <div className={`mb-10 text-xs ${DOCUMENT_MUTED_TEXT} font-medium`}>
                    Detailed line items are hidden by the billing administrator. Only totals are displayed below.
                  </div>
                )}

                <div className="flex justify-end">
                   <div className="w-72 space-y-3">
                      <div className={`flex justify-between items-center ${DOCUMENT_MUTED_TEXT} text-sm`}>
                         <span>Subtotal</span>
                         <span className="font-medium !text-slate-900 tabular-nums">R {(Number(invoice.subtotal || invoice.total_amount) || 0).toLocaleString('en-ZA')}</span>
                      </div>
                      <div className={`flex justify-between items-center ${DOCUMENT_MUTED_TEXT} text-sm pb-3 border-b border-slate-100`}>
                         <span>Tax</span>
                         <span className="font-medium !text-slate-900 tabular-nums">R {(Number(invoice.tax_total) || 0).toLocaleString('en-ZA')}</span>
                      </div>
                      <div className="flex justify-between items-end pt-1">
                         <span className="text-[10px] font-bold uppercase tracking-[0.25em] !text-primary mb-1">Total Due</span>
                         <span className="text-3xl font-bold !text-slate-900 tracking-tight tabular-nums">R {(Number(invoice.total_amount) || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Column: Sidebar Actions */}
          <div className="space-y-8 no-print">
             <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r24)] p-8 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent2)] mb-6 flex items-center gap-2 font-space">
                   <CreditCard size={14} /> Settlement Options
                </h3>
                <div className="space-y-6">
                   {invoice.status === 'paid' ? (
                     <div className="w-full flex flex-col items-center justify-center py-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black uppercase rounded-[var(--r16)] text-xs tracking-widest select-none gap-2 font-space">
                       <CheckCircle2 size={24} />
                       Invoice Fully Settled
                     </div>
                   ) : (
                     <div className="space-y-4">
                       {/* Partial Payment Card toggles */}
                       {allowPartial && (
                         <div className="bg-[#111d47]/20 border border-white/5 rounded-2xl p-4 space-y-4">
                           <p className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82]">Payment Type</p>
                           <div className="grid grid-cols-2 gap-2">
                             <button
                               onClick={() => setPaymentMode('full')}
                               className={cn(
                                 "py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                                 paymentMode === 'full' 
                                   ? "bg-accent/10 text-white border-accent" 
                                   : "bg-[#080f28]/40 text-[#4a5a82] border-transparent hover:border-white/5"
                               )}
                             >
                               Pay In Full
                             </button>
                             <button
                               onClick={() => setPaymentMode('partial')}
                               className={cn(
                                 "py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                                 paymentMode === 'partial' 
                                   ? "bg-accent/10 text-white border-accent" 
                                   : "bg-[#080f28]/40 text-[#4a5a82] border-transparent hover:border-white/5"
                               )}
                             >
                               Part Payment
                             </button>
                           </div>

                           {paymentMode === 'partial' && (
                             <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                               <label className="text-[9px] font-black uppercase tracking-widest text-t3">Enter Custom Amount (ZAR)</label>
                               <input
                                 type="number"
                                 value={customAmount}
                                 onChange={(e) => setCustomAmount(e.target.value)}
                                 placeholder={`Max: R ${outstanding.toLocaleString('en-ZA')}`}
                                 className="w-full bg-[#080f28] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                               />
                             </div>
                           )}
                         </div>
                       )}

                       {/* Checkout Action Button */}
                       <button 
                         onClick={handlePayNow}
                         disabled={paying}
                         className="w-full btn-primary !h-14 rounded-[var(--r16)] text-xs uppercase font-black tracking-widest transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2"
                       >
                         {paying ? 'Redirecting...' : (
                           paymentMode === 'full' 
                             ? `Pay Now — R ${outstanding.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
                             : `Pay Partial — R ${Number(customAmount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
                         )}
                       </button>
                     </div>
                   )}
                   <p className="text-[10px] text-[var(--t4)] text-center font-medium">
                      Secure South African checkout via PayFast (EFT, Credit Cards, Masterpass)
                   </p>
                </div>
                
                <div className="mt-12 pt-8 border-t border-[var(--bdr)]">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--t3)] mb-4 flex items-center gap-2 font-space">
                      <Package size={14} /> Attachments & Assets
                   </h4>
                   {attachments.length > 0 ? (
                      <div className="space-y-2">
                         {attachments.map((file, idx) => (
                            <a 
                              key={idx}
                              href={file.file_path}
                              target="_blank"
                              className="flex items-center justify-between p-3 rounded-[var(--r12)] bg-[var(--n900)] border border-[var(--bdr)] hover:border-[var(--accent)] transition-all group"
                            >
                               <div className="flex items-center gap-3 min-w-0">
                                  <FileText className="h-4 w-4 text-[var(--t4)] group-hover:text-[var(--accent2)]" />
                                  <div className="min-w-0">
                                     <p className="text-[10px] font-bold text-[var(--t1)] truncate">{file.file_name}</p>
                                     <p className="text-[9px] text-[var(--t4)]">{(file.file_size / 1024 / 1024).toFixed(1)} MB</p>
                                  </div>
                               </div>
                               <ExternalLink size={12} className="text-[var(--t4)]" />
                            </a>
                         ))}
                      </div>
                   ) : (
                      <p className="text-[10px] text-[var(--t4)] italic font-medium">No additional files provided</p>
                   )}
                </div>
             </div>
          </div>
        </div>
      ) : (
        /* SARS In-Browser PDF reader layout */
        <div className="bg-[#121620] min-h-[calc(100vh-80px)] flex flex-col p-6 animate-in fade-in duration-300 no-print">
          {/* Reader Toolbar */}
          <div className="max-w-4xl w-full mx-auto bg-[#1a1f2e] border border-white/5 h-12 rounded-xl px-4 flex items-center justify-between shadow-lg mb-6">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-t3">
              <FileText size={14} className="text-blue-400" /> In-Browser PDF Engine
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-3 bg-[#080f28]/40 border border-white/5 rounded-lg p-0.5">
              <button 
                onClick={() => setZoom(prev => Math.max(50, prev - 10))}
                className="w-7 h-7 hover:bg-white/5 rounded text-[#4a5a82] hover:text-white flex items-center justify-center transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[10px] font-mono font-bold text-white px-1">{zoom}%</span>
              <button 
                onClick={() => setZoom(prev => Math.min(200, prev + 10))}
                className="w-7 h-7 hover:bg-white/5 rounded text-[#4a5a82] hover:text-white flex items-center justify-center transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrint}
                className="btn-ghost !h-8 !px-3 text-[10px] uppercase tracking-wider gap-1.5 flex items-center font-bold"
              >
                <Printer size={12} /> Print
              </button>
              <button 
                onClick={handleDownloadPdf}
                className="btn-primary !h-8 !px-3.5 text-[10px] uppercase tracking-wider gap-1.5 flex items-center font-bold"
              >
                <Download size={12} /> Download
              </button>
            </div>
          </div>

          {/* Document Sheet Area */}
          <div className="flex-1 overflow-auto flex justify-center p-4">
            <div 
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              className="transition-transform duration-200"
            >
              <SarsTaxInvoicePdf
                invoice={invoice}
                workspace={workspaceDetails}
                customer={customerDetails}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

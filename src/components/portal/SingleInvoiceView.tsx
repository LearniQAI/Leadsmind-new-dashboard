'use client';

import React from 'react';
import { 
  Download, FileText, Calendar, ShieldCheck, 
  CreditCard, Package, ExternalLink, Printer 
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SingleInvoiceViewProps {
  invoice: any;
  attachments?: any[];
}

const SingleInvoiceView: React.FC<SingleInvoiceViewProps> = ({
  invoice,
  attachments = [],
}) => {
  const handlePrint = () => window.print();

  if (!invoice) return null;

  return (
    <div className="min-h-screen bg-[#04091a] text-[var(--t1)] selection:bg-[var(--accent)] selection:text-white">
      {/* Top Navbar for Public Portal */}
      <nav className="border-b border-[var(--bdr)] bg-[rgba(11,17,33,0.8)] backdrop-blur-md sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xl font-black tracking-tighter text-[var(--accent2)]">LEADSMIND</div>
            <span className="h-4 w-px bg-[var(--bdr)] mx-2" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--t3)]">Secure Portal</span>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handlePrint} className="btn-ghost !h-10 !px-4 text-xs gap-2">
                <Printer size={16} /> Print
             </button>
             <button className="btn-primary !h-10 !px-6 text-xs gap-2">
                <Download size={16} /> Download PDF
             </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Left Column: Document */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white text-[#04091a] p-12 md:p-16 rounded-[var(--r24)] shadow-2xl printable-area">
              <div className="flex justify-between items-start mb-16">
                 <div>
                    <div className="text-2xl font-black tracking-tighter mb-4 text-[var(--accent)]">LEADSMIND</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 space-y-1">
                       <p>123 Enterprise Avenue</p>
                       <p>Silicon Valley, CA 94043</p>
                       <p>billing@leadsmind.ai</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <h1 className="text-6xl font-black uppercase tracking-tighter mb-2">Invoice</h1>
                    <p className="text-xs font-black text-[var(--accent)] uppercase tracking-[0.2em]">{invoice.invoice_number}</p>
                    <div className="mt-4">
                       <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          invoice.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                       )}>
                         {invoice.status}
                       </span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-16">
                 <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-3">Billed To</span>
                    <h2 className="text-xl font-black uppercase tracking-tighter mb-1">
                       {invoice.contact?.first_name} {invoice.contact?.last_name}
                    </h2>
                    <p className="text-xs font-bold text-gray-500">{invoice.contact?.email}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Issue Date</span>
                       <span className="text-sm font-black">{format(new Date(invoice.created_at), 'dd MMM yyyy')}</span>
                    </div>
                    <div>
                       <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Due Date</span>
                       <span className="text-sm font-black text-rose-600">{invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : 'On Receipt'}</span>
                    </div>
                 </div>
              </div>

              <table className="w-full mb-16">
                 <thead>
                    <tr className="border-b-2 border-gray-100">
                       <th className="py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-left">Description</th>
                       <th className="py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Qty</th>
                       <th className="py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Rate</th>
                       <th className="py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Amount</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {(invoice.items || []).map((item: any, idx: number) => (
                       <tr key={idx}>
                          <td className="py-6 font-bold text-sm">{item.description}</td>
                          <td className="py-6 text-right text-sm text-gray-500 font-bold">{item.quantity || 0}</td>
                          <td className="py-6 text-right text-sm text-gray-500 font-bold">${(Number(item.rate) || 0).toLocaleString()}</td>
                          <td className="py-6 text-right font-black text-base">${((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toLocaleString()}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>

              <div className="flex justify-end pt-8 border-t-2 border-gray-100">
                 <div className="w-64 space-y-3">
                    <div className="flex justify-between text-gray-500 text-xs font-bold">
                       <span>Subtotal</span>
                       <span>${(Number(invoice.subtotal || invoice.total_amount) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-xs font-bold pb-3 border-b border-gray-50">
                       <span>Tax</span>
                       <span>${(Number(invoice.tax_total) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">Grand Total</span>
                       <span className="text-3xl font-black font-space">${(Number(invoice.total_amount) || 0).toLocaleString()}</span>
                    </div>
                 </div>
              </div>
              
              <div className="mt-16 pt-8 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3 text-gray-300">
                   <ShieldCheck size={32} />
                   <div>
                     <p className="text-[9px] font-black uppercase tracking-widest">Verified Merchant</p>
                     <p className="text-[8px] font-bold">Document ID: {invoice.id}</p>
                   </div>
                </div>
              </div>
           </div>
        </div>

        {/* Right Column: Sidebar Actions */}
        <div className="space-y-8 no-print">
           <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r24)] p-8 shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent2)] mb-6 flex items-center gap-2">
                 <CreditCard size={14} /> Settlement Options
              </h3>
              <div className="space-y-4">
                 <button className="w-full btn-primary !h-14 rounded-[var(--r16)] text-xs uppercase font-black tracking-widest">
                    Pay Now — ${(Number(invoice.total_amount) || 0).toLocaleString()}
                 </button>
                 <p className="text-[10px] text-[var(--t4)] text-center font-medium">
                    Secure 256-bit encrypted transaction
                 </p>
              </div>
              
              <div className="mt-12 pt-8 border-t border-[var(--bdr)]">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--t3)] mb-4 flex items-center gap-2">
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
    </div>
  );
};

export default SingleInvoiceView;

'use client';

import React, { useState } from 'react';
import { ShieldCheck, Check, X, Download, Lock, PenTool, Globe } from 'lucide-react';
import { format } from 'date-fns';

interface PublicQuotePortalProps {
  quote: any;
}

const PublicQuotePortal: React.FC<PublicQuotePortalProps> = ({ quote }) => {
  const [accepted, setAccepted] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  
  if (!quote) return null;

  const handleAccept = () => {
    setIsSigning(true);
    // Simulate capture of IP and Timestamp
    setTimeout(() => {
      setAccepted(true);
      setIsSigning(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#04091a] text-[var(--t1)] selection:bg-[var(--accent)] selection:text-white">
      <nav className="border-b border-[var(--bdr)] bg-[rgba(11,17,33,0.8)] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xl font-black tracking-tighter text-[var(--accent2)]">LEADSMIND</div>
            <span className="h-4 w-px bg-[var(--bdr)] mx-2" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--t3)]">Proposal Portal</span>
          </div>
          <div className="flex items-center gap-3">
             <button className="btn-ghost !h-10 !px-4 text-xs gap-2">
                <Download size={16} /> Save Copy
             </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-white text-[#04091a] p-12 md:p-20 rounded-[var(--r24)] shadow-2xl relative overflow-hidden">
          {accepted && (
            <div className="absolute top-10 right-10 rotate-12 border-4 border-emerald-500 text-emerald-500 px-6 py-2 font-black uppercase text-4xl opacity-40 select-none">
              Accepted
            </div>
          )}

          <div className="flex justify-between items-start mb-20">
             <div>
                <h1 className="text-5xl font-black uppercase tracking-tighter text-gray-900 mb-2">Proposal</h1>
                <p className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">{quote.quote_number}</p>
             </div>
             <div className="text-right">
                <div className="text-xl font-black tracking-tighter mb-4 text-gray-900">LEADSMIND</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 space-y-1">
                   <p>123 Enterprise Avenue</p>
                   <p>Silicon Valley, CA 94043</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-20">
             <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Prepared For</span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-1">
                   {quote.contact?.first_name} {quote.contact?.last_name}
                </h2>
                <p className="text-sm font-bold text-gray-500">{quote.contact?.email}</p>
             </div>
             <div className="flex flex-col justify-center">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Issue Date</span>
                   <span className="text-sm font-black">{format(new Date(quote.created_at), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Expires</span>
                   <span className="text-sm font-black text-rose-600">30 Days from Issue</span>
                </div>
             </div>
          </div>

          <table className="w-full mb-16">
             <thead>
                <tr className="border-b-2 border-gray-900 text-left">
                   <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Description</th>
                   <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Qty</th>
                   <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Rate</th>
                   <th className="py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Total</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {(quote.items || []).map((item: any, idx: number) => (
                   <tr key={idx}>
                      <td className="py-8 font-bold text-base text-gray-900">{item.description}</td>
                      <td className="py-8 text-right text-sm font-black text-gray-500">{item.quantity}</td>
                      <td className="py-8 text-right text-sm font-black text-gray-500">${Number(item.rate).toLocaleString()}</td>
                      <td className="py-8 text-right font-black text-xl text-gray-900">${(item.quantity * item.rate).toLocaleString()}</td>
                   </tr>
                ))}
             </tbody>
          </table>

          <div className="flex justify-end mb-20">
             <div className="w-80 space-y-4">
                <div className="flex justify-between items-end border-t-4 border-gray-900 pt-8">
                   <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">Project Total</span>
                   <span className="text-5xl font-black text-gray-900 tracking-tighter">${Number(quote.total_amount).toLocaleString()}</span>
                </div>
             </div>
          </div>

          {/* Signature & Audit Log Area */}
          <div className="mt-20 pt-12 border-t border-gray-100 bg-gray-50 -mx-12 -mb-12 p-12 md:p-20 md:-mx-20 md:-mb-20">
             {!accepted ? (
               <div className="max-w-xl mx-auto text-center space-y-8">
                  <div className="space-y-4">
                     <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Legal Agreement</h3>
                     <p className="text-xs font-bold text-gray-500 leading-relaxed">
                        By clicking "Accept Proposal", you agree to the terms and conditions outlined above. This document constitutes a binding contract once signed electronically.
                     </p>
                  </div>
                  
                  <div className="p-6 bg-white rounded-3xl border border-gray-200 flex flex-col gap-4">
                     <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <Lock size={14} className="text-blue-500" /> Secure E-Signature Chain
                     </div>
                     <button 
                       onClick={handleAccept}
                       disabled={isSigning}
                       className="w-full bg-blue-600 text-white h-16 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                     >
                        {isSigning ? "Processing..." : <>Sign & Accept Proposal <PenTool size={18} /></>}
                     </button>
                  </div>
               </div>
             ) : (
               <div className="max-w-2xl mx-auto p-10 bg-white rounded-3xl border-2 border-emerald-100 shadow-xl animate-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                        <Check size={32} />
                     </div>
                     <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-emerald-600">Proposal Accepted</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Electronic record sealed</p>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 text-[10px] font-black uppercase tracking-widest text-gray-400">
                     <div className="space-y-2">
                        <p className="flex items-center gap-2"><Globe size={12} /> IP Address: 192.168.1.1</p>
                        <p className="flex items-center gap-2"><ShieldCheck size={12} /> Hash: LM-QA-88219-SEC</p>
                     </div>
                     <div className="space-y-2 text-right">
                        <p>Timestamp: {format(new Date(), 'dd MMM yyyy HH:mm:ss')}</p>
                        <p>Status: Legally Binding</p>
                     </div>
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicQuotePortal;

"use client";

import { Invoice, Quote } from "@/types/crm.types";
import { 
 FileText, 
 Plus, 
 ExternalLink, 
 Clock, 
 CheckCircle2, 
 AlertCircle,
 ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ContactInvoicesSectionProps {
 contactId: string;
 invoices: Invoice[];
 quotes: Quote[];
}

export function ContactInvoicesSection({ contactId, invoices, quotes }: ContactInvoicesSectionProps) {
 const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.status !== 'void' ? inv.total_amount : 0), 0);
 const totalPaid = invoices.reduce((acc, inv) => acc + (inv.status === 'paid' ? inv.total_amount : 0), 0);
 const balance = totalInvoiced - totalPaid;

 return (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
   {/* Summary Cards */}
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="card__wrapper no-height">
     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Total Invoiced</p>
     <p className="text-2xl font-black text-white tracking-tighter">${totalInvoiced.toLocaleString()}</p>
    </div>
    <div className="card__wrapper no-height">
     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Total Paid</p>
     <div className="flex items-center gap-2">
      <p className="text-2xl font-black text-success tracking-tighter">${totalPaid.toLocaleString()}</p>
      <CheckCircle2 size={14} className="text-success opacity-30" />
     </div>
    </div>
    <div className="card__wrapper no-height bg-primary/5 border-primary/20">
     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-2">Outstanding Balance</p>
     <p className="text-2xl font-black text-white tracking-tighter">${balance.toLocaleString()}</p>
    </div>
   </div>

   {/* Action Header */}
   <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
     <FileText size={18} className="text-primary" />
     <h5 className="text-xs font-black text-white uppercase tracking-[0.2em]">Billing & Estimates</h5>
    </div>
    <Link href={`/invoices/new?contactId=${contactId}`} className="btn btn-sm btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest gap-2 shadow-lg shadow-primary/20">
     <Plus size={14} />
     Create Invoice
    </Link>
   </div>


   {/* Lists */}
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {/* Invoices List */}
    <div className="space-y-4">
     <div className="flex items-center justify-between px-2">
       <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Recent Invoices</p>
       <Link href="/invoices" className="text-[10px] font-bold text-[#6c47ff] uppercase tracking-widest hover:underline">View All</Link>
     </div>
     
     <div className="card__wrapper no-height p-0 overflow-hidden">
      <div className="divide-y divide-white/[0.03]">
       {invoices.length === 0 ? (
        <div className="p-16 text-center">
         <FileText size={40} className="mx-auto text-white/5 mb-4 opacity-10" />
         <p className="text-[10px] text-white/10 font-black uppercase tracking-[0.3em]">No Invoice Records</p>
        </div>
       ) : (
        invoices.map((inv) => (
         <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-white/[0.01] transition-all group">
          <div className="flex items-center gap-5">
           <div className={cn(
            "h-11 w-11 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110",
            inv.status === 'paid' ? "bg-success/5 border-success/10 text-success" : 
            inv.status === 'open' ? "bg-primary/5 border-primary/10 text-primary" : 
            "bg-white/5 border-white/10 text-white/20"
           )}>
            {inv.status === 'paid' ? <CheckCircle2 size={20} /> : 
             inv.status === 'open' ? <Clock size={20} /> : 
             <FileText size={20} />}
           </div>
           <div>
            <div className="flex items-center gap-3 mb-1">
             <p className="text-sm font-black text-white uppercase tracking-tighter">{inv.invoice_number}</p>
             <span className={cn(
              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border",
              inv.status === 'paid' ? "bg-success/10 border-success/20 text-success" : 
              inv.status === 'open' ? "bg-primary/10 border-primary/20 text-primary" : 
              "bg-white/5 border-white/10 text-white/30"
             )}>
              {inv.status}
             </span>
            </div>
            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.15em]">
             {inv.due_date ? `Due ${format(new Date(inv.due_date), 'MMM dd, yyyy')}` : 'No deadline'}
            </p>
           </div>
          </div>
          <div className="text-right flex items-center gap-6">
           <div>
            <p className="text-base font-black text-white tracking-tighter">${inv.total_amount.toLocaleString()}</p>
            <p className="text-[9px] text-white/10 uppercase font-black tracking-[0.2em]">{inv.currency}</p>
           </div>
           <Link href={`/invoices/${inv.id}`} className="btn btn-icon btn-sm btn-outline-theme-border rounded-xl">
            <ExternalLink size={14} />
           </Link>
          </div>
         </div>
        ))
       )}
      </div>
     </div>

    </div>

    {/* Quotes List */}
    <div className="space-y-4">
     <div className="flex items-center justify-between px-2">
       <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Recent Quotes</p>
       <Link href="/quotes" className="text-[10px] font-bold text-[#6c47ff] uppercase tracking-widest hover:underline">View All</Link>
     </div>
     
     <div className="bg-white/3 border border-white/5 rounded-[32px] overflow-hidden">
      <div className="divide-y divide-white/5">
       {quotes.length === 0 ? (
        <div className="p-12 text-center">
         <FileText size={32} className="mx-auto text-white/5 mb-4" />
         <p className="text-xs text-white/40 font-bold uppercase tracking-widest">No quotes generated</p>
        </div>
       ) : (
        quotes.map((quote) => (
         <div key={quote.id} className="p-5 flex items-center justify-between hover:bg-white/2 transition-all group">
          <div className="flex items-center gap-4">
           <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center border",
            quote.status === 'accepted' ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" : 
            quote.status === 'sent' ? "bg-blue-500/5 border-blue-500/10 text-blue-400" : 
            "bg-white/5 border-white/10 text-white/40"
           )}>
            {quote.status === 'accepted' ? <CheckCircle2 size={18} /> : 
             quote.status === 'sent' ? <ArrowRight size={18} /> : 
             <AlertCircle size={18} />}
           </div>
           <div>
            <div className="flex items-center gap-2">
             <p className="text-sm font-bold text-white uppercase tracking-tight">{quote.quote_number}</p>
             <span className={cn(
              "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border",
              quote.status === 'accepted' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : 
              quote.status === 'sent' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : 
              "bg-white/5 border-white/10 text-white/30"
             )}>
              {quote.status}
             </span>
            </div>
            <p className="text-[11px] text-white/30 mt-0.5">
             {quote.expiry_date ? `Expires ${format(new Date(quote.expiry_date), 'MMM dd, yyyy')}` : 'No expiry'}
            </p>
           </div>
          </div>
          <div className="text-right flex items-center gap-4">
           <div>
            <p className="text-sm font-black text-white tracking-tight">${quote.total_amount.toLocaleString()}</p>
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{quote.currency}</p>
           </div>
           <Link href={`/quotes/${quote.id}`}>
            <Button variant="ghost" size="icon" className="group-hover:text-white text-white/20 rounded-lg">
             <ExternalLink size={16} />
            </Button>
           </Link>
          </div>
         </div>
        ))
       )}
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}

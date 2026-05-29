'use client';

import React, { useState } from 'react';
import {
  Search, Download, MoreVertical, Calendar, FileText, X, CheckCircle2,
  AlertTriangle, Clock, ArrowRight, ShieldCheck, Printer, Trash2,
  CheckCircle, XCircle, Send, Pencil, Eraser, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { deleteInvoice, updateInvoiceStatus, writeOffInvoice } from '@/app/actions/finance';
import WriteOffDialog from './WriteOffDialog';

interface InvoiceMasterDetailProps {
  invoices: any[];
}

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'void', 'written_off'];

function StatusBadge({ status }: { status: string }) {
  const statusLower = status?.toLowerCase();
  
  if (statusLower === 'paid') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[10px] font-black uppercase tracking-widest text-[#34d399] shadow-[0_0_10px_rgba(16,185,129,0.1)]"><CheckCircle2 size={10} /> Paid</span>;
  }
  if (statusLower === 'sent') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.2)] text-[10px] font-black uppercase tracking-widest text-[#60a5fa] shadow-[0_0_10px_rgba(37,99,235,0.1)]"><Send size={10} /> Sent</span>;
  }
  if (statusLower === 'viewed') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-[10px] font-black uppercase tracking-widest text-[#a78bfa] shadow-[0_0_10px_rgba(139,92,246,0.1)]"><Clock size={10} /> Viewed</span>;
  }
  if (statusLower === 'overdue') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[10px] font-black uppercase tracking-widest text-[#f87171] shadow-[0_0_10px_rgba(239,68,68,0.1)]"><AlertTriangle size={10} /> Overdue</span>;
  }
  if (statusLower === 'void') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50"><XCircle size={10} /> Void</span>;
  }
  if (statusLower === 'written_off') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50"><Eraser size={10} /> Written Off</span>;
  }
  
  return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[10px] font-black uppercase tracking-widest text-[#fbbf24] shadow-[0_0_10px_rgba(245,158,11,0.1)]"><Clock size={10} /> {status || 'Draft'}</span>;
}

export function InvoiceMasterDetail({ invoices: initialInvoices }: InvoiceMasterDetailProps) {
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [selectedId, setSelectedId] = useState<string | null>(initialInvoices[0]?.id || null);
  const [search, setSearch] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setBy] = useState<string>('newest');

  const [writeOffOpen, setWriteOffOpen] = useState(false);

  const selectedInvoice = invoices.find(i => i.id === selectedId);

  const handleWriteOff = async (data: { amount: number; reason: string }) => {
    if (!selectedInvoice) return;
    
    toast.promise(writeOffInvoice(selectedInvoice.id, selectedInvoice.workspace_id, data.amount, data.reason), {
      loading: 'Writing off invoice debt...',
      success: (res) => {
        if (!res.success) throw new Error(res.error || 'Write-off failed');
        setInvoices(prev => prev.map(i => i.id === selectedInvoice.id ? { ...i, status: 'written_off' } : i));
        return 'Invoice written off successfully';
      },
      error: (err) => err.message
    });
  };

  const filteredInvoices = invoices
    .filter(i => {
      const matchesSearch = 
        i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        i.contact?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        i.contact?.last_name?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || i.status?.toLowerCase() === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'highest') return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
      if (sortBy === 'lowest') return (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0);
      if (sortBy === 'name') {
        const nameA = `${a.contact?.first_name} ${a.contact?.last_name}`.toLowerCase();
        const nameB = `${b.contact?.first_name} ${b.contact?.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

  const handleStatusChange = async (invoice: any, status: string) => {
    toast.promise(updateInvoiceStatus(invoice.id, status), {
      loading: `Marking as ${status}...`,
      success: (res) => {
        if (!res.success) throw new Error(res.error || 'Update failed');
        setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status } : i));
        return `Invoice marked as ${status}`;
      },
      error: (err) => err.message
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    toast.promise(deleteInvoice(deleteTarget.id), {
      loading: 'Deleting invoice...',
      success: (res) => {
        if (!res.success) throw new Error(res.error || 'Delete failed');
        setInvoices(prev => prev.filter(i => i.id !== deleteTarget.id));
        if (selectedId === deleteTarget.id) setSelectedId(invoices.find(i => i.id !== deleteTarget.id)?.id || null);
        setDeleteOpen(false);
        return 'Invoice deleted successfully';
      },
      error: (err) => err.message
    });
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] w-full">
      {/* LEFT PANEL: List */}
      <div className="w-full md:w-[340px] flex-shrink-0 flex flex-col border-r border-[var(--bdr)] bg-[var(--n800)] h-[400px] md:h-full">
        <div className="p-4 border-b border-[var(--bdr)]">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--t3)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="w-full bg-[rgba(255,255,255,0.05)] border border-[var(--bdr)] rounded-[var(--r8)] pl-9 pr-3 py-2 text-xs text-[var(--t1)] outline-none focus:border-[var(--accent)] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Link href="/quotes" className="flex-1">
              <button className="w-full h-10 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-t3 hover:bg-accent/10 hover:text-accent2 hover:border-accent/20 transition-all">
                <FileText size={12} /> Quotes
              </button>
            </Link>
            <Link href="/portal/login" className="flex-1">
              <button className="w-full h-10 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-t3 hover:bg-accent/10 hover:text-accent2 hover:border-accent/20 transition-all">
                <Globe size={12} /> Portal
              </button>
            </Link>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 no-scrollbar">
              {['all', 'draft', 'sent', 'paid', 'void'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border shrink-0",
                    statusFilter === status 
                      ? "bg-[var(--accent)] border-[var(--accent)] text-white" 
                      : "bg-white/5 border-white/5 text-[var(--t3)] hover:border-white/20"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setBy(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--t2)] outline-none focus:border-[var(--accent)] cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Amount: High to Low</option>
                <option value="lowest">Amount: Low to High</option>
                <option value="name">Client Name: A-Z</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-8 w-8 text-[var(--t4)] mx-auto mb-2 opacity-20" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--t4)]">No Records</p>
            </div>
          ) : (
            filteredInvoices.map(inv => (
              <button
                key={inv.id}
                onClick={() => setSelectedId(inv.id)}
                className={cn(
                  "w-full text-left p-4 transition-all border-b border-[var(--bdr)] group relative",
                  selectedId === inv.id ? "bg-[var(--accentg)] border-r-2 border-r-[var(--accent)]" : "hover:bg-[rgba(255,255,255,0.03)]"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold font-space text-[var(--accent2)] uppercase tracking-wider">{inv.invoice_number}</span>
                  <span className="text-xs font-bold font-space text-[var(--t1)]">{(Number(inv.total_amount) || 0).toLocaleString('en-US', { style: 'currency', currency: inv.currency || 'USD' })}</span>
                </div>
                <h4 className="text-[13px] font-semibold text-[var(--t1)] truncate mb-2">
                  {inv.contact ? `${inv.contact.first_name} ${inv.contact.last_name}` : 'Unknown Client'}
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--t3)] font-medium">
                    <Calendar size={12} />
                    {format(new Date(inv.created_at), 'dd MMM')}
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col bg-[var(--n900)] overflow-hidden">
        {selectedInvoice ? (
          <>
            {/* Header / Actions */}
            <div className="p-4 border-b border-[var(--bdr)] flex flex-wrap items-center justify-between gap-4 bg-[var(--n800)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--r12)] bg-[var(--accentg)] flex items-center justify-center border border-[var(--accent)]/20">
                  <FileText className="h-5 w-5 text-[var(--accent2)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--t1)] font-space uppercase tracking-wide">Document Ledger</h3>
                  <p className="text-[10px] text-[var(--t3)] uppercase tracking-widest font-semibold">{selectedInvoice.invoice_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="btn-ghost !h-9 !px-4 text-xs gap-2">
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={handlePrint} className="btn-ghost !w-9 !h-9 !p-0">
                  <Printer size={14} />
                </button>

                <div className="w-px h-6 bg-[var(--bdr)] mx-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="btn-ghost !w-9 !h-9 !p-0">
                      <MoreVertical size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[var(--n800)] border border-[var(--bdrh)] shadow-2xl rounded-[var(--r12)] min-w-[180px]">
                    {INVOICE_STATUSES.filter(s => s !== selectedInvoice.status).map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(selectedInvoice, s)} className="flex items-center gap-2 cursor-pointer text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.05)] rounded-lg mx-1 px-3 py-2 text-xs">
                        Mark as {s}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-1 bg-[var(--bdr)]" />
                    <DropdownMenuItem onClick={() => setWriteOffOpen(true)} className="flex items-center gap-2 cursor-pointer text-[var(--red)] hover:bg-[rgba(239,68,68,0.1)] rounded-lg mx-1 px-3 py-2 text-xs">
                      <Eraser size={14} /> Write Off Debt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setDeleteTarget(selectedInvoice); setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-[var(--red)] hover:bg-[rgba(239,68,68,0.1)] rounded-lg mx-1 px-3 py-2 text-xs">
                      <Trash2 size={14} /> Delete Invoice
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Document Preview */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[var(--n900)] relative">
              <div className="max-w-[850px] mx-auto bg-[var(--n800)] border border-[var(--bdr)] text-white p-12 md:p-16 rounded-[var(--r24)] shadow-[0_0_60px_rgba(0,0,0,0.5)] printable-area min-h-[1000px] relative overflow-hidden">
                
                {/* Background ambient glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="flex justify-between items-start mb-16 relative z-10">
                  <div>
                    <div className="text-3xl font-black font-space text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[var(--r12)] bg-[var(--accent)] flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-white" />
                      </div>
                      LEADSMIND <span className="text-[var(--accent2)]">HQ</span>
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 space-y-2 leading-relaxed">
                      <p>123 Enterprise Avenue</p>
                      <p>Silicon Valley, CA 94043</p>
                      <p>billing@leadsmind.io</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-white/5 select-none pointer-events-none mb-4">Invoice</h1>
                    <div className="bg-white/[0.02] border border-white/5 rounded-[var(--r12)] p-5 text-left w-64 backdrop-blur-md">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">Document No.</p>
                      <p className="text-xl font-black text-primary uppercase tracking-tight mb-4">{selectedInvoice.invoice_number}</p>
                      <div className="pt-3 border-t border-white/5">
                        <StatusBadge status={selectedInvoice.status} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 relative z-10">
                  <div className="bg-white/[0.01] p-8 rounded-[var(--r16)] border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4 flex items-center gap-2">
                      <ShieldCheck size={12} className="text-primary" /> Billed To
                    </span>
                    <h2 className="text-2xl font-black uppercase font-space tracking-tight text-white mb-2">
                      {selectedInvoice.contact?.first_name} {selectedInvoice.contact?.last_name}
                    </h2>
                    <p className="text-sm font-semibold text-white/60 mb-5">{selectedInvoice.contact?.email}</p>
                    {selectedInvoice.contact?.vat_number && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">VAT:</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">{selectedInvoice.contact.vat_number}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white/[0.01] p-6 rounded-[var(--r16)] border border-white/5 flex flex-col justify-center gap-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                          <Calendar size={12} className="text-primary"/> Issue Date
                        </span>
                        <span className="text-sm font-black font-space text-white">{format(new Date(selectedInvoice.created_at), 'dd MMM yyyy')}</span>
                      </div>
                      <div className="w-full h-px bg-white/5" />
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                          <Clock size={12} className="text-rose-500"/> Due Date
                        </span>
                        <span className="text-sm font-black font-space text-rose-500">{selectedInvoice.due_date ? format(new Date(selectedInvoice.due_date), 'dd MMM yyyy') : 'On Receipt'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.02] rounded-[var(--r16)] border border-white/5 overflow-x-auto mb-16 relative z-10 custom-scrollbar">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-white/40 text-left">Description</th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">Qty</th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">Rate</th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-white/40 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(selectedInvoice.items || []).map((item: any, idx: number) => {
                        const rate = Number(item.unit_amount ?? item.rate ?? 0);
                        const quantity = Number(item.quantity ?? 0);
                        const amount = quantity * rate;
                        return (
                          <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-6 px-6 font-semibold text-sm text-white">{item.description}</td>
                            <td className="py-6 px-6 text-right text-sm text-white/60 font-bold">{quantity}</td>
                            <td className="py-6 px-6 text-right text-sm text-white/60 font-bold">${rate.toLocaleString()}</td>
                            <td className="py-6 px-6 text-right font-black font-space text-base text-white">${amount.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2 relative z-10">
                  <div className="w-[380px] space-y-4">
                    <div className="flex justify-between items-center text-white/60 text-xs font-bold px-6">
                      <span className="uppercase tracking-widest text-[10px]">Subtotal</span>
                      <span>${(Number(selectedInvoice.subtotal || selectedInvoice.total_amount) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-white/60 text-xs font-bold pb-5 border-b border-white/5 px-6">
                      <span className="uppercase tracking-widest text-[10px]">Tax</span>
                      <span>${(Number(selectedInvoice.tax_total) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-4 bg-[var(--accentg)] border border-primary/30 rounded-[var(--r16)] p-8 shadow-[0_0_40px_rgba(37,99,235,0.15)] relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                      <div className="flex flex-col gap-1.5 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Grand Total</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">USD</span>
                      </div>
                      <span className="text-4xl font-black font-space text-white tracking-tighter relative z-10">${(Number(selectedInvoice.total_amount) || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[rgba(0,0,0,0.1)]">
            <div className="empty-state">
              <div className="text-[var(--t4)] opacity-20 mb-4">
                <FileText size={48} />
              </div>
              <h3 className="text-[var(--t2)] font-semibold mb-2 text-lg">No Document Selected</h3>
              <p className="text-[var(--t3)] text-sm mb-6 max-w-[240px] text-center">Select an invoice from the list to view its details or manage payments</p>
            </div>
          </div>
        )}
      </div>

      <WriteOffDialog
        open={writeOffOpen}
        onOpenChange={setWriteOffOpen}
        invoice={selectedInvoice}
        onConfirm={handleWriteOff}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[var(--n800)] z-[1002] border border-[var(--bdrh)] rounded-[var(--r16)] max-w-sm p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-space text-[var(--t1)] uppercase tracking-tight">Delete Invoice?</DialogTitle>
          </DialogHeader>
          <p className="text-[var(--t2)] text-sm py-4">This will permanently delete invoice <strong className="text-[var(--t1)]">{deleteTarget?.invoice_number}</strong>. This cannot be undone.</p>
          <DialogFooter className="gap-3">
            <button onClick={() => setDeleteOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="btn-danger !px-8">{deleting ? 'Deleting...' : 'Delete'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Search, Download, MoreVertical, Calendar, FileText, X, CheckCircle2,
  AlertTriangle, Clock, ArrowRight, ShieldCheck, Printer, Trash2,
  CheckCircle, XCircle, Send, Pencil, Eraser, Globe
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { deleteInvoice, updateInvoiceStatus, writeOffInvoice } from '@/app/actions/finance';
import WriteOffDialog from './WriteOffDialog';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface InvoiceMasterDetailProps {
  invoices: any[];
}

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'void', 'written_off'];

function StatusBadge({ status }: { status: string }) {
  const statusLower = status?.toLowerCase();

  if (statusLower === 'paid') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-green/10 border border-green/20 text-[11px] font-bold text-green"><CheckCircle2 size={10} /> Paid</span>;
  }
  if (statusLower === 'sent') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-dash-accent/10 border border-dash-accent/20 text-[11px] font-bold text-dash-accent"><Send size={10} /> Sent</span>;
  }
  if (statusLower === 'viewed') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-purple-50 border border-purple-200 text-[11px] font-bold text-purple-600"><Clock size={10} /> Viewed</span>;
  }
  if (statusLower === 'overdue') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red/10 border border-red/20 text-[11px] font-bold text-red"><AlertTriangle size={10} /> Overdue</span>;
  }
  if (statusLower === 'void') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-dash-surface border border-dash-border text-[11px] font-bold !text-dash-textMuted"><XCircle size={10} /> Void</span>;
  }
  if (statusLower === 'written_off') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-dash-surface border border-dash-border text-[11px] font-bold !text-dash-textMuted"><Eraser size={10} /> Written Off</span>;
  }

  return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-600"><Clock size={10} /> {status || 'Draft'}</span>;
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

    setDeleting(true);
    toast.promise(deleteInvoice(deleteTarget.id), {
      loading: 'Deleting invoice...',
      success: (res) => {
        if (!res.success) throw new Error(res.error || 'Delete failed');
        setInvoices(prev => prev.filter(i => i.id !== deleteTarget.id));
        if (selectedId === deleteTarget.id) setSelectedId(invoices.find(i => i.id !== deleteTarget.id)?.id || null);
        setDeleteOpen(false);
        setDeleting(false);
        return 'Invoice deleted successfully';
      },
      error: (err) => {
        setDeleting(false);
        return err.message;
      }
    });
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] w-full bg-white">
      {/* LEFT PANEL: List */}
      <div className="w-full md:w-[340px] flex-shrink-0 flex flex-col border-r border-dash-border bg-dash-surface h-[400px] md:h-full">
        <div className="p-4 border-b border-dash-border">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 !text-dash-textMuted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="w-full bg-white border border-dash-border rounded-lg pl-9 pr-3 py-2 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Link href="/quotes" className="flex-1">
              <button className="w-full h-10 bg-white border border-dash-border rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold !text-dash-textMuted hover:bg-dash-accent/10 hover:text-dash-accent hover:border-dash-accent/20 transition-colors motion-reduce:transition-none">
                <FileText size={12} /> Quotes
              </button>
            </Link>
            <Link href="/portal/login" className="flex-1">
              <button className="w-full h-10 bg-white border border-dash-border rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold !text-dash-textMuted hover:bg-dash-accent/10 hover:text-dash-accent hover:border-dash-accent/20 transition-colors motion-reduce:transition-none">
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
                    "px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize transition-colors motion-reduce:transition-none border shrink-0",
                    statusFilter === status
                      ? "bg-dash-accent border-dash-accent text-white"
                      : "bg-white border-dash-border !text-dash-textMuted hover:border-dash-text/20"
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
                className="w-full bg-white border border-dash-border rounded-lg px-3 py-2 text-[11px] font-semibold !text-dash-textMuted outline-none focus:border-dash-accent cursor-pointer"
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
              <FileText className="h-8 w-8 !text-dash-textMuted mx-auto mb-2 opacity-40" />
              <p className="text-[11px] font-semibold !text-dash-textMuted">No records</p>
            </div>
          ) : (
            filteredInvoices.map(inv => (
              <button
                key={inv.id}
                onClick={() => setSelectedId(inv.id)}
                className={cn(
                  "w-full text-left p-4 transition-colors motion-reduce:transition-none border-b border-dash-border group relative",
                  selectedId === inv.id ? "bg-dash-accent/5 border-r-2 border-r-dash-accent" : "hover:bg-white"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-bold text-dash-accent">{inv.invoice_number}</span>
                  <span className="text-xs font-bold !text-dash-text">{(Number(inv.total_amount) || 0).toLocaleString('en-US', { style: 'currency', currency: inv.currency || 'USD' })}</span>
                </div>
                <h4 className="text-[13px] font-semibold !text-dash-text truncate mb-2">
                  {inv.contact ? `${inv.contact.first_name} ${inv.contact.last_name}` : 'Unknown Client'}
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] !text-dash-textMuted font-medium">
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
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selectedInvoice ? (
          <>
            {/* Header / Actions */}
            <div className="p-4 border-b border-dash-border flex flex-wrap items-center justify-between gap-4 bg-dash-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20">
                  <FileText className="h-5 w-5 text-dash-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-bold !text-dash-text">Document Ledger</h3>
                  <p className="text-[11px] !text-dash-textMuted font-semibold">{selectedInvoice.invoice_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DashButton variant="ghost" size="sm" onClick={handlePrint}>
                  <Download size={14} /> Download PDF
                </DashButton>
                <DashButton variant="ghost" size="icon" onClick={handlePrint}>
                  <Printer size={14} />
                </DashButton>

                <div className="w-px h-6 bg-dash-border mx-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <DashButton variant="ghost" size="icon">
                      <MoreVertical size={14} />
                    </DashButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl min-w-[180px]">
                    {INVOICE_STATUSES.filter(s => s !== selectedInvoice.status).map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(selectedInvoice, s)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg mx-1 px-3 py-2 text-xs capitalize">
                        Mark as {s}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-1 bg-dash-border" />
                    <DropdownMenuItem onClick={() => setWriteOffOpen(true)} className="flex items-center gap-2 cursor-pointer text-red hover:bg-red/10 rounded-lg mx-1 px-3 py-2 text-xs">
                      <Eraser size={14} /> Write Off Debt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setDeleteTarget(selectedInvoice); setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-red hover:bg-red/10 rounded-lg mx-1 px-3 py-2 text-xs">
                      <Trash2 size={14} /> Delete Invoice
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/*
              Document Preview — this is the printable client-facing invoice
              document (see `printable-area` below / window.print() above),
              not dashboard chrome. Like the Proposals document, it
              intentionally keeps bold/uppercase letterhead typography and
              the workspace's white-label `primary` color/logo rather than
              `dash-accent` — a document sent to a client should carry that
              workspace's brand. The surrounding chrome above (list, header,
              dropdown, dialogs) is dashboard UI and got the full dash-token
              treatment. Unlike the old version, the document itself is now
              light/print-safe rather than carrying over the app's old dark
              theme, matching standard invoice/print conventions.
            */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-dash-surface relative">
              <div className="max-w-[850px] mx-auto bg-white border border-dash-border text-slate-900 p-12 md:p-16 rounded-2xl shadow-lg printable-area min-h-[1000px] relative overflow-hidden">

                <div className="flex justify-between items-start mb-16 relative z-10">
                  <div>
                    <div className="text-3xl font-black uppercase tracking-tight mb-4 flex items-center gap-3 text-slate-900">
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-white" />
                      </div>
                      LEADSMIND <span className="text-primary">HQ</span>
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600 space-y-2 leading-relaxed">
                      <p>123 Enterprise Avenue</p>
                      <p>Silicon Valley, CA 94043</p>
                      <p>billing@leadsmind.io</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-slate-100 select-none pointer-events-none mb-4">Invoice</h1>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-left w-64">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Document No.</p>
                      <p className="text-xl font-black text-primary uppercase tracking-tight mb-4">{selectedInvoice.invoice_number}</p>
                      <div className="pt-3 border-t border-slate-100">
                        <StatusBadge status={selectedInvoice.status} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 relative z-10">
                  <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4 flex items-center gap-2">
                      <ShieldCheck size={12} className="text-primary" /> Billed To
                    </span>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">
                      {selectedInvoice.contact?.first_name} {selectedInvoice.contact?.last_name}
                    </h2>
                    <p className="text-sm font-semibold text-slate-600 mb-5">{selectedInvoice.contact?.email}</p>
                    {selectedInvoice.contact?.vat_number && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">VAT:</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{selectedInvoice.contact.vat_number}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-center gap-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2">
                          <Calendar size={12} className="text-primary"/> Issue Date
                        </span>
                        <span className="text-sm font-black text-slate-900">{format(new Date(selectedInvoice.created_at), 'dd MMM yyyy')}</span>
                      </div>
                      <div className="w-full h-px bg-slate-100" />
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2">
                          <Clock size={12} className="text-red"/> Due Date
                        </span>
                        <span className="text-sm font-black text-red">{selectedInvoice.due_date ? format(new Date(selectedInvoice.due_date), 'dd MMM yyyy') : 'On Receipt'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-x-auto mb-16 relative z-10 custom-scrollbar">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-slate-600 text-left">Description</th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-slate-600 text-right">Qty</th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-slate-600 text-right">Rate</th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-widest text-slate-600 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedInvoice.items || []).map((item: any, idx: number) => {
                        const rate = Number(item.unit_amount ?? item.rate ?? 0);
                        const quantity = Number(item.quantity ?? 0);
                        const amount = quantity * rate;
                        return (
                          <tr key={idx} className="hover:bg-white transition-colors">
                            <td className="py-6 px-6 font-semibold text-sm text-slate-900">{item.description}</td>
                            <td className="py-6 px-6 text-right text-sm text-slate-600 font-bold">{quantity}</td>
                            <td className="py-6 px-6 text-right text-sm text-slate-600 font-bold">${rate.toLocaleString()}</td>
                            <td className="py-6 px-6 text-right font-black text-base text-slate-900">${amount.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2 relative z-10">
                  <div className="w-[380px] space-y-4">
                    <div className="flex justify-between items-center text-slate-600 text-xs font-bold px-6">
                      <span className="uppercase tracking-widest text-[10px]">Subtotal</span>
                      <span>${(Number(selectedInvoice.subtotal || selectedInvoice.total_amount) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 text-xs font-bold pb-5 border-b border-slate-100 px-6">
                      <span className="uppercase tracking-widest text-[10px]">Tax</span>
                      <span>${(Number(selectedInvoice.tax_total) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-4 bg-primary/5 border border-primary/20 rounded-2xl p-8 relative overflow-hidden">
                      <div className="flex flex-col gap-1.5 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Grand Total</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">USD</span>
                      </div>
                      <span className="text-4xl font-black text-slate-900 tracking-tighter relative z-10">${(Number(selectedInvoice.total_amount) || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <DashEmptyState
              icon={FileText}
              title="No document selected"
              description="Select an invoice from the list to view its details or manage payments"
            />
          </div>
        )}
      </div>

      <WriteOffDialog
        open={writeOffOpen}
        onOpenChange={setWriteOffOpen}
        invoice={selectedInvoice}
        onConfirm={handleWriteOff}
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete invoice?"
        description={`This will permanently delete invoice ${deleteTarget?.invoice_number}. This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}

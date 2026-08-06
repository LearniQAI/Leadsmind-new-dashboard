'use client';

import React, { useState } from 'react';
import { Search, FileMinus, Calendar, Download, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createCreditNote, deleteCreditNote } from '@/app/actions/creditNotes';
import IssueCreditNoteDialog from './IssueCreditNoteDialog';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DOCUMENT_MUTED_TEXT } from '@/lib/design/documentTemplateTokens';

interface CreditNotesClientProps {
  creditNotes: any[];
  invoices: any[];
  defaultInvoiceId?: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const label = (status || 'issued').replace('_', ' ');
  const color =
    status === 'applied' ? 'bg-green/10 border-green/20 text-green' :
    status === 'draft' ? 'bg-amber-50 border-amber-200 text-amber-600' :
    'bg-dash-accent/10 border-dash-accent/20 text-dash-accent';
  return (
    <span className={cn('inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold border capitalize', color)}>
      {label}
    </span>
  );
}

export function CreditNotesClient({ creditNotes: initial, invoices: initialInvoices, defaultInvoiceId }: CreditNotesClientProps) {
  const [creditNotes, setCreditNotes] = useState<any[]>(initial);
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id || null);
  const [search, setSearch] = useState('');
  const [issueOpen, setIssueOpen] = useState(!!defaultInvoiceId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const selected = creditNotes.find(c => c.id === selectedId);

  const filtered = creditNotes.filter(c => {
    const q = search.toLowerCase();
    return (
      c.credit_number?.toLowerCase().includes(q) ||
      c.invoice?.invoice_number?.toLowerCase().includes(q) ||
      c.invoice?.contact?.first_name?.toLowerCase().includes(q) ||
      c.invoice?.contact?.last_name?.toLowerCase().includes(q)
    );
  });

  const handleIssue = async (data: { invoiceId: string; amount: number; reason: string }) => {
    const res = await createCreditNote(data);
    if (!res.success) {
      toast.error(res.error || 'Failed to issue credit note');
      throw new Error(res.error);
    }
    setCreditNotes(prev => [res.creditNote, ...prev]);
    setSelectedId(res.creditNote.id);
    // Keep the invoice picker's outstanding balance accurate for any
    // further credit notes issued in this same session — the invoices
    // prop is otherwise only fetched once, at page load.
    setInvoices(prev => prev
      .map(inv => inv.id === data.invoiceId
        ? { ...inv, amount_due: Math.max(0, Number(inv.amount_due ?? inv.total_amount ?? 0) - data.amount) }
        : inv)
      .filter(inv => Number(inv.amount_due ?? 0) - Number(inv.amount_paid ?? 0) > 0));
    toast.success(`Credit note ${res.creditNote.credit_number} issued`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteCreditNote(deleteTarget.id);
    setDeleting(false);
    if (!res.success) {
      toast.error(res.error || 'Failed to delete credit note');
      return;
    }
    setCreditNotes(prev => prev.filter(c => c.id !== deleteTarget.id));
    if (selectedId === deleteTarget.id) {
      setSelectedId(creditNotes.find(c => c.id !== deleteTarget.id)?.id || null);
    }
    setDeleteOpen(false);
    toast.success('Credit note deleted');
  };

  const handleDownloadPdf = async () => {
    if (!selected) return;
    setDownloading(true);
    try {
      const clientName = selected.invoice?.contact
        ? `${selected.invoice.contact.first_name || ''} ${selected.invoice.contact.last_name || ''}`.trim() || 'Unknown Client'
        : 'Unknown Client';
      const money = (n: any) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const html = `
        <div style="margin-bottom:24px;">
          <p><strong>Credit Note #:</strong> ${selected.credit_number}</p>
          <p><strong>Against Invoice:</strong> ${selected.invoice?.invoice_number || 'N/A'}</p>
          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Issue Date:</strong> ${format(new Date(selected.issue_date || selected.created_at), 'dd MMM yyyy')}</p>
          <p><strong>Status:</strong> ${selected.status || 'issued'}</p>
        </div>
        <div style="margin-top:16px;">
          <p><strong>Reason:</strong> ${selected.reason || ''}</p>
        </div>
        <div style="margin-top:24px; text-align:right;">
          <p style="font-size:18px; font-weight:700;">Credited Amount: ${money(selected.amount)}</p>
        </div>
      `;

      const docTitle = `Credit Note ${selected.credit_number}`;
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle, html }),
      });

      if (!response.ok) throw new Error('PDF render failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

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
              placeholder="Search credit notes..."
              className="w-full bg-white border border-dash-border rounded-lg pl-9 pr-3 py-2 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors"
            />
          </div>
          <DashButton variant="primary" className="w-full" onClick={() => setIssueOpen(true)}>
            <FileMinus size={14} /> Issue Credit Note
          </DashButton>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <FileMinus className="h-8 w-8 !text-dash-textMuted mx-auto mb-2 opacity-40" />
              <p className="text-[11px] font-semibold !text-dash-textMuted">No credit notes yet</p>
            </div>
          ) : (
            filtered.map(cn_ => (
              <button
                key={cn_.id}
                onClick={() => setSelectedId(cn_.id)}
                className={cn(
                  'w-full text-left p-4 transition-colors motion-reduce:transition-none border-b border-dash-border group relative',
                  selectedId === cn_.id ? 'bg-dash-accent/5 border-r-2 border-r-dash-accent' : 'hover:bg-white'
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-bold text-dash-accent">{cn_.credit_number}</span>
                  <span className="text-xs font-bold !text-dash-text">
                    {(Number(cn_.amount) || 0).toLocaleString('en-US', { style: 'currency', currency: cn_.invoice?.currency || 'USD' })}
                  </span>
                </div>
                <h4 className="text-[13px] font-semibold !text-dash-text truncate mb-2">
                  vs {cn_.invoice?.invoice_number || 'Unknown Invoice'}
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] !text-dash-textMuted font-medium">
                    <Calendar size={12} />
                    {format(new Date(cn_.issue_date || cn_.created_at), 'dd MMM')}
                  </div>
                  <StatusBadge status={cn_.status} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selected ? (
          <>
            <div className="p-4 border-b border-dash-border flex flex-wrap items-center justify-between gap-4 bg-dash-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20">
                  <FileMinus className="h-5 w-5 text-dash-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-bold !text-dash-text">Credit Note</h3>
                  <p className="text-[11px] !text-dash-textMuted font-semibold">{selected.credit_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DashButton variant="ghost" size="sm" onClick={handleDownloadPdf} disabled={downloading}>
                  <Download size={14} /> {downloading ? 'Generating...' : 'Download PDF'}
                </DashButton>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <DashButton variant="ghost" size="icon">
                      <MoreVertical size={14} />
                    </DashButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl min-w-[180px]">
                    <DropdownMenuItem
                      onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}
                      className="flex items-center gap-2 cursor-pointer text-red hover:bg-red/10 rounded-lg mx-1 px-3 py-2 text-xs"
                    >
                      <Trash2 size={14} /> Delete Credit Note
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-dash-surface relative">
              <div className="max-w-[850px] mx-auto bg-white border border-dash-border !text-slate-900 p-12 md:p-16 rounded-2xl shadow-lg min-h-[600px] relative">
                <div className="flex justify-between items-start pb-9 mb-9 border-b border-slate-100">
                  <div>
                    <div className="text-lg font-bold uppercase tracking-tight !text-slate-900">
                      Leadsmind <span className="!text-primary">HQ</span>
                    </div>
                    <div className={`text-xs !${DOCUMENT_MUTED_TEXT} leading-relaxed mt-1`}>
                      <p className={`!${DOCUMENT_MUTED_TEXT}`}>123 Enterprise Avenue, Silicon Valley, CA 94043</p>
                      <p className={`!${DOCUMENT_MUTED_TEXT}`}>billing@leadsmind.io</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] !text-primary mb-2">Credit Note</p>
                    <p className="text-lg font-bold !text-slate-900 tracking-tight mb-3">{selected.credit_number}</p>
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                <div className="flex justify-between items-start gap-10 mb-12">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] !${DOCUMENT_MUTED_TEXT} mb-3`}>Billed To</p>
                    <p className="text-base font-semibold !text-slate-900 mb-1">
                      {selected.invoice?.contact?.first_name} {selected.invoice?.contact?.last_name}
                    </p>
                    <p className={`text-sm !${DOCUMENT_MUTED_TEXT}`}>{selected.invoice?.contact?.email}</p>
                  </div>

                  <div className="flex gap-10 text-right shrink-0">
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] !${DOCUMENT_MUTED_TEXT} mb-2`}>Issue Date</p>
                      <p className="text-sm font-semibold !text-slate-900">{format(new Date(selected.issue_date || selected.created_at), 'dd MMM yyyy')}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] !${DOCUMENT_MUTED_TEXT} mb-2`}>Against Invoice</p>
                      <p className="text-sm font-semibold !text-slate-900">{selected.invoice?.invoice_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className={`mb-10 text-sm ${DOCUMENT_MUTED_TEXT}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.2em] !${DOCUMENT_MUTED_TEXT} mb-2`}>Reason</p>
                  <p className="!text-slate-900">{selected.reason}</p>
                </div>

                <div className="flex justify-end">
                  <div className="w-72 space-y-3">
                    <div className="flex justify-between items-end pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.25em] !text-primary mb-1">Credited Amount</span>
                      <span className="text-3xl font-bold !text-slate-900 tracking-tight tabular-nums">
                        ${(Number(selected.amount) || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <DashEmptyState
              icon={FileMinus}
              title="No credit note selected"
              description="Issue a credit note against an invoice, or select one from the list to view its details"
            />
          </div>
        )}
      </div>

      <IssueCreditNoteDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        invoices={invoices}
        defaultInvoiceId={defaultInvoiceId}
        onConfirm={handleIssue}
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete credit note?"
        description={`This will permanently delete credit note ${deleteTarget?.credit_number}. The invoice's balance will not be restored automatically. This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import {
  Search, FileText, MoreVertical,
  CheckCircle2, XCircle, Send, Pencil, Trash2, ArrowRight, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { convertQuoteToInvoice, deleteQuote, updateQuoteStatus } from '@/app/actions/quotes';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';

interface QuoteMasterLedgerProps {
  quotes: any[];
}

export function QuoteMasterLedger({ quotes: initialQuotes }: QuoteMasterLedgerProps) {
  const router = useRouter();
  const [quotes, setQuotes] = useState<any[]>(initialQuotes || []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setBy] = useState('newest');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Sync props to state dynamically
  useEffect(() => {
    setQuotes(initialQuotes || []);
  }, [initialQuotes]);

  const filteredQuotes = (quotes || [])
    .filter(q => {
      if (!q) return false;
      const matchesSearch =
        (q.quote_number || '')?.toLowerCase().includes(search.toLowerCase()) ||
        (q.contact?.first_name || '')?.toLowerCase().includes(search.toLowerCase()) ||
        (q.contact?.last_name || '')?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || (q.status || '')?.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (!a || !b) return 0;
      if (sortBy === 'newest') {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      }
      if (sortBy === 'highest') {
        return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
      }
      return 0;
    });

  const handleConvert = async (id: string) => {
    if (!id) return;
    toast.promise(convertQuoteToInvoice(id), {
      loading: 'Converting proposal to invoice...',
      success: (res) => {
        if (!res?.success) throw new Error(res?.error || 'Conversion failed');
        setQuotes(prev => prev.map(q => q?.id === id ? { ...q, status: 'converted' } : q));
        return 'Proposal converted to invoice successfully';
      },
      error: (err) => err?.message || 'Failed to convert proposal'
    });
  };

  const handleStatusChange = async (quote: any, status: string) => {
    if (!quote?.id) return;

    toast.promise(updateQuoteStatus(quote.id, status), {
      loading: `Updating status to ${status}...`,
      success: (res) => {
        if (!res?.success) throw new Error(res?.error || 'Update failed');

        setQuotes(prev => prev.map(q =>
          q?.id === quote.id
            ? { ...q, status }
            : q
        ));

        return `Quote marked as ${status}`;
      },
      error: (err) => {
        console.error("Runtime error intercepted during state re-render:", err);
        return err?.message || 'Failed to update status';
      }
    });
  };
  const handleDownloadPdf = async (quote: any) => {
    if (!quote?.id) return;
    setDownloadingId(quote.id);
    try {
      const clientName = quote.contact
        ? `${quote.contact.first_name || ''} ${quote.contact.last_name || ''}`.trim() || 'Unknown Client'
        : 'Unknown Client';
      const items: any[] = Array.isArray(quote.items) ? quote.items : [];
      const money = (n: any) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const itemRows = items.map(item => `
        <tr>
          <td style="padding:8px 0;">${item.description || ''}</td>
          <td style="padding:8px 0; text-align:center;">${item.quantity ?? ''}</td>
          <td style="padding:8px 0; text-align:right;">${money(item.unit_amount ?? item.unit_price)}</td>
          <td style="padding:8px 0; text-align:right;">${money((item.quantity || 0) * (item.unit_amount ?? item.unit_price ?? 0))}</td>
        </tr>
      `).join('');

      const html = `
        <div style="margin-bottom:24px;">
          <p><strong>Quote #:</strong> ${quote.quote_number || 'N/A'}</p>
          <p><strong>Client:</strong> ${clientName}${quote.contact?.email ? ` (${quote.contact.email})` : ''}</p>
          <p><strong>Status:</strong> ${quote.status || 'draft'}</p>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="border-bottom:2px solid #e2e8f0; text-align:left;">
              <th style="padding:8px 0;">Description</th>
              <th style="padding:8px 0; text-align:center;">Qty</th>
              <th style="padding:8px 0; text-align:right;">Unit Price</th>
              <th style="padding:8px 0; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="margin-top:16px; text-align:right; font-size:12px;">
          <p>Subtotal: ${money(quote.subtotal)}</p>
          <p>Tax: ${money(quote.tax_total)}</p>
          ${quote.shipping_charges ? `<p>Shipping: ${money(quote.shipping_charges)}</p>` : ''}
          ${quote.adjustment ? `<p>Adjustment: ${money(quote.adjustment)}</p>` : ''}
          <p style="font-size:16px; font-weight:700;">Total: ${money(quote.total_amount)}</p>
        </div>
        ${quote.terms_and_conditions ? `<div style="margin-top:24px;"><h3>Terms & Conditions</h3><p style="white-space:pre-wrap;">${quote.terms_and_conditions}</p></div>` : ''}
      `;

      const docTitle = `Quote ${quote.quote_number || quote.id}`;
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle, html })
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
      toast.success('Quote PDF downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate quote PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    toast.promise(deleteQuote(deleteId), {
      loading: 'Deleting proposal...',
      success: (res) => {
        if (!res?.success) throw new Error(res?.error || 'Delete failed');
        setQuotes(prev => prev.filter(q => q?.id !== deleteId));
        setDeleteId(null);
        return 'Quote deleted successfully';
      },
      error: (err) => err?.message || 'Failed to delete quote'
    });
  };

  return (
    <div className="bg-white border border-dash-border rounded-2xl overflow-hidden shadow-sm">
      {/* Search & Filters */}
      <div className="p-4 border-b border-dash-border flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 !text-dash-textMuted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search proposals..."
            className="w-full bg-white border border-dash-border rounded-lg pl-9 pr-3 py-2 text-xs !text-dash-text outline-none focus:border-dash-accent transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-dash-surface p-1 rounded-lg">
            {['all', 'draft', 'sent', 'accepted', 'converted'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1 rounded-md text-[12px] font-semibold capitalize transition-colors motion-reduce:transition-none",
                  statusFilter === status ? "bg-dash-accent text-white" : "!text-dash-textMuted hover:!text-dash-text"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={e => setBy(e.target.value)}
            className="bg-dash-surface border border-dash-border rounded-lg px-3 py-1.5 text-[12px] font-semibold !text-dash-textMuted outline-none focus:border-dash-accent cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="highest">Highest Amount</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-dash-surface border-b border-dash-border">
              <th className="px-6 py-4 text-[11px] font-bold !text-dash-textMuted uppercase tracking-wide">Quote No.</th>
              <th className="px-6 py-4 text-[11px] font-bold !text-dash-textMuted uppercase tracking-wide">Client</th>
              <th className="px-6 py-4 text-[11px] font-bold !text-dash-textMuted uppercase tracking-wide">Total Amount</th>
              <th className="px-6 py-4 text-[11px] font-bold !text-dash-textMuted uppercase tracking-wide">Status</th>
              <th className="px-6 py-4 text-[11px] font-bold !text-dash-textMuted uppercase tracking-wide">Date</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dash-border">
            {filteredQuotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <FileText className="h-8 w-8 !text-dash-textMuted mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium !text-dash-textMuted">No matching proposals found</p>
                </td>
              </tr>
            ) : (
              filteredQuotes.map((q) => (
                <tr key={q?.id || Math.random().toString()} className="hover:bg-dash-surface/60 transition-colors motion-reduce:transition-none group">
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-bold text-dash-accent">
                      {q?.quote_number || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold !text-dash-text">
                        {q?.contact ? `${q.contact.first_name || ''} ${q.contact.last_name || ''}`.trim() || 'Unknown Client' : 'Unknown Client'}
                      </span>
                      <span className="text-[10px] !text-dash-textMuted">
                        {q?.contact?.email || 'No email registered'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold !text-dash-text">
                    ${(Number(q?.total_amount) || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <DashStatusPill
                      variant={
                        q?.status === 'accepted' ? 'success' :
                        q?.status === 'converted' ? 'accent' :
                        q?.status === 'declined' ? 'danger' :
                        'info'
                      }
                    >
                      {q?.status ? q.status.charAt(0).toUpperCase() + q.status.slice(1) : 'Draft'}
                    </DashStatusPill>
                  </td>
                  <td className="px-6 py-4 text-[10px] !text-dash-textMuted">
                    {q?.created_at ? (() => {
                      try {
                        return format(new Date(q.created_at), 'dd MMM yyyy');
                      } catch {
                        return 'Invalid Date';
                      }
                    })() : 'No Date'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-dash-surface rounded-lg transition-colors !text-dash-textMuted">
                          <MoreVertical size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl min-w-[180px]">
                        <DropdownMenuItem
                          onClick={() => q?.id && router.push(`/quotes/${q.id}/edit`)}
                          className="flex items-center gap-2 cursor-pointer text-xs py-2.5"
                        >
                          <Pencil size={14} /> Edit Proposal
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownloadPdf(q)}
                          disabled={downloadingId === q?.id}
                          className="flex items-center gap-2 cursor-pointer text-xs py-2.5"
                        >
                          <Download size={14} /> {downloadingId === q?.id ? 'Generating...' : 'Download PDF'}
                        </DropdownMenuItem>
                        {q?.status === 'accepted' && q?.id && (
                          <DropdownMenuItem onClick={() => handleConvert(q.id)} className="flex items-center gap-2 cursor-pointer text-dash-accent text-xs py-2.5 font-bold">
                            <ArrowRight size={14} /> Convert to Invoice
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-dash-border" />
                        <DropdownMenuItem onClick={() => q?.id && handleStatusChange(q, 'sent')} className="flex items-center gap-2 cursor-pointer text-xs py-2.5">
                          <Send size={14} /> Resend Quote
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => q?.id && handleStatusChange(q, 'accepted')} className="flex items-center gap-2 cursor-pointer text-green text-xs py-2.5">
                          <CheckCircle2 size={14} /> Mark as Accepted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => q?.id && handleStatusChange(q, 'declined')} className="flex items-center gap-2 cursor-pointer text-red text-xs py-2.5">
                          <XCircle size={14} /> Mark as Declined
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-dash-border" />
                        <DropdownMenuItem onClick={() => q?.id && setDeleteId(q.id)} className="flex items-center gap-2 cursor-pointer text-red text-xs py-2.5">
                          <Trash2 size={14} /> Delete Quote
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        description="Are you sure you want to delete this proposal? This action cannot be undone."
        confirmLabel="Delete Permanently"
        variant="danger"
      />
    </div>
  );
}

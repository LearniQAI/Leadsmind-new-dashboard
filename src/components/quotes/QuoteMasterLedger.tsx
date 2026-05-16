'use client';

import React, { useState } from 'react';
import {
  Search, Filter, FileText, Download, MoreVertical,
  CheckCircle2, XCircle, Send, Pencil, Trash2, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { convertQuoteToInvoice, deleteQuote, updateQuoteStatus } from '@/app/actions/quotes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface QuoteMasterLedgerProps {
  quotes: any[];
}

export function QuoteMasterLedger({ quotes: initialQuotes }: QuoteMasterLedgerProps) {
  const router = useRouter();
  const [quotes, setQuotes] = useState<any[]>(initialQuotes);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setBy] = useState('newest');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredQuotes = quotes
    .filter(q => {
      const matchesSearch =
        q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
        q.contact?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        q.contact?.last_name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || q.status?.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'highest') return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
      return 0;
    });

  const handleConvert = async (id: string) => {
    toast.promise(convertQuoteToInvoice(id), {
      loading: 'Converting proposal to invoice...',
      success: (res) => {
        if (!res.success) throw new Error(res.error || 'Conversion failed');
        setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'converted' } : q));
        return 'Proposal converted to invoice successfully';
      },
      error: (err) => err.message
    });
  };

  const handleStatusChange = async (quote: any, status: string) => {
    toast.promise(updateQuoteStatus(quote.id, status), {
      loading: `Updating status to ${status}...`,
      success: (res) => {
        if (!res.success) throw new Error(res.error || 'Update failed');
        setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status } : q));
        return `Quote marked as ${status}`;
      },
      error: (err) => err.message
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    toast.promise(deleteQuote(deleteId), {
      loading: 'Deleting proposal...',
      success: (res) => {
        if (!res.success) throw new Error(res.error || 'Delete failed');
        setQuotes(prev => prev.filter(q => q.id !== deleteId));
        setDeleteId(null);
        return 'Quote deleted successfully';
      },
      error: (err) => err.message
    });
  };

  return (
    <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[var(--r16)] overflow-hidden">
      {/* Search & Filters */}
      <div className="p-4 border-b border-[var(--bdr)] flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--t3)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search proposals..."
            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--bdr)] rounded-[var(--r8)] pl-9 pr-3 py-2 text-xs text-[var(--t1)] outline-none focus:border-[var(--accent)] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
            {['all', 'draft', 'sent', 'accepted', 'converted'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
                  statusFilter === status ? "bg-[var(--accent)] text-white" : "text-[var(--t3)] hover:text-[var(--t1)]"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={e => setBy(e.target.value)}
            className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--t2)] outline-none focus:border-[var(--accent)] cursor-pointer"
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
            <tr className="bg-white/[0.02] border-b border-[var(--bdr)]">
              <th className="px-6 py-4 text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Quote No.</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Client</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Total Amount</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest">Date</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--bdr)]">
            {filteredQuotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <FileText className="h-8 w-8 text-[var(--t4)] mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-medium text-[var(--t3)]">No matching proposals found</p>
                </td>
              </tr>
            ) : (
              filteredQuotes.map((q) => (
                <tr key={q.id} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-black font-space text-[var(--accent2)]">{q.quote_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--t1)]">{q.contact ? `${q.contact.first_name} ${q.contact.last_name}` : 'Unknown'}</span>
                      <span className="text-[10px] text-[var(--t4)]">{q.contact?.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-[var(--t1)]">
                    ${(Number(q.total_amount) || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-1 rounded-full border",
                      q.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        q.status === 'converted' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          q.status === 'declined' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    )}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[10px] text-[var(--t3)]">
                    {format(new Date(q.created_at), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-[var(--t4)]">
                          <MoreVertical size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[var(--n800)] border border-[var(--bdrh)] shadow-2xl rounded-xl min-w-[180px]">
                        <DropdownMenuItem
                          onClick={() => router.push(`/quotes/${q.id}/edit`)}
                          className="flex items-center gap-2 cursor-pointer text-xs py-2.5"
                        >
                          <Pencil size={14} /> Edit Proposal
                        </DropdownMenuItem>
                        {q.status === 'accepted' && (
                          <DropdownMenuItem onClick={() => handleConvert(q.id)} className="flex items-center gap-2 cursor-pointer text-[var(--accent2)] text-xs py-2.5 font-bold">
                            <ArrowRight size={14} /> Convert to Invoice
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-[var(--bdr)]" />
                        <DropdownMenuItem onClick={() => handleStatusChange(q, 'sent')} className="flex items-center gap-2 cursor-pointer text-xs py-2.5">
                          <Send size={14} /> Resend Quote
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(q, 'accepted')} className="flex items-center gap-2 cursor-pointer text-emerald-400 text-xs py-2.5">
                          <CheckCircle2 size={14} /> Mark as Accepted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(q, 'declined')} className="flex items-center gap-2 cursor-pointer text-rose-400 text-xs py-2.5">
                          <XCircle size={14} /> Mark as Declined
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[var(--bdr)]" />
                        <DropdownMenuItem onClick={() => setDeleteId(q.id)} className="flex items-center gap-2 cursor-pointer text-rose-500 text-xs py-2.5">
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

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="bg-[var(--n800)] z-[1002] border-[var(--bdr)] text-[var(--t1)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-space uppercase">Confirm <span className="text-rose-500">Deletion</span></DialogTitle>
            <DialogDescription className="text-[var(--t3)]">
              Are you sure you want to delete this proposal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-3">
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="btn-ghost">Cancel</Button>
            <Button onClick={handleDelete} className="bg-rose-500 hover:bg-rose-600 text-white font-bold">Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

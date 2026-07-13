'use client';

import React, { useState } from 'react';
import {
  Search, Download, MoreVertical, Calendar, FileSignature, X, ArrowRight,
  FileText, Send, Ban, Printer, Trash2, CheckCircle, XCircle, Clock, Pencil
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { convertToInvoice, deleteQuote, updateQuoteStatus } from '@/app/actions/finance';
import { useRouter } from 'next/navigation';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';

interface ProposalMasterDetailProps {
  proposals: any[];
}

const PROPOSAL_STATUSES = ['draft', 'sent', 'accepted', 'declined'];

/**
 * Sentence-case, dash-token status pill for dashboard chrome (sidebar list,
 * document header badge). The printable document body below this
 * intentionally keeps its own bold/uppercase letterhead typography and the
 * workspace's white-label `primary` color — see note above the Document View.
 */
function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'accepted' ? 'success' :
    status === 'converted' ? 'accent' :
    status === 'sent' ? 'info' :
    status === 'declined' ? 'danger' :
    'warning';
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
  return <DashStatusPill variant={variant}>{label}</DashStatusPill>;
}

export function ProposalMasterDetail({ proposals: initialProposals }: ProposalMasterDetailProps) {
  const [proposals, setProposals] = useState<any[]>(initialProposals);
  const [selectedId, setSelectedId] = useState<string | null>(initialProposals[0]?.id || null);
  const [search, setSearch] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const router = useRouter();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedProposal = proposals.find(p => p.id === selectedId);
  const filteredProposals = proposals.filter(p =>
    p.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.contact?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.contact?.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleConvert = async () => {
    if (!selectedId) return;
    setIsConverting(true);
    const result = await convertToInvoice(selectedId);
    setIsConverting(false);
    if (result.success) {
      toast.success('Proposal converted to Invoice!');
      router.push(`/invoices`);
    } else {
      toast.error(result.error || 'Conversion failed');
    }
  };

  const handleStatusChange = async (proposal: any, status: string) => {
    const res = await updateQuoteStatus(proposal.id, status);
    if (!res.success) { toast.error(res.error || 'Update failed'); return; }
    setProposals(prev => prev.map(p => p.id === proposal.id ? { ...p, status } : p));
    toast.success(`Proposal marked as ${status}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteQuote(deleteTarget.id);
    setDeleting(false);
    if (!res.success) { toast.error(res.error || 'Delete failed'); return; }
    toast.success('Proposal deleted');
    setProposals(prev => prev.filter(p => p.id !== deleteTarget.id));
    if (selectedId === deleteTarget.id) setSelectedId(proposals.find(p => p.id !== deleteTarget.id)?.id || null);
    setDeleteOpen(false);
  };

  const handlePrint = () => window.print();
  const handleDownload = () => { handlePrint(); toast.info('Use "Save as PDF" in the print dialog.'); };

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-280px)] gap-6">
      {/* Left Sidebar */}
      <div className={cn("w-full lg:w-[380px] flex flex-col gap-4 no-print", selectedId && "hidden lg:flex")}>
        <DashCard interactive={false} className="p-4 h-full flex flex-col">
          <div className="p-2 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 !text-dash-textMuted" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search proposals..." className="pl-10 h-10 border-dash-border rounded-xl text-xs font-bold" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-none space-y-2 px-1">
            {filteredProposals.length === 0 && (
              <div className="py-12 text-center !text-dash-textMuted text-sm font-bold">No proposals</div>
            )}
            {filteredProposals.map(prop => (
              <button key={prop.id} onClick={() => setSelectedId(prop.id)} className={cn(
                "w-full text-left p-4 rounded-2xl transition-colors motion-reduce:transition-none group relative overflow-hidden border",
                selectedId === prop.id ? "bg-dash-accent/5 border-dash-accent/30" : "hover:bg-dash-surface border-transparent"
              )}>
                {selectedId === prop.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-dash-accent rounded-l-2xl" />}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[11px] font-bold tracking-wide text-dash-accent">{prop.quote_number}</span>
                  <span className="text-sm font-black !text-dash-text">${Number(prop.total_amount).toLocaleString()}</span>
                </div>
                <h4 className="text-sm font-bold !text-dash-textMuted group-hover:text-dash-accent transition-colors truncate">
                  {prop.contact ? `${prop.contact.first_name} ${prop.contact.last_name}` : 'Unknown Prospect'}
                </h4>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2 text-[10px] !text-dash-textMuted font-medium">
                    <Calendar className="h-3 w-3" />
                    {prop.valid_until ? format(new Date(prop.valid_until), 'dd MMM y') : format(new Date(prop.created_at), 'dd MMM y')}
                  </div>
                  <StatusBadge status={prop.status} />
                </div>
              </button>
            ))}
          </div>
        </DashCard>
      </div>

      {/* Right Content */}
      <div className={cn("flex-1 flex flex-col gap-6", !selectedId && "hidden lg:block")}>
        {selectedProposal ? (
          <>
            {/* Actions Header */}
            <DashCard interactive={false} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
              <div className="flex items-center gap-4">
                <DashButton variant="ghost" size="icon" className="lg:hidden !text-dash-textMuted border-none" onClick={() => setSelectedId(null)}>
                  <X className="h-5 w-5" />
                </DashButton>
                <div className="w-10 h-10 rounded-xl bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center shrink-0">
                  <FileSignature className="h-5 w-5 text-dash-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold !text-dash-text">Quote Details</h3>
                  <p className="text-[11px] !text-dash-textMuted">Ref: {selectedProposal.quote_number}</p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                {selectedProposal.status === 'accepted' && (
                  <DashButton variant="primary" onClick={handleConvert} disabled={isConverting} className="h-10 px-6 rounded-xl">
                    <ArrowRight className="h-4 w-4" />
                    {isConverting ? 'Converting...' : 'Generate Invoice'}
                  </DashButton>
                )}
                <DashButton variant="secondary" onClick={handleDownload} className="h-10 px-4 rounded-xl">
                  <Download className="h-4 w-4" />
                </DashButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <DashButton variant="secondary" className="h-10 w-10 p-0 rounded-xl">
                      <MoreVertical className="h-4 w-4" />
                    </DashButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl min-w-[190px]">
                    {PROPOSAL_STATUSES.filter(s => s !== selectedProposal.status).map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(selectedProposal, s)} className="flex items-center gap-2 cursor-pointer !text-dash-text hover:bg-dash-surface rounded-lg mx-1 px-3 py-2 capitalize">
                        {s === 'accepted' && <CheckCircle className="h-4 w-4 text-green" />}
                        {s === 'sent' && <Send className="h-4 w-4 text-dash-accent" />}
                        {s === 'declined' && <XCircle className="h-4 w-4 text-red" />}
                        {s === 'draft' && <Pencil className="h-4 w-4 text-amber-600" />}
                        Mark as {s}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-1 bg-dash-border" />
                    <DropdownMenuItem onClick={() => { setDeleteTarget(selectedProposal); setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-red hover:bg-red/10 rounded-lg mx-1 px-3 py-2">
                      <Trash2 className="h-4 w-4" /> Delete Proposal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </DashCard>

            {/*
              Document View — this is the printable client-facing document
              (see `printable-area` / window.print() above), not dashboard
              chrome. It intentionally keeps its own bold/uppercase
              letterhead typography and the workspace's white-label
              `primary` color/logo (via BrandingProvider) rather than the
              fixed `dash-accent` used everywhere else in this file — a
              proposal sent to a client should carry that workspace's brand,
              not the dashboard's own accent color. Left as-is.
            */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="border border-dash-border rounded-2xl p-8 md:p-16 shadow-sm relative overflow-hidden min-h-full printable-area bg-white">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16 relative">
                  <div>
                    <div className="h-10 w-40 bg-primary text-white rounded-xl flex items-center justify-center font-black mb-6 tracking-tighter text-sm uppercase">LEADSMIND</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 space-y-1">
                      <p>Boutique Service Proposal</p>
                      <p>Silicon Valley, CA 94043</p>
                      <p>contact@leadsmind.io</p>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-gray-800 mb-2">Estimate</h1>
                    <span className="text-[11px] font-black text-primary uppercase tracking-[0.3em] block">{selectedProposal.quote_number}</span>
                    <StatusBadge status={selectedProposal.status} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                  <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 block">Prepared For</span>
                    <h2 className="text-2xl font-black uppercase text-gray-800 mb-1 tracking-tighter">{selectedProposal.contact?.first_name} {selectedProposal.contact?.last_name}</h2>
                    <p className="text-xs font-bold text-gray-500">{selectedProposal.contact?.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Quote Date</span>
                      <span className="text-sm font-black text-gray-800">{format(new Date(selectedProposal.created_at), 'dd MMM yyyy')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Valid Until</span>
                      <span className="text-sm font-black text-primary">{selectedProposal.valid_until ? format(new Date(selectedProposal.valid_until), 'dd MMM yyyy') : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <table className="w-full mb-16 text-left">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Service Item</th>
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Qty</th>
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Rate</th>
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedProposal.items?.length > 0 ? selectedProposal.items : [{ description: 'Strategic Services Package', quantity: 1, unit_amount: selectedProposal.total_amount }]).map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-6 font-bold text-gray-800">{item.description}</td>
                        <td className="py-6 text-right text-gray-500 font-bold">{item.quantity || 1}</td>
                        <td className="py-6 text-right text-gray-500 font-bold">${Number(item.unit_amount || 0).toLocaleString()}</td>
                        <td className="py-6 text-right font-black text-gray-800 text-lg">${(Number(item.quantity || 1) * Number(item.unit_amount || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end pt-8 border-t-2 border-gray-200">
                  <div className="w-72 space-y-4">
                    <div className="flex justify-between text-gray-500">
                      <span className="text-[10px] font-black uppercase tracking-widest">Base Estimate</span>
                      <span className="font-black">${Number(selectedProposal.total_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 pb-4 border-b border-gray-100">
                      <span className="text-[10px] font-black uppercase tracking-widest">Est. Taxes</span>
                      <span className="font-black">$0.00</span>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-primary">Project Total</span>
                      <span className="text-4xl font-black text-gray-800">${Number(selectedProposal.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {selectedProposal.notes && (
                  <div className="mt-16 p-8 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-3">Notes & Terms</span>
                    <p className="text-xs text-gray-600 leading-relaxed">{selectedProposal.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center !text-dash-textMuted">
            <FileSignature className="h-24 w-24 mb-6 opacity-40" />
            <span className="text-xl font-bold tracking-wide">Select a proposal</span>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border border-dash-border rounded-2xl max-w-sm p-8 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight !text-dash-text">Delete proposal?</DialogTitle>
          </DialogHeader>
          <p className="!text-dash-textMuted text-sm py-4">This will permanently delete proposal <strong className="!text-dash-text">{deleteTarget?.quote_number}</strong>. This cannot be undone.</p>
          <DialogFooter className="gap-3">
            <DashButton variant="secondary" onClick={() => setDeleteOpen(false)} className="rounded-xl">Cancel</DashButton>
            <DashButton variant="destructive" onClick={handleDelete} disabled={deleting} className="rounded-xl px-8">{deleting ? 'Deleting...' : 'Delete'}</DashButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

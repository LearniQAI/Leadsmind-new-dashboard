'use client';

import React, { useState } from 'react';
import {
  Search, Download, MoreVertical, Calendar, FileSignature, X, ArrowRight,
  FileText, Send, Ban, Printer, Trash2, CheckCircle, XCircle, Clock, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

interface ProposalMasterDetailProps {
  proposals: any[];
}

const PROPOSAL_STATUSES = ['draft', 'sent', 'accepted', 'declined'];

function StatusBadge({ status }: { status: string }) {
  if (status === 'accepted') return <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase px-2 py-0">Accepted</Badge>;
  if (status === 'converted') return <Badge className="bg-violet-100 text-violet-700 border-none text-[8px] font-black uppercase px-2 py-0">Converted</Badge>;
  if (status === 'sent') return <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] font-black uppercase px-2 py-0">Sent</Badge>;
  if (status === 'declined') return <Badge className="bg-rose-100 text-rose-700 border-none text-[8px] font-black uppercase px-2 py-0">Declined</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase px-2 py-0">{status || 'Draft'}</Badge>;
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
        <div className="card__wrapper !p-4 !mb-0 h-full flex flex-col shadow-lg">
          <div className="p-2 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search proposals..." className="pl-10 h-10 border-gray-200 rounded-xl text-xs font-bold" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-none space-y-2 px-1">
            {filteredProposals.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm font-bold uppercase tracking-widest">No proposals</div>
            )}
            {filteredProposals.map(prop => (
              <button key={prop.id} onClick={() => setSelectedId(prop.id)} className={cn(
                "w-full text-left p-4 rounded-2xl transition-all duration-200 group relative overflow-hidden border",
                selectedId === prop.id ? "bg-primary/5 border-primary/30" : "hover:bg-gray-50 border-transparent"
              )}>
                {selectedId === prop.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-2xl" />}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">{prop.quote_number}</span>
                  <span className="text-sm font-black text-gray-800">${Number(prop.total_amount).toLocaleString()}</span>
                </div>
                <h4 className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors truncate">
                  {prop.contact ? `${prop.contact.first_name} ${prop.contact.last_name}` : 'Unknown Prospect'}
                </h4>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                    <Calendar className="h-3 w-3" />
                    {prop.valid_until ? format(new Date(prop.valid_until), 'dd MMM y') : format(new Date(prop.created_at), 'dd MMM y')}
                  </div>
                  <StatusBadge status={prop.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Content */}
      <div className={cn("flex-1 flex flex-col gap-6", !selectedId && "hidden lg:block")}>
        {selectedProposal ? (
          <>
            {/* Actions Header */}
            <div className="card__wrapper !p-4 !mb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl no-print">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden text-gray-400" onClick={() => setSelectedId(null)}>
                  <X className="h-5 w-5" />
                </Button>
                <div className="card__icon !w-10 !h-10 !bg-primary/10 border-primary/20">
                  <FileSignature className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="card__title !text-lg !mb-0">Quote Details</h3>
                  <p className="card__desc !text-[9px] !mb-0 uppercase tracking-[0.2em]">Ref: {selectedProposal.quote_number}</p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                {selectedProposal.status === 'accepted' && (
                  <Button onClick={handleConvert} disabled={isConverting} className="btn-primary h-10 px-6 rounded-xl uppercase text-[10px] gap-2">
                    <ArrowRight className="h-4 w-4" />
                    {isConverting ? 'Converting...' : 'Generate Invoice'}
                  </Button>
                )}
                <Button onClick={handleDownload} variant="outline" className="btn btn-outline-theme-border h-10 px-4 rounded-xl uppercase text-[10px] gap-2">
                  <Download className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="btn btn-outline-theme-border h-10 w-10 p-0 rounded-xl">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[190px]">
                    {PROPOSAL_STATUSES.filter(s => s !== selectedProposal.status).map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(selectedProposal, s)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 rounded-lg mx-1 px-3 py-2 capitalize">
                        {s === 'accepted' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                        {s === 'sent' && <Send className="h-4 w-4 text-blue-600" />}
                        {s === 'declined' && <XCircle className="h-4 w-4 text-rose-600" />}
                        {s === 'draft' && <Pencil className="h-4 w-4 text-amber-600" />}
                        Mark as {s}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-1 bg-gray-100" />
                    <DropdownMenuItem onClick={() => { setDeleteTarget(selectedProposal); setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg mx-1 px-3 py-2">
                      <Trash2 className="h-4 w-4" /> Delete Proposal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Document View */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="card__wrapper !p-8 md:!p-16 !mb-0 shadow-2xl relative overflow-hidden min-h-full printable-area bg-white">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16 relative">
                  <div>
                    <div className="h-10 w-40 bg-primary text-white rounded-xl flex items-center justify-center font-black mb-6 tracking-tighter text-sm uppercase">LEADSMIND</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 space-y-1">
                      <p>Boutique Service Proposal</p>
                      <p>Silicon Valley, CA 94043</p>
                      <p>contact@leadsmind.ai</p>
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
          <div className="h-full flex flex-col items-center justify-center text-gray-200">
            <FileSignature className="h-24 w-24 mb-6" />
            <span className="text-xl font-black uppercase tracking-[0.5em]">Select a Proposal</span>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-sm p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Delete Proposal?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm py-4">This will permanently delete proposal <strong className="text-gray-800">{deleteTarget?.quote_number}</strong>. This cannot be undone.</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

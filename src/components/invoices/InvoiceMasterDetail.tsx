'use client';

import React, { useState } from 'react';
import {
  Search, Download, MoreVertical, Calendar, FileText, X, CheckCircle2,
  AlertTriangle, Clock, ArrowRight, ShieldCheck, Printer, Trash2,
  CheckCircle, XCircle, Send, Pencil
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
import { deleteInvoice, updateInvoiceStatus } from '@/app/actions/finance';

interface InvoiceMasterDetailProps {
  invoices: any[];
}

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'void'];

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0">Paid</Badge>;
  if (status === 'sent') return <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0">Sent</Badge>;
  if (status === 'void') return <Badge className="bg-rose-100 text-rose-700 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0">Void</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0">{status || 'Draft'}</Badge>;
}

export function InvoiceMasterDetail({ invoices: initialInvoices }: InvoiceMasterDetailProps) {
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [selectedId, setSelectedId] = useState<string | null>(initialInvoices[0]?.id || null);
  const [search, setSearch] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedInvoice = invoices.find(i => i.id === selectedId);
  const filteredInvoices = invoices.filter(i =>
    i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    i.contact?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.contact?.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusChange = async (invoice: any, status: string) => {
    const res = await updateInvoiceStatus(invoice.id, status);
    if (!res.success) { toast.error(res.error || 'Update failed'); return; }
    setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status } : i));
    toast.success(`Invoice marked as ${status}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteInvoice(deleteTarget.id);
    setDeleting(false);
    if (!res.success) { toast.error(res.error || 'Delete failed'); return; }
    toast.success('Invoice deleted');
    setInvoices(prev => prev.filter(i => i.id !== deleteTarget.id));
    if (selectedId === deleteTarget.id) setSelectedId(invoices.find(i => i.id !== deleteTarget.id)?.id || null);
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
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter invoices..." className="pl-10 h-10 border-gray-200 rounded-xl text-xs font-bold" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-none space-y-2 px-1">
            {filteredInvoices.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm font-bold uppercase tracking-widest">No invoices</div>
            )}
            {filteredInvoices.map(inv => (
              <button key={inv.id} onClick={() => setSelectedId(inv.id)} className={cn(
                "w-full text-left p-4 rounded-2xl transition-all duration-200 group relative overflow-hidden border",
                selectedId === inv.id ? "bg-primary/5 border-primary/30" : "hover:bg-gray-50 border-transparent"
              )}>
                {selectedId === inv.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-2xl" />}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">{inv.invoice_number}</span>
                  <span className="text-sm font-black text-gray-800">${Number(inv.total_amount).toLocaleString()}</span>
                </div>
                <h4 className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors truncate">
                  {inv.contact ? `${inv.contact.first_name} ${inv.contact.last_name}` : 'Unknown Client'}
                </h4>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(inv.created_at), 'dd MMM yyyy')}
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Content */}
      <div className={cn("flex-1 flex flex-col gap-6", !selectedId && "hidden lg:block")}>
        {selectedInvoice ? (
          <>
            {/* Actions Header */}
            <div className="card__wrapper !p-4 !mb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl no-print">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden text-gray-400" onClick={() => setSelectedId(null)}>
                  <X className="h-5 w-5" />
                </Button>
                <div className="card__icon !w-10 !h-10 !bg-primary/10 border-primary/20">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="card__title !text-lg !mb-0">Invoice Ledger</h3>
                  <p className="card__desc !text-[9px] !mb-0 uppercase tracking-[0.2em]">Record: {selectedInvoice.invoice_number}</p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button onClick={handleDownload} className="btn-primary h-10 px-6 rounded-xl uppercase text-[10px] gap-2">
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
                <Button onClick={handlePrint} variant="outline" className="btn btn-outline-theme-border h-10 px-4 rounded-xl uppercase text-[10px] gap-2">
                  <Printer className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="btn btn-outline-theme-border h-10 w-10 p-0 rounded-xl">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[180px]">
                    {INVOICE_STATUSES.filter(s => s !== selectedInvoice.status).map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(selectedInvoice, s)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 rounded-lg mx-1 px-3 py-2 capitalize">
                        {s === 'paid' && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                        {s === 'sent' && <Send className="h-4 w-4 text-blue-600" />}
                        {s === 'void' && <XCircle className="h-4 w-4 text-rose-600" />}
                        {s === 'draft' && <Pencil className="h-4 w-4 text-amber-600" />}
                        Mark as {s}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-1 bg-gray-100" />
                    <DropdownMenuItem onClick={() => { setDeleteTarget(selectedInvoice); setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg mx-1 px-3 py-2">
                      <Trash2 className="h-4 w-4" /> Delete Invoice
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
                      <p>123 Enterprise Avenue</p>
                      <p>Silicon Valley, CA 94043</p>
                      <p>contact@leadsmind.ai</p>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-gray-800 mb-2">Invoice</h1>
                    <span className="text-[11px] font-black text-primary uppercase tracking-[0.3em] block">{selectedInvoice.invoice_number}</span>
                    <StatusBadge status={selectedInvoice.status} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                  <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 block">Bill To</span>
                    <h2 className="text-2xl font-black uppercase text-gray-800 mb-1 tracking-tighter">{selectedInvoice.contact?.first_name} {selectedInvoice.contact?.last_name}</h2>
                    <p className="text-xs font-bold text-gray-500">{selectedInvoice.contact?.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Issue Date</span>
                      <span className="text-sm font-black text-gray-800">{format(new Date(selectedInvoice.created_at), 'dd MMM yyyy')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Due Date</span>
                      <span className="text-sm font-black text-rose-600">{selectedInvoice.due_date ? format(new Date(selectedInvoice.due_date), 'dd MMM yyyy') : 'On Receipt'}</span>
                    </div>
                  </div>
                </div>

                <table className="w-full mb-16 text-left">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Description</th>
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Qty</th>
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Rate</th>
                      <th className="py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedInvoice.items?.length > 0 ? selectedInvoice.items : [{ description: 'Consultation Services', quantity: 1, unit_amount: selectedInvoice.total_amount }]).map((item: any, idx: number) => (
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
                      <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                      <span className="font-black">${Number(selectedInvoice.total_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 pb-4 border-b border-gray-100">
                      <span className="text-[10px] font-black uppercase tracking-widest">Tax</span>
                      <span className="font-black">$0.00</span>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-primary">Total Due</span>
                      <span className="text-4xl font-black text-gray-800">${Number(selectedInvoice.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-16 pt-8 border-t border-gray-100 flex items-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Verified Document</span>
                    <span className="text-[9px] text-gray-300 font-bold">ID: {selectedInvoice.id.substring(0, 20).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-200">
            <FileText className="h-24 w-24 mb-6" />
            <span className="text-xl font-black uppercase tracking-[0.5em]">Select an Invoice</span>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-sm p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Delete Invoice?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm py-4">This will permanently delete invoice <strong className="text-gray-800">{deleteTarget?.invoice_number}</strong>. This cannot be undone.</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

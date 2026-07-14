'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Plus, Receipt, Pencil, Trash2, DollarSign, TrendingUp,
  TrendingDown, MoreVertical, Search, CheckCircle, Clock, AlertCircle, RotateCcw
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Expense {
 id: string;
 description: string;
 amount: number;
 category?: string;
 date?: string;
 status?: string;
 vendor?: string;
 notes?: string;
 created_at?: string;
}

const STATUSES = ['paid', 'unpaid', 'returned'];
const CATEGORIES = ['General', 'Marketing', 'Operations', 'Software', 'Travel', 'Equipment', 'Utilities', 'Payroll', 'Other'];

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'accent'; icon: React.ReactNode }> = {
 paid: { label: 'Paid', variant: 'success', icon: <CheckCircle className="h-3 w-3" /> },
 unpaid: { label: 'Unpaid', variant: 'warning', icon: <Clock className="h-3 w-3" /> },
 returned: { label: 'Returned', variant: 'accent', icon: <RotateCcw className="h-3 w-3" /> },
};

export default function ExpenseLiveClient({ initialExpenses }: { initialExpenses: Expense[] }) {
 const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
 const [search, setSearch] = useState('');
 const [filterStatus, setFilterStatus] = useState('all');

 const [formOpen, setFormOpen] = useState(false);
 const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
 const [formData, setFormData] = useState({
  description: '', amount: '', category: 'General', date: format(new Date(), 'yyyy-MM-dd'),
  status: 'unpaid', vendor: '', notes: ''
 });
 const [saving, setSaving] = useState(false);

 const [deleteOpen, setDeleteOpen] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
 const [deleting, setDeleting] = useState(false);

 const openCreate = () => {
  setEditingExpense(null);
  setFormData({ description: '', amount: '', category: 'General', date: format(new Date(), 'yyyy-MM-dd'), status: 'unpaid', vendor: '', notes: '' });
  setFormOpen(true);
 };

 const openEdit = (exp: Expense) => {
  setEditingExpense(exp);
  setFormData({
   description: exp.description || '',
   amount: exp.amount?.toString() || '',
   category: exp.category || 'General',
   date: exp.date ? exp.date.split('T')[0] : format(new Date(), 'yyyy-MM-dd'),
   status: exp.status || 'unpaid',
   vendor: exp.vendor || '',
   notes: exp.notes || ''
  });
  setFormOpen(true);
 };

 const handleSave = async () => {
  if (!formData.description.trim()) { toast.error('Description is required'); return; }
  if (!formData.amount || isNaN(Number(formData.amount))) { toast.error('Valid amount is required'); return; }
  setSaving(true);
  try {
   const payload = { ...formData, amount: Number(formData.amount) };
   if (editingExpense) {
    const { updateExpense } = await import('@/app/actions/expenses');
    const res = await updateExpense(editingExpense.id, payload);
    if (res.error) { toast.error(res.error); }
    else {
     toast.success('Expense updated!');
     setExpenses(prev => prev.map(e => e.id === editingExpense.id ? { ...e, ...payload } : e));
     setFormOpen(false);
    }
   } else {
    const { createExpense } = await import('@/app/actions/expenses');
    const res = await createExpense(payload as any);
    if (res.error) { toast.error(res.error); }
    else {
     toast.success('Expense added!');
     setExpenses(prev => [res.data!, ...prev]);
     setFormOpen(false);
    }
   }
  } catch { toast.error('Failed to save'); }
  setSaving(false);
 };

 const quickStatusUpdate = async (exp: Expense, newStatus: string) => {
  try {
   const { updateExpense } = await import('@/app/actions/expenses');
   const res = await updateExpense(exp.id, { status: newStatus });
   if (res.error) { toast.error(res.error); return; }
   setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, status: newStatus } : e));
   toast.success(`Marked as ${newStatus}`);
  } catch { toast.error('Update failed'); }
 };

 const handleDelete = async () => {
  if (!deleteTarget) return;
  setDeleting(true);
  try {
   const { deleteExpense } = await import('@/app/actions/expenses');
   const res = await deleteExpense(deleteTarget.id);
   if (res.error) { toast.error(res.error); }
   else {
    toast.success('Expense deleted');
    setExpenses(prev => prev.filter(e => e.id !== deleteTarget.id));
    setDeleteOpen(false);
   }
  } catch { toast.error('Delete failed'); }
  setDeleting(false);
 };

 const filtered = expenses.filter(e => {
  const matchSearch = search === '' || e.description?.toLowerCase().includes(search.toLowerCase()) || e.vendor?.toLowerCase().includes(search.toLowerCase());
  const matchStatus = filterStatus === 'all' || e.status === filterStatus;
  return matchSearch && matchStatus;
 });

 const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
 const totalPaid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + (e.amount || 0), 0);
 const totalUnpaid = expenses.filter(e => e.status === 'unpaid').reduce((s, e) => s + (e.amount || 0), 0);
 const totalReturned = expenses.filter(e => e.status === 'returned').reduce((s, e) => s + (e.amount || 0), 0);

 const stats = [
  { label: 'Total Expenses', value: totalAmount, color: '!text-dash-text', bg: 'bg-dash-accent/10', icon: <Receipt className="h-6 w-6 text-dash-accent" /> },
  { label: 'Total Paid', value: totalPaid, color: 'text-green', bg: 'bg-green/10', icon: <CheckCircle className="h-6 w-6 text-green" /> },
  { label: 'Total Unpaid', value: totalUnpaid, color: 'text-amber-600', bg: 'bg-amber-50', icon: <Clock className="h-6 w-6 text-amber-600" /> },
  { label: 'Returned', value: totalReturned, color: 'text-purple-700', bg: 'bg-purple-50', icon: <RotateCcw className="h-6 w-6 text-purple-600" /> },
 ];

 return (
  <div className="px-4 py-6 space-y-8">
   {/* Header */}
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
     <h1 className="text-3xl font-bold !text-dash-text mb-1">Expense <span className="text-dash-accent">Tracker</span></h1>
     <p className="text-[13px] !text-dash-textMuted">Track and manage your business expenses in real-time</p>
    </div>
    <DashButton onClick={openCreate} variant="primary">
     <Plus className="h-4 w-4" /> Add Expense
    </DashButton>
   </div>

   {/* Stats */}
   <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
    {stats.map(stat => (
     <DashCard key={stat.label} padding="default" className={`${stat.bg} border-0`}>
      <div className="flex items-center gap-3 mb-3">{stat.icon}<span className="text-[12px] font-semibold !text-dash-textMuted">{stat.label}</span></div>
      <p className={`text-2xl font-bold ${stat.color}`}>${stat.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
     </DashCard>
    ))}
   </div>

   {/* Filters + Table */}
   <DashCard padding="default" interactive={false}>
    <div className="flex flex-col md:flex-row gap-4 mb-6">
     <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 !text-dash-textMuted" />
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by description or vendor..." className="pl-10 h-11 border-dash-border rounded-xl" />
     </div>
     <Select value={filterStatus} onValueChange={setFilterStatus}>
      <SelectTrigger className="w-full md:w-48 h-11 border-dash-border rounded-xl"><SelectValue placeholder="All Statuses" /></SelectTrigger>
      <SelectContent className="bg-white border border-dash-border rounded-xl shadow-lg">
       <SelectItem value="all">All Statuses</SelectItem>
       {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
      </SelectContent>
     </Select>
    </div>

    {filtered.length === 0 ? (
     <div className="py-20 text-center">
      <Receipt className="h-12 w-12 !text-dash-textMuted opacity-40 mx-auto mb-4" />
      <p className="!text-dash-textMuted font-bold text-sm">{expenses.length === 0 ? 'No expenses recorded yet' : 'No results match your search'}</p>
      {expenses.length === 0 && (
       <DashButton onClick={openCreate} variant="primary" className="mt-6">
        <Plus className="h-4 w-4" /> Add First Expense
       </DashButton>
      )}
     </div>
    ) : (
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-dash-border">
         {['Description', 'Vendor', 'Category', 'Date', 'Amount', 'Status', 'Actions'].map(h => (
          <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide !text-dash-textMuted">{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-dash-border">
        {filtered.map(exp => {
         const sc = statusConfig[exp.status || 'unpaid'] || statusConfig.unpaid;
         return (
          <tr key={exp.id} className="hover:bg-dash-surface/60 transition-colors motion-reduce:transition-none group">
           <td className="px-4 py-4 font-semibold !text-dash-text">{exp.description}</td>
           <td className="px-4 py-4 !text-dash-textMuted">{exp.vendor || '—'}</td>
           <td className="px-4 py-4">
            <DashStatusPill variant="accent">{exp.category || 'General'}</DashStatusPill>
           </td>
           <td className="px-4 py-4 !text-dash-textMuted whitespace-nowrap">
            {exp.date ? format(new Date(exp.date), 'MMM d, yyyy') : '—'}
           </td>
           <td className="px-4 py-4 font-bold !text-dash-text">${Number(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
           <td className="px-4 py-4">
            <DashStatusPill variant={sc.variant} dot={false}>
             <span className="flex items-center gap-1">{sc.icon} {sc.label}</span>
            </DashStatusPill>
           </td>
           <td className="px-4 py-4">
            <DropdownMenu>
             <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-lg bg-dash-surface hover:bg-dash-border/60 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
               <MoreVertical size={14} className="!text-dash-textMuted" />
              </button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl min-w-[180px]">
              <DropdownMenuItem onClick={() => openEdit(exp)} className="flex items-center gap-2 cursor-pointer !text-dash-text hover:text-dash-accent hover:bg-dash-accent/5 rounded-lg mx-1 px-3 py-2">
               <Pencil size={14} /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => quickStatusUpdate(exp, 'paid')} className="flex items-center gap-2 cursor-pointer text-green hover:bg-green/10 rounded-lg mx-1 px-3 py-2">
               <CheckCircle size={14} /> Mark as Paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => quickStatusUpdate(exp, 'unpaid')} className="flex items-center gap-2 cursor-pointer text-amber-600 hover:bg-amber-50 rounded-lg mx-1 px-3 py-2">
               <Clock size={14} /> Mark as Unpaid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => quickStatusUpdate(exp, 'returned')} className="flex items-center gap-2 cursor-pointer text-purple-600 hover:bg-purple-50 rounded-lg mx-1 px-3 py-2">
               <RotateCcw size={14} /> Mark as Returned
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setDeleteTarget(exp); setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-red hover:bg-red/10 rounded-lg mx-1 px-3 py-2">
               <Trash2 size={14} /> Delete
              </DropdownMenuItem>
             </DropdownMenuContent>
            </DropdownMenu>
           </td>
          </tr>
         );
        })}
       </tbody>
      </table>
     </div>
    )}
   </DashCard>

   {/* Create/Edit Dialog */}
   <Dialog open={formOpen} onOpenChange={setFormOpen}>
    <DialogContent className="bg-white border border-dash-border rounded-2xl max-w-lg p-8 shadow-xl">
     <DialogHeader>
      <DialogTitle className="text-2xl font-bold tracking-tight !text-dash-text">
       {editingExpense ? 'Edit' : 'New'} <span className="text-dash-accent">Expense</span>
      </DialogTitle>
     </DialogHeader>
     <div className="space-y-4 py-4">
      <div className="space-y-2">
       <Label className="text-[12px] font-semibold !text-dash-textMuted">Description *</Label>
       <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Office Supplies" className="h-12 border-dash-border rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
        <Label className="text-[12px] font-semibold !text-dash-textMuted">Amount *</Label>
        <Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="h-12 border-dash-border rounded-xl" />
       </div>
       <div className="space-y-2">
        <Label className="text-[12px] font-semibold !text-dash-textMuted">Date</Label>
        <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="h-12 border-dash-border rounded-xl" />
       </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
        <Label className="text-[12px] font-semibold !text-dash-textMuted">Category</Label>
        <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
         <SelectTrigger className="h-12 border-dash-border rounded-xl"><SelectValue /></SelectTrigger>
         <SelectContent className="bg-white border border-dash-border rounded-xl shadow-lg">
          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
         </SelectContent>
        </Select>
       </div>
       <div className="space-y-2">
        <Label className="text-[12px] font-semibold !text-dash-textMuted">Status</Label>
        <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
         <SelectTrigger className="h-12 border-dash-border rounded-xl"><SelectValue /></SelectTrigger>
         <SelectContent className="bg-white border border-dash-border rounded-xl shadow-lg">
          {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
         </SelectContent>
        </Select>
       </div>
      </div>
      <div className="space-y-2">
       <Label className="text-[12px] font-semibold !text-dash-textMuted">Vendor / Supplier</Label>
       <Input value={formData.vendor} onChange={e => setFormData(p => ({ ...p, vendor: e.target.value }))} placeholder="e.g. Amazon, Google" className="h-12 border-dash-border rounded-xl" />
      </div>
      <div className="space-y-2">
       <Label className="text-[12px] font-semibold !text-dash-textMuted">Notes</Label>
       <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional details..." className="min-h-[80px] border-dash-border rounded-xl" />
      </div>
     </div>
     <DialogFooter className="gap-3">
      <DashButton variant="secondary" onClick={() => setFormOpen(false)}>Cancel</DashButton>
      <DashButton variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editingExpense ? 'Save Changes' : 'Add Expense')}</DashButton>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   {/* Delete Dialog */}
   <ConfirmDialog
    isOpen={deleteOpen}
    onClose={() => setDeleteOpen(false)}
    onConfirm={handleDelete}
    title="Delete expense?"
    description="This will permanently delete this expense record. This cannot be undone."
    confirmLabel={deleting ? 'Deleting...' : 'Delete'}
    variant="danger"
   />
  </div>
 );
}

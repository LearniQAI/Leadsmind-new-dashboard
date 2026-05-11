'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
 paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
 unpaid: { label: 'Unpaid', color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3 w-3" /> },
 returned: { label: 'Returned', color: 'bg-purple-100 text-purple-700', icon: <RotateCcw className="h-3 w-3" /> },
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
  { label: 'Total Expenses', value: totalAmount, color: 'text-gray-800', bg: 'bg-blue-50', icon: <Receipt className="h-6 w-6 text-primary" /> },
  { label: 'Total Paid', value: totalPaid, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <CheckCircle className="h-6 w-6 text-emerald-600" /> },
  { label: 'Total Unpaid', value: totalUnpaid, color: 'text-amber-700', bg: 'bg-amber-50', icon: <Clock className="h-6 w-6 text-amber-600" /> },
  { label: 'Returned', value: totalReturned, color: 'text-purple-700', bg: 'bg-purple-50', icon: <RotateCcw className="h-6 w-6 text-purple-600" /> },
 ];

 return (
  <div className="app__slide-wrapper space-y-8">
   {/* Header */}
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
    <div>
     <h1 className="card__title !text-4xl uppercase mb-1">Expense <span className="text-primary">Tracker</span></h1>
     <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Track and manage your business expenses in real-time</p>
    </div>
    <Button onClick={openCreate} className="btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20">
     <Plus className="h-4 w-4 mr-2" /> Add Expense
    </Button>
   </div>

   {/* Stats */}
   <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
    {stats.map(stat => (
     <div key={stat.label} className={`card__wrapper !p-6 !mb-0 ${stat.bg} border-0 shadow-md`}>
      <div className="flex items-center gap-3 mb-3">{stat.icon}<span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stat.label}</span></div>
      <p className={`text-2xl font-black ${stat.color}`}>${stat.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
     </div>
    ))}
   </div>

   {/* Filters + Table */}
   <div className="card__wrapper shadow-lg">
    <div className="flex flex-col md:flex-row gap-4 mb-6">
     <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by description or vendor..." className="pl-10 h-11 border-gray-200 rounded-xl" />
     </div>
     <Select value={filterStatus} onValueChange={setFilterStatus}>
      <SelectTrigger className="w-full md:w-48 h-11 border-gray-200 rounded-xl"><SelectValue placeholder="All Statuses" /></SelectTrigger>
      <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-xl">
       <SelectItem value="all">All Statuses</SelectItem>
       {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
      </SelectContent>
     </Select>
    </div>

    {filtered.length === 0 ? (
     <div className="py-20 text-center">
      <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">{expenses.length === 0 ? 'No expenses recorded yet' : 'No results match your search'}</p>
      {expenses.length === 0 && (
       <Button onClick={openCreate} className="btn-primary mt-6 rounded-xl text-xs uppercase font-black tracking-widest px-8">
        <Plus className="h-4 w-4 mr-2" /> Add First Expense
       </Button>
      )}
     </div>
    ) : (
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-gray-100">
         {['Description', 'Vendor', 'Category', 'Date', 'Amount', 'Status', 'Actions'].map(h => (
          <th key={h} className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
         ))}
        </tr>
       </thead>
       <tbody className="divide-y divide-gray-50">
        {filtered.map(exp => {
         const sc = statusConfig[exp.status || 'unpaid'] || statusConfig.unpaid;
         return (
          <tr key={exp.id} className="hover:bg-gray-50 transition-colors group">
           <td className="px-4 py-4 font-semibold text-gray-800">{exp.description}</td>
           <td className="px-4 py-4 text-gray-500">{exp.vendor || '—'}</td>
           <td className="px-4 py-4">
            <Badge className="bg-blue-50 text-blue-700 border-none text-[9px] font-black uppercase">{exp.category || 'General'}</Badge>
           </td>
           <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
            {exp.date ? format(new Date(exp.date), 'MMM d, yyyy') : '—'}
           </td>
           <td className="px-4 py-4 font-black text-gray-800">${Number(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
           <td className="px-4 py-4">
            <Badge className={`${sc.color} border-none text-[9px] font-black uppercase flex items-center gap-1 w-fit`}>
             {sc.icon} {sc.label}
            </Badge>
           </td>
           <td className="px-4 py-4">
            <DropdownMenu>
             <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
               <MoreVertical size={14} className="text-gray-600" />
              </button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[180px]">
              <DropdownMenuItem onClick={() => openEdit(exp)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg mx-1 px-3 py-2">
               <Pencil size={14} /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => quickStatusUpdate(exp, 'paid')} className="flex items-center gap-2 cursor-pointer text-emerald-600 hover:bg-emerald-50 rounded-lg mx-1 px-3 py-2">
               <CheckCircle size={14} /> Mark as Paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => quickStatusUpdate(exp, 'unpaid')} className="flex items-center gap-2 cursor-pointer text-amber-600 hover:bg-amber-50 rounded-lg mx-1 px-3 py-2">
               <Clock size={14} /> Mark as Unpaid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => quickStatusUpdate(exp, 'returned')} className="flex items-center gap-2 cursor-pointer text-purple-600 hover:bg-purple-50 rounded-lg mx-1 px-3 py-2">
               <RotateCcw size={14} /> Mark as Returned
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setDeleteTarget(exp); setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg mx-1 px-3 py-2">
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
   </div>

   {/* Create/Edit Dialog */}
   <Dialog open={formOpen} onOpenChange={setFormOpen}>
    <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-lg p-8 shadow-2xl">
     <DialogHeader>
      <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">
       {editingExpense ? 'Edit' : 'New'} <span className="text-primary">Expense</span>
      </DialogTitle>
     </DialogHeader>
     <div className="space-y-4 py-4">
      <div className="space-y-2">
       <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Description *</Label>
       <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Office Supplies" className="h-12 border-gray-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Amount *</Label>
        <Input type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="h-12 border-gray-200 rounded-xl" />
       </div>
       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Date</Label>
        <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="h-12 border-gray-200 rounded-xl" />
       </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Category</Label>
        <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
         <SelectTrigger className="h-12 border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
         <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-xl">
          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
         </SelectContent>
        </Select>
       </div>
       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Status</Label>
        <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
         <SelectTrigger className="h-12 border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
         <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-xl">
          {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
         </SelectContent>
        </Select>
       </div>
      </div>
      <div className="space-y-2">
       <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vendor / Supplier</Label>
       <Input value={formData.vendor} onChange={e => setFormData(p => ({ ...p, vendor: e.target.value }))} placeholder="e.g. Amazon, Google" className="h-12 border-gray-200 rounded-xl" />
      </div>
      <div className="space-y-2">
       <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Notes</Label>
       <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional details..." className="min-h-[80px] border-gray-200 rounded-xl" />
      </div>
     </div>
     <DialogFooter className="gap-3">
      <Button variant="outline" onClick={() => setFormOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
      <Button onClick={handleSave} disabled={saving} className="btn-primary rounded-xl font-black uppercase text-xs px-8">{saving ? 'Saving...' : (editingExpense ? 'Save Changes' : 'Add Expense')}</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   {/* Delete Dialog */}
   <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
    <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-sm p-8 shadow-2xl">
     <DialogHeader>
      <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Delete Expense?</DialogTitle>
     </DialogHeader>
     <p className="text-gray-500 text-sm py-4">This will permanently delete this expense record. This cannot be undone.</p>
     <DialogFooter className="gap-3">
      <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
      <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Deleting...' : 'Delete'}</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </div>
 );
}

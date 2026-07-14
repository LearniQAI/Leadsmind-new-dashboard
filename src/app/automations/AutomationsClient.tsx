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
 Plus, Zap, Play, Pause, MoreVertical, GitBranch, Pencil, Trash2,
 CheckCircle, Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
 Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
 DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const TRIGGER_TYPES = ['contact_created', 'tag_added', 'form_submitted', 'appointment_booked', 'invoice_paid', 'manual'];

export default function AutomationsClient({ initialWorkflows }: { initialWorkflows: any[] }) {
 const [workflows, setWorkflows] = useState<any[]>(initialWorkflows);

 const [formOpen, setFormOpen] = useState(false);
 const [editingWf, setEditingWf] = useState<any>(null);
 const [formData, setFormData] = useState({ name: '', trigger_type: 'contact_created', description: '' });
 const [saving, setSaving] = useState(false);

 const [deleteOpen, setDeleteOpen] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<any>(null);
 const [deleting, setDeleting] = useState(false);

 const openCreate = () => {
  setEditingWf(null);
  setFormData({ name: '', trigger_type: 'contact_created', description: '' });
  setFormOpen(true);
 };

 const openEdit = (wf: any) => {
  setEditingWf(wf);
  setFormData({ name: wf.name || '', trigger_type: wf.trigger_type || 'contact_created', description: wf.description || '' });
  setFormOpen(true);
 };

 const handleSave = async () => {
  if (!formData.name.trim()) { toast.error('Workflow name is required'); return; }
  setSaving(true);
  try {
   if (editingWf) {
    const { updateWorkflow } = await import('@/app/actions/automation_crud');
    const res = await updateWorkflow(editingWf.id, formData);
    if (res.error) { toast.error(res.error); }
    else {
     toast.success('Workflow updated!');
     setWorkflows(prev => prev.map(w => w.id === editingWf.id ? { ...w, ...formData } : w));
     setFormOpen(false);
    }
   } else {
    const { createWorkflow } = await import('@/app/actions/automation_crud');
    const res = await createWorkflow(formData);
    if (res.error) { toast.error(res.error); }
    else {
     toast.success('Workflow created!');
     setWorkflows(prev => [res.data!, ...prev]);
     setFormOpen(false);
    }
   }
  } catch { toast.error('Failed to save'); }
  setSaving(false);
 };

 const handleToggleActive = async (wf: any) => {
  try {
   const { updateWorkflow } = await import('@/app/actions/automation_crud');
   const res = await updateWorkflow(wf.id, { is_active: !wf.is_active });
   if (res.error) { toast.error(res.error); return; }
   setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, is_active: !w.is_active } : w));
   toast.success(wf.is_active ? 'Workflow paused' : 'Workflow activated!');
  } catch { toast.error('Failed to update status'); }
 };

 const handleDelete = async () => {
  if (!deleteTarget) return;
  setDeleting(true);
  try {
   const { deleteWorkflow } = await import('@/app/actions/automation_crud');
   const res = await deleteWorkflow(deleteTarget.id);
   if (res.error) { toast.error(res.error); }
   else {
    toast.success('Workflow deleted');
    setWorkflows(prev => prev.filter(w => w.id !== deleteTarget.id));
    setDeleteOpen(false);
   }
  } catch { toast.error('Delete failed'); }
  setDeleting(false);
 };

 return (
  <div className="space-y-8">
   <div className="flex items-center justify-between">
    <div>
     <h1 className="text-3xl font-bold !text-dash-text mb-1">Workflow <span className="text-dash-accent">engine</span></h1>
     <p className="text-xs !text-dash-textMuted">Scale your business with automated workflows.</p>
    </div>
    <Button onClick={openCreate} className="bg-dash-accent hover:bg-dash-accent/90 text-white !rounded-xl text-[10px] font-bold px-8 shadow-lg shadow-dash-accent/20 transition-colors motion-reduce:transition-none">
     <Plus className="w-4 h-4 mr-2" /> New workflow
    </Button>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    {workflows.length === 0 ? (
     <div className="col-span-full py-20 bg-dash-surface border-2 border-dashed border-dash-border rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-dash-accent/40 transition-all motion-reduce:transition-none" onClick={openCreate}>
      <div className="w-16 h-16 bg-dash-accent/10 rounded-full flex items-center justify-center mb-6 border border-dash-accent/20">
       <Zap className="w-8 h-8 text-dash-accent" />
      </div>
      <h3 className="text-lg font-bold !text-dash-textMuted">No workflows yet</h3>
      <p className="!text-dash-textMuted text-[10px] font-bold mt-2">Click to create your first automation</p>
     </div>
    ) : workflows.map(wf => (
     <div key={wf.id} className="bg-white border border-dash-border rounded-2xl p-6 group hover:border-dash-accent/50 transition-all motion-reduce:transition-none duration-300 shadow-sm">
      <div className="flex justify-between items-start mb-6">
       <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all motion-reduce:transition-none ${wf.is_active ? 'bg-dash-accent/10 text-dash-accent border-dash-accent/20' : 'bg-dash-surface !text-dash-textMuted border-dash-border'}`}>
        <Zap size={20} className={wf.is_active ? 'animate-pulse motion-reduce:animate-none' : ''} />
       </div>
       <div className="flex items-center gap-2">
        <Badge className={`text-[9px] font-bold px-3 py-1 rounded-full border-none ${wf.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-dash-surface !text-dash-textMuted'}`}>
         {wf.is_active ? 'Active' : 'Paused'}
        </Badge>
        <DropdownMenu>
         <DropdownMenuTrigger asChild>
          <button className="h-8 w-8 rounded-lg bg-dash-surface hover:bg-dash-border/60 flex items-center justify-center transition-colors motion-reduce:transition-none">
           <MoreVertical size={14} className="!text-dash-textMuted" />
          </button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-xl rounded-xl min-w-[170px]">
          <DropdownMenuItem onClick={() => openEdit(wf)} className="flex items-center gap-2 cursor-pointer !text-dash-text hover:text-dash-accent hover:bg-dash-accent/5 rounded-lg mx-1 px-3 py-2">
           <Pencil size={14} /> Edit workflow
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleToggleActive(wf)} className="flex items-center gap-2 cursor-pointer !text-dash-text hover:bg-dash-surface rounded-lg mx-1 px-3 py-2">
           {wf.is_active ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Activate</>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setDeleteTarget(wf); setDeleteOpen(true); }} className="flex items-center gap-2 cursor-pointer text-red hover:bg-red/5 rounded-lg mx-1 px-3 py-2">
           <Trash2 size={14} /> Delete
          </DropdownMenuItem>
         </DropdownMenuContent>
        </DropdownMenu>
       </div>
      </div>

      <div className="mb-6">
       <h4 className="text-xl font-bold !text-dash-text mb-1">{wf.name}</h4>
       {wf.description && <p className="!text-dash-textMuted text-xs mb-2">{wf.description}</p>}
       <div className="flex items-center gap-2 text-[10px] font-bold !text-dash-textMuted">
        <GitBranch className="w-3.5 h-3.5 text-dash-accent" />
        <span>Trigger: {wf.trigger_type?.replace(/_/g, ' ')}</span>
       </div>
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-dash-border">
       <span className="text-[10px] font-bold !text-dash-textMuted">{wf.steps?.[0]?.count || 0} steps</span>
       <div className="flex items-center gap-2">
        <Button onClick={() => handleToggleActive(wf)} size="sm" className={`h-8 px-4 rounded-xl text-[9px] font-bold flex items-center gap-1.5 transition-colors motion-reduce:transition-none ${wf.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
         {wf.is_active ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Activate</>}
        </Button>
        <Button onClick={() => openEdit(wf)} variant="outline" size="sm" className="h-8 px-3 rounded-xl border-dash-border text-[9px] font-bold !text-dash-textMuted hover:text-dash-accent hover:border-dash-accent hover:bg-dash-accent/5 flex items-center gap-1.5 transition-colors motion-reduce:transition-none">
         <Pencil size={11} /> Edit
        </Button>
       </div>
      </div>
     </div>
    ))}
   </div>

   {/* Create / Edit Dialog */}
   <Dialog open={formOpen} onOpenChange={setFormOpen}>
    <DialogContent className="bg-white border border-dash-border rounded-3xl max-w-lg p-8 shadow-2xl">
     <DialogHeader>
      <DialogTitle className="text-2xl font-bold !text-dash-text">
       {editingWf ? 'Edit' : 'New'} <span className="text-dash-accent">workflow</span>
      </DialogTitle>
     </DialogHeader>
     <div className="space-y-4 py-4">
      <div className="space-y-2">
       <Label className="text-[10px] font-bold !text-dash-textMuted">Workflow name *</Label>
       <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. New Lead Welcome Sequence" className="h-12 border-dash-border rounded-xl" />
      </div>
      <div className="space-y-2">
       <Label className="text-[10px] font-bold !text-dash-textMuted">Trigger event</Label>
       <Select value={formData.trigger_type} onValueChange={v => setFormData(p => ({ ...p, trigger_type: v }))}>
        <SelectTrigger className="h-12 border-dash-border rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
         {TRIGGER_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</SelectItem>)}
        </SelectContent>
       </Select>
      </div>
      <div className="space-y-2">
       <Label className="text-[10px] font-bold !text-dash-textMuted">Description</Label>
       <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="What does this workflow do?" className="min-h-[80px] border-dash-border rounded-xl" />
      </div>
     </div>
     <DialogFooter className="gap-3">
      <Button variant="outline" onClick={() => setFormOpen(false)} className="border-dash-border !text-dash-textMuted rounded-xl">Cancel</Button>
      <Button onClick={handleSave} disabled={saving} className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl font-bold text-xs px-8 transition-colors motion-reduce:transition-none">{saving ? 'Saving...' : (editingWf ? 'Save changes' : 'Create workflow')}</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   {/* Delete Dialog */}
   <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
    <DialogContent className="bg-white border border-dash-border rounded-3xl max-w-sm p-8 shadow-2xl">
     <DialogHeader>
      <DialogTitle className="text-xl font-bold !text-dash-text">Delete workflow?</DialogTitle>
     </DialogHeader>
     <p className="!text-dash-textMuted text-sm py-4">This will permanently delete <strong className="!text-dash-text">{deleteTarget?.name}</strong> and all its steps.</p>
     <DialogFooter className="gap-3">
      <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-dash-border !text-dash-textMuted rounded-xl">Cancel</Button>
      <Button onClick={handleDelete} disabled={deleting} className="bg-red hover:bg-red/90 text-white rounded-xl font-bold text-xs px-8 transition-colors motion-reduce:transition-none">{deleting ? 'Deleting...' : 'Delete'}</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </div>
 );
}

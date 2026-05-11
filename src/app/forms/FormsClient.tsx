'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus, FileText, Share2, UserCheck, Pencil, Trash2, Globe, X,
  CheckCircle, Clock, MoreVertical, Copy
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createForm } from '@/app/actions/marketing';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function FormsClient({ initialForms }: { initialForms: any[] }) {
  const router = useRouter();
  const [forms, setForms] = useState(initialForms);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteForm, setDeleteForm] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!createName.trim()) { toast.error('Please enter a form name'); return; }
    setCreating(true);
    const res = await createForm(createName.trim());
    setCreating(false);
    if (res.error) { toast.error(res.error); }
    else {
      toast.success('Form created!');
      setForms(prev => [res.data, ...prev]);
      setCreateName('');
      setCreateOpen(false);
    }
  };

  const openEdit = (form: any) => {
    setEditForm(form);
    setEditName(form.name);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    setSaving(true);
    try {
      const { updateForm } = await import('@/app/actions/marketing');
      const res = await updateForm(editForm.id, { name: editName });
      if (res.error) { toast.error(res.error); }
      else {
        toast.success('Form updated!');
        setForms(prev => prev.map(f => f.id === editForm.id ? { ...f, name: editName } : f));
        setEditOpen(false);
      }
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const handlePublish = async (form: any) => {
    try {
      const { updateForm } = await import('@/app/actions/marketing');
      const isLive = form.status === 'published';
      const newStatus = isLive ? 'draft' : 'published';
      const res = await updateForm(form.id, { status: newStatus });
      if (res.error) { toast.error(res.error); return; }
      setForms(prev => prev.map(f => f.id === form.id ? { ...f, status: newStatus } : f));
      toast.success(isLive ? 'Form moved to Draft' : 'Form is now Live!');
    } catch { toast.error('Status update failed'); }
  };

  const copyLink = (form: any) => {
    const url = `${window.location.origin}/forms/${form.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Form link copied!');
  };

  const openDelete = (form: any) => { setDeleteForm(form); setDeleteOpen(true); };

  const handleDelete = async () => {
    if (!deleteForm) return;
    setDeleting(true);
    try {
      const { deleteFormAction } = await import('@/app/actions/marketing');
      const res = await deleteFormAction(deleteForm.id);
      if (res.error) { toast.error(res.error); }
      else {
        toast.success('Form deleted');
        setForms(prev => prev.filter(f => f.id !== deleteForm.id));
        setDeleteOpen(false);
      }
    } catch { toast.error('Delete failed'); }
    setDeleting(false);
  };

  const statusColor = (status: string) => {
    if (status === 'published') return 'bg-emerald-100 text-emerald-700';
    return 'bg-amber-100 text-amber-700';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="card__title !text-4xl uppercase mb-1">Smart <span className="text-primary">Forms</span></h1>
          <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Capture high-intent leads with precision data extraction.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Build Form
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {forms.length === 0 ? (
          <div className="col-span-full py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 transition-all" onClick={() => setCreateOpen(true)}>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-black uppercase text-gray-500 tracking-widest">No Forms Yet</h3>
            <p className="text-gray-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Click to build your first form</p>
          </div>
        ) : forms.map(form => (
          <div key={form.id} className="card__wrapper !p-6 !mb-0 group hover:border-primary/50 transition-all duration-300 shadow-lg">
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <FileText size={20} />
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border-none ${statusColor(form.status)}`}>
                  {form.status || 'draft'}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                      <MoreVertical size={14} className="text-gray-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[160px]">
                    <DropdownMenuItem onClick={() => openEdit(form)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg mx-1 px-3 py-2">
                      <Pencil size={14} /> Edit Form
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePublish(form)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg mx-1 px-3 py-2">
                      {form.status === 'published' ? <><Clock size={14} /> Move to Draft</> : <><Globe size={14} /> Publish Live</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyLink(form)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg mx-1 px-3 py-2">
                      <Copy size={14} /> Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDelete(form)} className="flex items-center gap-2 cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg mx-1 px-3 py-2">
                      <Trash2 size={14} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-2">{form.name}</h4>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                <span>{form.submissions?.[0]?.count || 0} Submissions</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-gray-100">
              <Button onClick={() => copyLink(form)} variant="outline" size="sm" className="h-8 px-3 rounded-lg border-gray-200 text-[9px] font-black uppercase text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-1.5">
                <Share2 size={11} /> Share
              </Button>
              <div className="flex items-center gap-2">
                <Button onClick={() => openEdit(form)} variant="outline" size="sm" className="h-8 px-3 rounded-lg border-gray-200 text-[9px] font-black uppercase text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 flex items-center gap-1.5">
                  <Pencil size={11} /> Edit
                </Button>
                <Button onClick={() => handlePublish(form)} size="sm" className={`h-8 px-3 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 ${form.status === 'published' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                  {form.status === 'published' ? <><Clock size={11} /> Draft</> : <><Globe size={11} /> Publish</>}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-md p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">Build a <span className="text-primary">Form</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Form Name</Label>
              <Input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Contact Us Form" className="h-12 border-gray-200 rounded-xl" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="btn-primary rounded-xl font-black uppercase text-xs px-8">{creating ? 'Creating...' : 'Create Form'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-md p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">Edit <span className="text-primary">Form</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Form Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 border-gray-200 rounded-xl" />
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Current Status</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-800">{editForm?.status === 'published' ? 'Live — visible to users' : 'Draft — not public'}</span>
                <Button onClick={() => { if (editForm) handlePublish(editForm); }} size="sm" className={`h-8 px-4 rounded-lg text-[9px] font-black uppercase ${editForm?.status === 'published' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                  {editForm?.status === 'published' ? 'Unpublish' : 'Publish'}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="btn-primary rounded-xl font-black uppercase text-xs px-8">{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-sm p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Delete Form?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm py-4">This will permanently delete <strong className="text-gray-800">{deleteForm?.name}</strong> and all its submissions.</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

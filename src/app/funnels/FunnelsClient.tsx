'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Filter, ArrowRight, Globe, Pencil, Trash2, X, ExternalLink,
  CheckCircle, Clock, MoreVertical
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createFunnel } from '@/app/actions/marketing';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default function FunnelsClient({ initialFunnels }: { initialFunnels: any[] }) {
  const router = useRouter();
  const [funnels, setFunnels] = useState(initialFunnels);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editFunnel, setEditFunnel] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editSubdomain, setEditSubdomain] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFunnel, setDeleteFunnel] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!createName.trim()) { toast.error('Please enter a funnel name'); return; }
    setCreating(true);
    const res = await createFunnel(createName.trim());
    setCreating(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Funnel created!');
      setFunnels(prev => [res.data, ...prev]);
      setCreateName('');
      setCreateOpen(false);
    }
  };

  const openEdit = (funnel: any) => {
    setEditFunnel(funnel);
    setEditName(funnel.name);
    setEditSubdomain(funnel.subdomain || '');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFunnel) return;
    setSaving(true);
    try {
      const { updateFunnel } = await import('@/app/actions/marketing');
      const res = await updateFunnel(editFunnel.id, { name: editName, subdomain: editSubdomain });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Funnel updated!');
        setFunnels(prev => prev.map(f => f.id === editFunnel.id ? { ...f, name: editName, subdomain: editSubdomain } : f));
        setEditOpen(false);
      }
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const handlePublish = async (funnel: any) => {
    try {
      const { updateFunnel } = await import('@/app/actions/marketing');
      const newStatus = !funnel.is_published;
      const res = await updateFunnel(funnel.id, { is_published: newStatus });
      if (res.error) { toast.error(res.error); return; }
      setFunnels(prev => prev.map(f => f.id === funnel.id ? { ...f, is_published: newStatus } : f));
      toast.success(newStatus ? 'Funnel is now Live!' : 'Funnel moved to Draft');
    } catch { toast.error('Status update failed'); }
  };

  const openDelete = (funnel: any) => {
    setDeleteFunnel(funnel);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteFunnel) return;
    setDeleting(true);
    try {
      const { deleteFunnelAction } = await import('@/app/actions/marketing');
      const res = await deleteFunnelAction(deleteFunnel.id);
      if (res.error) { toast.error(res.error); }
      else {
        toast.success('Funnel deleted');
        setFunnels(prev => prev.filter(f => f.id !== deleteFunnel.id));
        setDeleteOpen(false);
      }
    } catch { toast.error('Delete failed'); }
    setDeleting(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="card__title !text-4xl uppercase mb-1">Marketing <span className="text-primary">Funnels</span></h1>
          <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Design high-performance conversion pathways.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Funnel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {funnels.length === 0 ? (
          <div className="col-span-full py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 transition-all" onClick={() => setCreateOpen(true)}>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
              <Filter className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-black uppercase text-gray-500 tracking-widest">No Funnels Yet</h3>
            <p className="text-gray-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Click to create your first funnel</p>
          </div>
        ) : funnels.map(funnel => (
          <div key={funnel.id} className="card__wrapper !p-6 !mb-0 group hover:border-primary/50 transition-all duration-300 shadow-lg relative">
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Filter size={20} />
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border-none ${funnel.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {funnel.is_published ? 'Live' : 'Draft'}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                      <MoreVertical size={14} className="text-gray-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-xl rounded-xl min-w-[160px]">
                    <DropdownMenuItem onClick={() => openEdit(funnel)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg mx-1 px-3 py-2">
                      <Pencil size={14} /> Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePublish(funnel)} className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg mx-1 px-3 py-2">
                      {funnel.is_published ? <><Clock size={14} /> Move to Draft</> : <><CheckCircle size={14} /> Publish Live</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDelete(funnel)} className="flex items-center gap-2 cursor-pointer text-rose-600 hover:bg-rose-50 rounded-lg mx-1 px-3 py-2">
                      <Trash2 size={14} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-1">{funnel.name}</h4>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Globe size={12} className="text-primary" />
                <span className="text-primary/70 lowercase">/{funnel.subdomain}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-gray-100">
              <Button onClick={() => openEdit(funnel)} variant="outline" className="h-9 px-4 rounded-xl border-gray-200 text-[9px] font-black uppercase tracking-widest text-gray-600 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-2">
                <Pencil size={12} /> Edit
              </Button>
              <Button onClick={() => handlePublish(funnel)} className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${funnel.is_published ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                {funnel.is_published ? <><Clock size={12} /> Unpublish</> : <><CheckCircle size={12} /> Publish</>}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-md p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">New <span className="text-primary">Funnel</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Funnel Name</Label>
              <Input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Lead Capture Funnel" className="h-12 border-gray-200 rounded-xl text-gray-800" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="btn-primary rounded-xl font-black uppercase text-xs px-8">{creating ? 'Creating...' : 'Create Funnel'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-md p-8 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">Edit <span className="text-primary">Funnel</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 border-gray-200 rounded-xl text-gray-800" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">URL Slug</Label>
              <Input value={editSubdomain} onChange={e => setEditSubdomain(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="h-12 border-gray-200 rounded-xl text-gray-800" />
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
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Delete Funnel?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm py-4">This will permanently delete <strong className="text-gray-800">{deleteFunnel?.name}</strong> and all its data. This cannot be undone.</p>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

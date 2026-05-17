'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus, Filter, ArrowRight, Globe, Pencil, Trash2, X, ExternalLink,
  CheckCircle, Clock, MoreVertical, Copy, BarChart2, Layout
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createFunnel } from '@/app/actions/marketing';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/funnels/EmptyState';
import { cn } from '@/lib/utils';

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

  const handleClone = async (funnel: any) => {
    const toastId = toast.loading('Cloning funnel structure and steps...');
    try {
      const { duplicateFunnelAction } = await import('@/app/actions/marketing');
      const res = await duplicateFunnelAction(funnel.id);
      if (res.error) {
        toast.error(res.error, { id: toastId });
      } else {
        toast.success('Funnel cloned successfully!', { id: toastId });
        if (res.data) {
          setFunnels(prev => [res.data, ...prev]);
        }
      }
    } catch (err: any) {
      toast.error('Failed to clone funnel', { id: toastId });
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="ph-left">
          <h1 className="text-[22px] font-bold font-display tracking-tight text-[#eef2ff]">
            Marketing <span className="text-[#3b82f6]">Funnels</span>
          </h1>
          <p className="text-[11.5px] text-[#4a5a82] uppercase tracking-[0.8px] font-medium mt-1">
            Design high-performance conversion pathways and sequential user steps
          </p>
        </div>
        <Button 
          onClick={() => setCreateOpen(true)} 
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[8px] font-semibold text-[13px] h-9 px-5 shadow-lg shadow-[#2563eb]/20 transition-all active:scale-[0.98] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> 
          <span>New Funnel</span>
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {funnels.length === 0 ? (
          <div className="col-span-full">
            <EmptyState onCreateFunnel={() => setCreateOpen(true)} />
          </div>
        ) : funnels.map(funnel => (
          <div 
            key={funnel.id} 
            className="relative bg-[#0c1535]/85 border border-white/[0.07] rounded-xl p-[18px] transition-all duration-300 hover:bg-[#152550]/90 hover:border-white/[0.13] hover:-translate-y-0.5 group flex flex-col justify-between shadow-sm border-t-[3.5px] border-t-white/10"
          >
            <div>
              <div className="flex justify-between items-start mb-5">
                <div
                  onClick={() => router.push(`/funnels/${funnel.id}`)}
                  className="h-10 w-10 rounded-[10px] bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-[#94a3c8] group-hover:text-[#3b82f6] group-hover:bg-[#3b82f6]/10 group-hover:border-[#3b82f6]/20 cursor-pointer transition-all shadow-inner"
                  title="Open Funnel Builder"
                >
                  <Layout size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm",
                    funnel.is_published
                      ? "bg-[#10b981]/10 text-[#34d399] border-[#10b981]/20"
                      : "bg-[#8b5cf6]/10 text-[#a78bfa] border-[#8b5cf6]/20"
                  )}>
                    {funnel.is_published ? 'Live' : 'Draft'}
                  </span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 transition-all">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 bg-[#0c1535] border-white/[0.07] p-1.5 rounded-[12px] shadow-2xl z-[9999]">
                      <DropdownMenuItem onClick={() => router.push(`/funnels/${funnel.id}`)} className="flex items-center gap-2.5 p-2.5 rounded-[8px] text-[12px] font-medium text-[#94a3c8] cursor-pointer hover:bg-white/[0.05] hover:text-[#eef2ff] transition-all">
                        <Layout size={14} className="text-[#3b82f6]" /> Open Builder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/funnels/${funnel.id}/analytics`)} className="flex items-center gap-2.5 p-2.5 rounded-[8px] text-[12px] font-medium text-[#94a3c8] cursor-pointer hover:bg-white/[0.05] hover:text-[#eef2ff] transition-all">
                        <BarChart2 size={14} /> View Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleClone(funnel)} className="flex items-center gap-2.5 p-2.5 rounded-[8px] text-[12px] font-medium text-[#94a3c8] cursor-pointer hover:bg-white/[0.05] hover:text-[#eef2ff] transition-all">
                        <Copy size={14} /> Clone Funnel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(funnel)} className="flex items-center gap-2.5 p-2.5 rounded-[8px] text-[12px] font-medium text-[#94a3c8] cursor-pointer hover:bg-white/[0.05] hover:text-[#eef2ff] transition-all">
                        <Pencil size={14} /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePublish(funnel)} className="flex items-center gap-2.5 p-2.5 rounded-[8px] text-[12px] font-medium text-[#94a3c8] cursor-pointer hover:bg-white/[0.05] hover:text-[#eef2ff] transition-all">
                        {funnel.is_published ? <><Clock size={14} /> Move to Draft</> : <><CheckCircle size={14} /> Publish Live</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/[0.07] my-1" />
                      <DropdownMenuItem onClick={() => openDelete(funnel)} className="flex items-center gap-2.5 p-2.5 rounded-[8px] text-[12px] font-medium text-[#ef4444] cursor-pointer hover:bg-[#ef4444]/10 transition-all">
                        <Trash2 size={14} /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mb-5 cursor-pointer group-hover:translate-x-0.5 transition-transform" onClick={() => router.push(`/funnels/${funnel.id}`)}>
                <h4 className="text-[15px] font-bold text-[#eef2ff] tracking-tight font-display mb-1 group-hover:text-[#3b82f6] transition-colors leading-tight">
                  {funnel.name}
                </h4>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-wider shrink-0">Path:</span>
                  <span className="text-[11px] font-medium text-[#3b82f6]/70 lowercase truncate">/{funnel.subdomain || 'funnel'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 bg-white/[0.02] border border-white/5 rounded-xl text-center mb-6">
                <div>
                  <span className="block text-[8px] font-bold text-[#4a5a82] uppercase tracking-wider mb-0.5">Steps</span>
                  <span className="text-xs font-black text-[#eef2ff]">1+</span>
                </div>
                <div className="border-x border-white/10">
                  <span className="block text-[8px] font-bold text-[#4a5a82] uppercase tracking-wider mb-0.5">Views</span>
                  <span className="text-xs font-black text-[#eef2ff]">0</span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-[#4a5a82] uppercase tracking-wider mb-0.5">Conv.</span>
                  <span className="text-xs font-black text-emerald-500">0%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/[0.07] mt-auto">
              <Button 
                onClick={() => router.push(`/funnels/${funnel.id}`)} 
                className="flex-1 h-8.5 bg-[#2563eb] text-white rounded-[8px] font-bold text-[11.5px] hover:bg-[#1d4ed8] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#2563eb]/10"
              >
                <span>Open Builder</span>
                <ArrowRight size={13} />
              </Button>
              <Button 
                onClick={() => openEdit(funnel)} 
                variant="outline" 
                size="icon" 
                className="h-8.5 w-8.5 rounded-[8px] bg-white/[0.04] border border-white/[0.07] text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 transition-all"
              >
                <Pencil size={12} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#080f28] border border-white/[0.07] text-[#eef2ff] max-w-md p-8 shadow-2xl rounded-[16px] z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold font-display uppercase tracking-tight">Deploy <span className="text-[#3b82f6]">New Funnel</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-[#4a5a82]">Funnel Name</Label>
              <Input 
                value={createName} 
                onChange={e => setCreateName(e.target.value)} 
                placeholder="e.g. Lead Capture Funnel" 
                className="h-11 bg-white/[0.04] border-white/10 text-white rounded-[10px] px-5 text-[13px] font-medium placeholder:text-[#2a3557] focus:border-[#2563eb]/50 focus:bg-white/[0.06] transition-all outline-none" 
                onKeyDown={e => e.key === 'Enter' && handleCreate()} 
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-[11px] font-bold uppercase tracking-widest text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 h-10 px-6 rounded-[8px]">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[8px] font-semibold text-[11px] uppercase tracking-widest h-10 px-6 shadow-lg shadow-[#2563eb]/20">{creating ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#080f28] border border-white/[0.07] text-[#eef2ff] max-w-md p-8 shadow-2xl rounded-[16px] z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold font-display uppercase tracking-tight">Configure <span className="text-[#3b82f6]">Funnel Settings</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-[#4a5a82]">Name</Label>
              <Input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                className="h-11 bg-white/[0.04] border-white/10 text-white rounded-[10px] px-5 text-[13px] font-medium focus:border-[#2563eb]/50 focus:bg-white/[0.06] transition-all outline-none" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-[#4a5a82]">URL Path Slug</Label>
              <Input 
                value={editSubdomain} 
                onChange={e => setEditSubdomain(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                className="h-11 bg-white/[0.04] border-white/10 text-white rounded-[10px] px-5 text-[13px] font-medium focus:border-[#2563eb]/50 focus:bg-white/[0.06] transition-all outline-none" 
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="text-[11px] font-bold uppercase tracking-widest text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 h-10 px-6 rounded-[8px]">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[8px] font-semibold text-[11px] uppercase tracking-widest h-10 px-6 shadow-lg shadow-[#2563eb]/20">{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#080f28] border border-white/[0.07] text-[#eef2ff] max-w-sm p-8 shadow-2xl rounded-[16px] z-[9999]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold font-display uppercase tracking-tight text-red-500">Purge Funnel?</DialogTitle>
          </DialogHeader>
          <p className="text-[#94a3c8] text-[13px] py-4 leading-relaxed">
            This will permanently delete funnel <strong className="text-[#eef2ff]">{deleteFunnel?.name}</strong> and all its ordered page lanes. This action is irreversible.
          </p>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-[11px] font-bold uppercase tracking-widest text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 h-10 px-6 rounded-[8px]">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-[8px] font-semibold text-[11px] uppercase tracking-widest h-10 px-6">{deleting ? 'Purging...' : 'Confirm Purge'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

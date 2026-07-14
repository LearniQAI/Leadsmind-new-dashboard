'use client';

import React, { useState } from 'react';
import {
  Plus, ArrowRight, Pencil, Trash2, CheckCircle, Clock, MoreVertical, Copy, BarChart2, Layout
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createFunnel } from '@/app/actions/marketing';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/funnels/EmptyState';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter
} from '@/components/dashboard-ui/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

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
      toast.success(newStatus ? 'Funnel is now live!' : 'Funnel moved to draft');
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
        <div>
          <h1 className="text-3xl font-bold !text-dash-text">
            Marketing <span className="text-dash-accent">funnels</span>
          </h1>
          <p className="text-[12px] !text-dash-textMuted mt-2 font-medium">
            Design high-performance conversion pathways and sequential user steps
          </p>
        </div>
        <DashButton onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>New funnel</span>
        </DashButton>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {funnels.length === 0 ? (
          <div className="col-span-full">
            <EmptyState onCreateFunnel={() => setCreateOpen(true)} />
          </div>
        ) : funnels.map(funnel => (
          <DashCard key={funnel.id} padding="default" className="flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-5">
                <div
                  onClick={() => router.push(`/funnels/${funnel.id}`)}
                  className="h-10 w-10 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent group-hover:bg-dash-accent/10 group-hover:border-dash-accent/20 cursor-pointer transition-colors motion-reduce:transition-none"
                  title="Open Funnel Builder"
                >
                  <Layout size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <DashStatusPill variant={funnel.is_published ? 'success' : 'accent'}>
                    {funnel.is_published ? 'Live' : 'Draft'}
                  </DashStatusPill>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface transition-colors motion-reduce:transition-none">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 bg-white border border-dash-border p-1.5 rounded-xl shadow-lg">
                      <DropdownMenuItem onClick={() => router.push(`/funnels/${funnel.id}`)} className="flex items-center gap-2.5 p-2.5 rounded-lg text-[12px] font-medium !text-dash-textMuted cursor-pointer hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none">
                        <Layout size={14} className="text-dash-accent" /> Open builder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/funnels/${funnel.id}/analytics`)} className="flex items-center gap-2.5 p-2.5 rounded-lg text-[12px] font-medium !text-dash-textMuted cursor-pointer hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none">
                        <BarChart2 size={14} /> View analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleClone(funnel)} className="flex items-center gap-2.5 p-2.5 rounded-lg text-[12px] font-medium !text-dash-textMuted cursor-pointer hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none">
                        <Copy size={14} /> Clone funnel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(funnel)} className="flex items-center gap-2.5 p-2.5 rounded-lg text-[12px] font-medium !text-dash-textMuted cursor-pointer hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none">
                        <Pencil size={14} /> Edit details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePublish(funnel)} className="flex items-center gap-2.5 p-2.5 rounded-lg text-[12px] font-medium !text-dash-textMuted cursor-pointer hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none">
                        {funnel.is_published ? <><Clock size={14} /> Move to draft</> : <><CheckCircle size={14} /> Publish live</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-dash-border my-1" />
                      <DropdownMenuItem onClick={() => openDelete(funnel)} className="flex items-center gap-2.5 p-2.5 rounded-lg text-[12px] font-medium text-red cursor-pointer hover:bg-red/10 transition-colors motion-reduce:transition-none">
                        <Trash2 size={14} /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mb-5 cursor-pointer" onClick={() => router.push(`/funnels/${funnel.id}`)}>
                <h4 className="text-[15px] font-bold !text-dash-text mb-1 group-hover:text-dash-accent transition-colors motion-reduce:transition-none leading-tight">
                  {funnel.name}
                </h4>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-[10px] font-bold !text-dash-textMuted shrink-0">Path:</span>
                  <span className="text-[11px] font-medium text-dash-accent/70 lowercase truncate">/{funnel.subdomain || 'funnel'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 bg-dash-surface border border-dash-border rounded-xl text-center mb-6">
                <div>
                  <span className="block text-[9px] font-bold !text-dash-textMuted mb-0.5">Steps</span>
                  <span className="text-xs font-bold !text-dash-text">1+</span>
                </div>
                <div className="border-x border-dash-border">
                  <span className="block text-[9px] font-bold !text-dash-textMuted mb-0.5">Views</span>
                  <span className="text-xs font-bold !text-dash-text">0</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold !text-dash-textMuted mb-0.5">Conv.</span>
                  <span className="text-xs font-bold text-green">0%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-dash-border mt-auto">
              <DashButton
                onClick={() => router.push(`/funnels/${funnel.id}`)}
                className="flex-1"
              >
                <span>Open builder</span>
                <ArrowRight size={13} />
              </DashButton>
              <DashButton
                onClick={() => openEdit(funnel)}
                variant="secondary"
                size="icon"
              >
                <Pencil size={12} />
              </DashButton>
            </div>
          </DashCard>
        ))}
      </div>

      {/* Create Dialog */}
      <DashModal open={createOpen} onOpenChange={setCreateOpen}>
        <DashModalContent className="max-w-md">
          <DashModalHeader>
            <DashModalTitle>Deploy <span className="text-dash-accent">new funnel</span></DashModalTitle>
          </DashModalHeader>
          <div className="space-y-4">
            <DashFormField label="Funnel name">
              <DashInput
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="e.g. Lead Capture Funnel"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </DashFormField>
          </div>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create'}</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      {/* Edit Dialog */}
      <DashModal open={editOpen} onOpenChange={setEditOpen}>
        <DashModalContent className="max-w-md">
          <DashModalHeader>
            <DashModalTitle>Configure <span className="text-dash-accent">funnel settings</span></DashModalTitle>
          </DashModalHeader>
          <div className="space-y-4">
            <DashFormField label="Name">
              <DashInput value={editName} onChange={e => setEditName(e.target.value)} />
            </DashFormField>
            <DashFormField label="URL path slug">
              <DashInput
                value={editSubdomain}
                onChange={e => setEditSubdomain(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              />
            </DashFormField>
          </div>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setEditOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete funnel?"
        description={`This will permanently delete funnel "${deleteFunnel?.name}" and all its ordered page lanes. This action is irreversible.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}

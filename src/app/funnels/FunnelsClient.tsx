'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, ArrowRight, Pencil, Trash2, CheckCircle, Clock, MoreVertical, Copy, BarChart2, Layout,
  Search, Zap, AlertCircle, Check, Loader2
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createFunnel } from '@/app/actions/marketing';
import { getTemplates } from '@/app/actions/builder';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/funnels/EmptyState';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalDescription, DashModalFooter
} from '@/components/dashboard-ui/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export default function FunnelsClient({ initialFunnels }: { initialFunnels: any[] }) {
  const router = useRouter();
  const [funnels, setFunnels] = useState(initialFunnels);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState('All');

  const fetchTemplates = async () => {
    setTemplateError(null);
    try {
      const templates = await getTemplates('funnel');
      setDbTemplates(templates);
    } catch (err: any) {
      console.error('Error fetching funnel templates:', err);
      setTemplateError(err.message || 'Failed to load templates');
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(dbTemplates.map(t => t.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [dbTemplates]);

  const filteredTemplates = useMemo(() => {
    return dbTemplates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(templateSearch.toLowerCase());
      const matchesCategory = templateCategory === 'All' || t.category === templateCategory;
      return matchesSearch && matchesCategory;
    });
  }, [dbTemplates, templateSearch, templateCategory]);

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
    const res = await createFunnel(createName.trim(), selectedTemplate || undefined);
    setCreating(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Funnel created!');
      setFunnels(prev => [res.data, ...prev]);
      setCreateName('');
      setSelectedTemplate(null);
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

      {/* Create Dialog — template-first: picker is the default, never a blank canvas */}
      <DashModal open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setSelectedTemplate(null); }}>
        <DashModalContent className="max-w-[950px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-dash-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20">
                <Zap className="h-5 w-5 text-dash-accent" />
              </div>
              <div>
                <DashModalTitle>Deploy <span className="text-dash-accent">new funnel</span></DashModalTitle>
                <DashModalDescription>Select a template or start from a blank canvas</DashModalDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex bg-dash-surface min-h-0">
            {/* Sidebar for filtering */}
            <div className="w-[240px] border-r border-dash-border p-6 space-y-8 hidden md:block overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <label className="text-[11px] font-bold !text-dash-textMuted">Templates library</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 !text-dash-textMuted" />
                  <DashInput
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="h-9 pl-9 text-[11px]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold !text-dash-textMuted">Categories</label>
                <div className="flex flex-col gap-1.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setTemplateCategory(cat)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-left text-[11px] font-semibold transition-colors motion-reduce:transition-none",
                        templateCategory === cat
                          ? "bg-dash-accent/10 text-dash-accent border border-dash-accent/20"
                          : "!text-dash-textMuted hover:!text-dash-text hover:bg-white"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white">
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="space-y-8">
                  <DashFormField label="Funnel name" htmlFor="funnel-name">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-4.5 h-4.5 rounded-full bg-dash-accent/10 text-dash-accent text-[9px] font-bold flex items-center justify-center border border-dash-accent/20">1</span>
                    </div>
                    <DashInput
                      id="funnel-name"
                      placeholder="e.g. Lead Capture Funnel"
                      value={createName}
                      onChange={e => setCreateName(e.target.value)}
                      className="h-11 text-[14px]"
                    />
                  </DashFormField>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-4.5 h-4.5 rounded-full bg-dash-accent/10 text-dash-accent text-[9px] font-bold flex items-center justify-center border border-dash-accent/20">2</span>
                        <label className="text-[11px] font-bold !text-dash-textMuted">Templates</label>
                      </div>
                      <div className="text-[10px] font-bold !text-dash-textMuted bg-dash-surface px-2.5 py-1 rounded-full border border-dash-border">
                        {filteredTemplates.length} options matching
                      </div>
                    </div>

                    {templateError ? (
                      <div className="p-12 rounded-2xl border border-dashed border-red/20 bg-red/5 flex flex-col items-center justify-center gap-5 text-center">
                        <div className="h-14 w-14 rounded-full bg-red/10 text-red flex items-center justify-center">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="font-bold !text-dash-text">Could not load templates</h4>
                          <p className="text-[11px] !text-dash-textMuted mt-1 max-w-[240px]">{templateError}</p>
                        </div>
                        <DashButton variant="secondary" onClick={fetchTemplates}>Retry</DashButton>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredTemplates.map((t) => {
                          const isBlank = t.id === 'blank-slate';
                          return (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTemplate(t.id)}
                              className={cn(
                                "group relative cursor-pointer rounded-2xl border-2 transition-all duration-200 motion-reduce:transition-none overflow-hidden flex flex-col h-full hover:shadow-lg hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
                                selectedTemplate === t.id
                                  ? "border-dash-accent bg-dash-accent/5 shadow-md"
                                  : isBlank
                                    ? "border-dash-accent/30 border-dashed bg-dash-accent/[0.03] hover:border-dash-accent/50"
                                    : "border-dash-border bg-dash-surface hover:border-dash-text/20"
                              )}
                            >
                              <div className={cn(
                                "aspect-[4/3] relative overflow-hidden shrink-0",
                                isBlank ? "flex items-center justify-center bg-transparent" : "bg-dash-surface"
                              )}>
                                {isBlank ? (
                                  <div className="w-14 h-14 rounded-2xl bg-dash-accent/10 flex items-center justify-center text-dash-accent group-hover:bg-dash-accent group-hover:text-white transition-colors motion-reduce:transition-none">
                                    <Plus size={26} strokeWidth={2.25} />
                                  </div>
                                ) : (
                                  (t.thumbnail || t.preview_image) && (
                                    <img
                                      src={t.thumbnail || t.preview_image}
                                      alt={t.name}
                                      className={cn(
                                        "absolute inset-0 w-full h-full object-cover transition-all duration-500 motion-reduce:transition-none",
                                        selectedTemplate === t.id ? "scale-105 opacity-90" : "opacity-80 group-hover:opacity-100"
                                      )}
                                    />
                                  )
                                )}

                                {selectedTemplate === t.id && (
                                  isBlank ? (
                                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-dash-accent border-[4px] border-white flex items-center justify-center">
                                      <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                    </div>
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-dash-text/10">
                                      <div className="w-10 h-10 rounded-full bg-dash-accent flex items-center justify-center">
                                        <Check className="w-5 h-5 text-white" strokeWidth={4} />
                                      </div>
                                    </div>
                                  )
                                )}

                                {!isBlank && (
                                  <div className="absolute top-3 left-3 flex gap-2">
                                    <div className="px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm border border-dash-border text-[9px] font-bold text-dash-accent">
                                      {t.category}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className={cn("p-4", isBlank ? "bg-dash-surface" : "bg-white")}>
                                <span className={cn(
                                  "font-bold text-[12px] block transition-colors motion-reduce:transition-none leading-tight",
                                  selectedTemplate === t.id ? "text-dash-accent" : "!text-dash-text group-hover:text-dash-accent"
                                )}>{t.name}</span>
                                <span className="text-[10px] font-medium !text-dash-textMuted line-clamp-2 mt-1 leading-relaxed">{t.description}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-t border-dash-border bg-white flex items-center justify-end gap-3">
            <DashButton variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleCreate} disabled={creating || !createName.trim()}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Create funnel
            </DashButton>
          </div>
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

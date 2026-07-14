'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, FileText, Share2, UserCheck, CheckCircle, Search, Users, ExternalLink, Bell
} from 'lucide-react';
import { createForm } from '@/app/actions/marketing';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmbedModal } from './EmbedModal';
import { CreateFormDialog, EditFormDialog, DeleteFormDialog } from './FormsModals';
import { FormCard } from './FormCard';
import { getUserCollaborations, acceptFormInvitation, declineFormInvitation, sendInviteNotificationAfterAcceptance } from '@/app/actions/collaborators';
import { InviteAcceptancePanel } from '@/components/collaboration/InviteAcceptancePanel';
import { CollaborationNotifications } from '@/components/collaboration/CollaborationNotifications';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashInput } from '@/components/dashboard-ui/FormField';
import { DashTabs, DashTabsList, DashTabsTrigger, DashTabsContent } from '@/components/dashboard-ui/Tabs';
import { cn } from '@/lib/utils';

function StatusBadge({ status }: { status: string }) {
  const isPending = status === 'pending';
  const isActive = status === 'active' || status === 'accepted';

  if (isPending) return <DashStatusPill variant="warning" className="text-[9px] px-1.5 py-0.5">Pending</DashStatusPill>;
  if (isActive) return <DashStatusPill variant="success" className="text-[9px] px-1.5 py-0.5">Active</DashStatusPill>;
  return <DashStatusPill variant="danger" className="text-[9px] px-1.5 py-0.5">{status}</DashStatusPill>;
}

export default function FormsClient({ initialForms }: { initialForms: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'collaborations' ? 'collaborations' : 'forms';
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const [forms, setForms] = useState(initialForms);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [collaborations, setCollaborations] = useState<{ invitedTo: any[]; invitedOthers: any[] }>({ invitedTo: [], invitedOthers: [] });
  const [loadingCollabs, setLoadingCollabs] = useState(false);

  const loadCollaborations = async () => {
    setLoadingCollabs(true);
    try {
      const res = await getUserCollaborations();
      if (res.data) {
        setCollaborations(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCollabs(false);
    }
  };

  const [acceptingCollabId, setAcceptingCollabId] = useState<string | null>(null);

  const handleAcceptInvitation = async (collabId: string) => {
    setAcceptingCollabId(collabId);
    const res = await acceptFormInvitation(collabId);
    if (res.success) {
      await sendInviteNotificationAfterAcceptance(collabId);
      loadCollaborations();
    }
    setAcceptingCollabId(null);
    return res;
  };

  const handleDeclineInvitation = async (collabId: string) => {
    const res = await declineFormInvitation(collabId);
    if (res.success) loadCollaborations();
    return res;
  };

  useEffect(() => {
    loadCollaborations();
  }, []);

  useEffect(() => {
    async function loadPartialCounts() {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { data } = await supabase
        .from('form_partial_submissions')
        .select('form_id');

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((p: any) => {
          counts[p.form_id] = (counts[p.form_id] || 0) + 1;
        });

        setForms(prev =>
          prev.map(f => ({
            ...f,
            partial_count: counts[f.id] || 0,
          }))
        );
      }
    }
    loadPartialCounts();
  }, []);

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' ||
                         (filter === 'published' && form.status === 'published') ||
                         (filter === 'draft' && form.status !== 'published');
    return matchesSearch && matchesFilter;
  });

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

  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedForm, setEmbedForm] = useState<any>(null);

  const openEmbed = (form: any) => { setEmbedForm(form); setEmbedOpen(true); };

  const handleCreate = async () => {
    if (!createName.trim()) { toast.error('Please enter a form name'); return; }
    setCreating(true);

    try {
      const res = await createForm(createName.trim());

      setCreating(false);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      if (!res.data || !res.data.id) {
        toast.error('Failed to get new form ID. Please try again.');
        return;
      }

      const targetId = res.data.id;
      toast.success('Form created! Opening builder...');
      setCreateName('');
      setCreateOpen(false);

      // Wait for Radix Dialog exit animation then navigate
      setTimeout(() => {
        document.body.style.removeProperty('pointer-events');
        document.body.style.removeProperty('overflow');
        document.body.removeAttribute('data-scroll-locked');
        document.querySelectorAll('[data-radix-portal]').forEach((el) => el.remove());
        router.push(`/forms/builder/${targetId}`);
      }, 350);

    } catch (err) {
      setCreating(false);
      console.error('[Forms] Unhandled error during creation:', err);
      toast.error('An unexpected error occurred.');
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
      toast.success(isLive ? 'Form moved to draft' : 'Form is now live!');
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold !text-dash-text">
            Smart <span className="text-dash-accent">forms</span>
          </h1>
          <p className="!text-dash-textMuted text-[12px] font-medium mt-2">Capture high-intent leads with precision data extraction.</p>
        </div>
        <DashButton onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Build form
        </DashButton>
      </div>

      <DashTabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <DashTabsList>
          <DashTabsTrigger value="forms">
            <FileText className="w-4 h-4" /> My forms
          </DashTabsTrigger>
          <DashTabsTrigger value="collaborations">
            <Users className="w-4 h-4" /> Collaborations
          </DashTabsTrigger>
        </DashTabsList>

        <DashTabsContent value="forms" className="space-y-8">
          <DashCard padding="default" className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 !text-dash-textMuted" />
              <DashInput
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search forms..."
                className="pl-11 h-12"
              />
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
              {(['all', 'published', 'draft'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={cn(
                    "px-5 py-2 rounded-xl text-[11px] font-bold transition-colors motion-reduce:transition-none shrink-0",
                    filter === p
                      ? 'bg-dash-accent text-white'
                      : 'bg-dash-surface !text-dash-textMuted hover:!text-dash-text'
                  )}
                >
                  {p === 'all' ? 'All forms' : p === 'published' ? 'Published' : 'Drafts'}
                </button>
              ))}
            </div>
          </DashCard>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredForms.length === 0 ? (
              <div className="col-span-full">
                <DashEmptyState
                  icon={FileText}
                  title="No forms found"
                  description={searchQuery ? 'Adjust your search query' : 'Click to build your first form'}
                  actionLabel={searchQuery ? undefined : 'Build form'}
                  onAction={searchQuery ? undefined : () => setCreateOpen(true)}
                />
              </div>
            ) : filteredForms.map(form => (
              <FormCard
                key={form.id} form={form} onEdit={openEdit} onEmbed={openEmbed} onRename={openEdit}
                onPublishToggle={handlePublish} onCopyLink={copyLink} onDelete={openDelete}
                onOpenBuilder={(f) => router.push(`/forms/builder/${f.id}`)}
                onViewPartials={(f) => router.push(`/forms/${f.id}/partial-submissions`)}
                onViewSubmissions={(f) => router.push(`/forms/${f.id}/submissions`)}
                onViewAutomations={(f) => router.push(`/forms/${f.id}/automations`)}
                onViewGovernance={(f) => router.push(`/forms/${f.id}/governance`)}
                onViewAnalytics={(f) => router.push(`/forms/${f.id}/analytics`)}
              />
            ))}
          </div>
        </DashTabsContent>

        <DashTabsContent value="collaborations" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            <DashCard padding="default" className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 !text-dash-text">
                  <UserCheck className="text-green" size={20} /> Forms shared with you
                </h2>
                <p className="text-xs !text-dash-textMuted mt-1">Forms you've been invited to edit or view.</p>
              </div>

              <div className="flex flex-col gap-3 max-h-[540px] overflow-y-auto pr-1">
                {loadingCollabs ? (
                  <div className="py-8 text-center text-[11px] font-bold !text-dash-textMuted animate-pulse motion-reduce:animate-none">Loading invitations...</div>
                ) : collaborations.invitedTo.length === 0 ? (
                  <div className="py-14 text-center border border-dashed border-dash-border rounded-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-dash-surface border border-dash-border mx-auto mb-3 flex items-center justify-center">
                      <UserCheck size={20} className="!text-dash-textMuted opacity-60" />
                    </div>
                    <p className="text-[11px] font-bold !text-dash-textMuted">No shared forms</p>
                  </div>
                ) : (
                  collaborations.invitedTo.map((item) => {
                    if (acceptingCollabId === item.id) {
                      return (
                        <InviteAcceptancePanel
                          key={item.id}
                          invitation={item}
                          onAccept={handleAcceptInvitation}
                          onDecline={handleDeclineInvitation}
                          onComplete={() => { setAcceptingCollabId(null); loadCollaborations(); }}
                        />
                      );
                    }
                    return (
                      <div key={item.id} className="bg-dash-surface border border-dash-border hover:border-dash-text/20 p-4 rounded-2xl flex items-center justify-between transition-colors motion-reduce:transition-none">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-bold !text-dash-text truncate">{item.formName}</span>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="text-[10px] !text-dash-textMuted font-medium">by <strong className="!text-dash-text">{item.invitedByEmail}</strong></span>
                            <DashStatusPill variant="accent" className="text-[9px] px-1.5 py-0.5">{item.role}</DashStatusPill>
                            <StatusBadge status={item.status} />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.status === 'pending' ? (
                            <DashButton size="sm" onClick={() => setAcceptingCollabId(item.id)} className="shrink-0">
                              Accept <CheckCircle size={10} />
                            </DashButton>
                          ) : (
                            <DashButton
                              size="sm"
                              onClick={() => router.push(item.role === 'editor' ? `/forms/builder/${item.formId}` : `/forms/${item.formId}/submissions`)}
                              className="shrink-0"
                            >
                              Open <ExternalLink size={10} />
                            </DashButton>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </DashCard>

            <div className="flex flex-col gap-6">
              <DashCard padding="default" className="flex flex-col gap-6">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 !text-dash-text">
                    <Share2 className="text-dash-accent" size={20} /> People you invited
                  </h2>
                  <p className="text-xs !text-dash-textMuted mt-1">Collaborators you've added to your forms.</p>
                </div>

                <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
                  {loadingCollabs ? (
                    <div className="py-6 text-center text-[11px] font-bold !text-dash-textMuted animate-pulse motion-reduce:animate-none">Loading...</div>
                  ) : collaborations.invitedOthers.length === 0 ? (
                    <div className="py-10 text-center border border-dashed border-dash-border rounded-2xl">
                      <div className="w-10 h-10 rounded-2xl bg-dash-surface border border-dash-border mx-auto mb-3 flex items-center justify-center">
                        <Share2 size={18} className="!text-dash-textMuted opacity-60" />
                      </div>
                      <p className="text-[10px] font-bold !text-dash-textMuted">No invitations sent</p>
                    </div>
                  ) : (
                    collaborations.invitedOthers.map((item) => (
                      <div key={item.id} className="bg-dash-surface border border-dash-border hover:border-dash-text/20 p-3.5 rounded-2xl flex items-center justify-between transition-colors motion-reduce:transition-none">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-[10px] font-bold text-purple-600 shrink-0">
                            {item.email?.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold !text-dash-text truncate block">{item.email}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] !text-dash-textMuted truncate max-w-[120px]">on <strong className="!text-dash-text">{item.formName}</strong></span>
                              <DashStatusPill variant="accent" className="text-[9px] px-1.5 py-0.5">{item.role}</DashStatusPill>
                              <StatusBadge status={item.status} />
                            </div>
                          </div>
                        </div>
                        <DashButton
                          size="sm"
                          variant="secondary"
                          onClick={() => router.push(`/forms/${item.formId}/governance`)}
                          className="shrink-0 ml-2"
                        >
                          Manage <ExternalLink size={9} />
                        </DashButton>
                      </div>
                    ))
                  )}
                </div>
              </DashCard>

              <DashCard padding="default" className="flex flex-col gap-4">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2 !text-dash-text">
                    <Bell className="text-amber-600" size={16} /> Activity updates
                  </h2>
                  <p className="text-[11px] !text-dash-textMuted mt-0.5">Real-time collaboration activity</p>
                </div>
                <div className="max-h-[240px] overflow-y-auto pr-1">
                  <CollaborationNotifications />
                </div>
              </DashCard>
            </div>

          </div>
        </DashTabsContent>
      </DashTabs>

      <CreateFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={createName}
        setName={setCreateName}
        creating={creating}
        onSubmit={handleCreate}
      />

      <EditFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        name={editName}
        setName={setEditName}
        form={editForm}
        saving={saving}
        onSubmit={handleSaveEdit}
        onPublishToggle={() => { if (editForm) handlePublish(editForm); }}
      />

      <DeleteFormDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        form={deleteForm}
        deleting={deleting}
        onSubmit={handleDelete}
      />
      {/* Embed Modal */}
      {embedForm && (
        <EmbedModal
          form={embedForm}
          open={embedOpen}
          onClose={() => { setEmbedOpen(false); setEmbedForm(null); }}
        />
      )}
    </div>
  );
}

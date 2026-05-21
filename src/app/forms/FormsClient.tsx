'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus, FileText, Share2, UserCheck, Pencil, Trash2, Globe, X,
  CheckCircle, Clock, MoreVertical, Copy, Loader2, Search, Code2, Users, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createForm } from '@/app/actions/marketing';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UniversalAPI from './UniversalAPI';
import { EmbedModal } from './EmbedModal';
import { CreateFormDialog, EditFormDialog, DeleteFormDialog } from './FormsModals';
import { FormCard } from './FormCard';
import { getUserCollaborations, acceptFormInvitation } from '@/app/actions/collaborators';

export default function FormsClient({ initialForms }: { initialForms: any[] }) {
  const router = useRouter();
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

  const handleAcceptInvitation = async (collabId: string) => {
    try {
      const res = await acceptFormInvitation(collabId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Invitation accepted!');
      loadCollaborations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept invitation');
    }
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

      <Tabs defaultValue="forms" className="space-y-8">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl h-14">
          <TabsTrigger value="forms" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest">
            <FileText className="w-4 h-4 mr-2" /> My Forms
          </TabsTrigger>
          <TabsTrigger value="api" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest">
            <Globe className="w-4 h-4 mr-2" /> Universal API & Webhooks
          </TabsTrigger>
          <TabsTrigger value="collaborations" className="rounded-xl px-8 data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest">
            <Users className="w-4 h-4 mr-2" /> Collaborations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-8 focus-visible:outline-none">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/5 border border-white/10 p-4 rounded-3xl">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-white/30" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search forms..."
                className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl text-white placeholder-white/30 focus:border-primary focus:ring-0"
              />
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
              {(['all', 'published', 'draft'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    filter === p
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {p === 'all' ? 'All Forms' : p === 'published' ? 'Published' : 'Drafts'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredForms.length === 0 ? (
              <div className="col-span-full py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 transition-all" onClick={() => setCreateOpen(true)}>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-black uppercase text-white tracking-widest">No Forms Found</h3>
                <p className="text-white/40 text-[10px] font-bold mt-2 uppercase tracking-widest">
                  {searchQuery ? 'Adjust your search query' : 'Click to build your first form'}
                </p>
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
        </TabsContent>

        <TabsContent value="api" className="focus-visible:outline-none">
          <UniversalAPI />
        </TabsContent>

        <TabsContent value="collaborations" className="space-y-8 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Forms Shared with You */}
            <div className="bg-[#0b132c] border border-white/10 p-6 rounded-3xl flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-space-grotesk font-black uppercase tracking-tight flex items-center gap-2 text-white">
                  <UserCheck className="text-emerald-400" size={20} /> Forms Shared With You
                </h2>
                <p className="text-xs text-[#4a5a82] mt-1">Forms you have been invited to edit or view.</p>
              </div>

              <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                {loadingCollabs ? (
                  <div className="py-8 text-center text-xs font-black uppercase tracking-widest text-[#4a5a82] animate-pulse">Loading invitations...</div>
                ) : collaborations.invitedTo.length === 0 ? (
                  <div className="py-12 text-center text-xs font-black uppercase tracking-widest text-white/30 border border-dashed border-white/5 rounded-2xl">
                    No shared forms found
                  </div>
                ) : (
                  collaborations.invitedTo.map((item) => (
                    <div key={item.id} className="bg-[#04081a] border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-center justify-between transition-colors">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-sm font-bold text-white truncate">{item.formName}</span>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-[9px] text-[#4a5a82] font-black uppercase tracking-widest">By: {item.invitedByEmail}</span>
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {item.role}
                          </span>
                          {item.status === 'pending' && (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {item.status === 'pending' ? (
                        <button
                          onClick={() => handleAcceptInvitation(item.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0"
                        >
                          Accept <CheckCircle size={10} />
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/forms/${item.formId}/governance`)}
                          className="bg-primary hover:bg-primary/80 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0"
                        >
                          Open <ExternalLink size={10} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Forms You Shared with Others */}
            <div className="bg-[#0b132c] border border-white/10 p-6 rounded-3xl flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-space-grotesk font-black uppercase tracking-tight flex items-center gap-2 text-white">
                  <Share2 className="text-blue-400" size={20} /> People You Invited
                </h2>
                <p className="text-xs text-[#4a5a82] mt-1">Collaborators you have added to your forms.</p>
              </div>

              <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                {loadingCollabs ? (
                  <div className="py-8 text-center text-xs font-black uppercase tracking-widest text-[#4a5a82] animate-pulse">Loading invitations...</div>
                ) : collaborations.invitedOthers.length === 0 ? (
                  <div className="py-12 text-center text-xs font-black uppercase tracking-widest text-white/30 border border-dashed border-white/5 rounded-2xl">
                    No active invitations
                  </div>
                ) : (
                  collaborations.invitedOthers.map((item) => (
                    <div key={item.id} className="bg-[#04081a] border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-center justify-between transition-colors">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-sm font-bold text-white truncate">{item.email}</span>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-[9px] text-[#4a5a82] font-black uppercase tracking-widest">Form: {item.formName}</span>
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {item.role}
                          </span>
                          {item.status === 'pending' && (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/forms/${item.formId}/governance`)}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0"
                      >
                        Manage <ExternalLink size={10} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </TabsContent>
      </Tabs>

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

'use client';

import React, { useState } from 'react';
import {
  Plus, Mail, Calendar, Pencil, Trash2, Send, MoreVertical
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { createEmailCampaign } from '@/app/actions/marketing';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter
} from '@/components/dashboard-ui/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export default function CampaignsClient({ initialCampaigns }: { initialCampaigns: any[] }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCampaign, setDeleteCampaign] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const prefillSubject = searchParams.get('prefill_subject');
      const prefillBody = searchParams.get('prefill_body');
      const prefillName = searchParams.get('prefill_name');

      if (prefillSubject || prefillBody || prefillName) {
        setCreateName(prefillName || 'New Campaign from Content Studio');
        setCreateSubject(prefillSubject || '');
        setCreateOpen(true);
      }
    }
  }, []);

  const handleCreate = async () => {
    if (!createName.trim()) { toast.error('Please enter a campaign name'); return; }
    setCreating(true);
    const res = await createEmailCampaign(createName.trim());
    setCreating(false);
    if (res.error) { toast.error(res.error); }
    else {
      toast.success('Campaign created!');

      let newCampaign = res.data;
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const prefillBody = searchParams.get('prefill_body');
        const prefillSubject = searchParams.get('prefill_subject');

        if (prefillBody || prefillSubject || createSubject) {
          try {
            const { updateCampaign } = await import('@/app/actions/marketing');
            const updateRes = await updateCampaign(newCampaign.id, {
              subject: prefillSubject || createSubject || newCampaign.subject,
              body_plain: prefillBody || '',
              body_html: prefillBody || ''
            });
            if (!updateRes.error && updateRes.data) {
              newCampaign = updateRes.data;
            }
          } catch (e) {
            console.error('Failed to prefill campaign details', e);
          }
        }
      }

      setCampaigns(prev => [newCampaign, ...prev]);
      setCreateName(''); setCreateSubject('');
      setCreateOpen(false);
      router.replace('/campaigns');
    }
  };

  const openEdit = (campaign: any) => {
    setEditCampaign(campaign);
    setEditName(campaign.name);
    setEditSubject(campaign.subject || '');
    setEditBody(campaign.preview_text || '');

    // Extract tags from segment JSONB if available
    let tags = '';
    try {
      if (campaign.segment && typeof campaign.segment === 'object') {
        if (Array.isArray(campaign.segment.tags)) {
          tags = campaign.segment.tags.join(', ');
        }
      }
    } catch (e) {}
    setEditTags(tags);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editCampaign) return;
    setSaving(true);
    try {
      const { updateCampaign } = await import('@/app/actions/marketing');
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      const segmentData = tagsArray.length > 0 ? { tags: tagsArray } : null;

      const res = await updateCampaign(editCampaign.id, {
        name: editName,
        subject: editSubject,
        preview_text: editBody,
        body_html: editBody,
        segment: segmentData
      });
      if (res.error) { toast.error(res.error); }
      else {
        toast.success('Campaign updated!');
        setCampaigns(prev => prev.map(c => c.id === editCampaign.id ? { ...c, name: editName, subject: editSubject } : c));
        setEditOpen(false);
      }
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const openDelete = (campaign: any) => { setDeleteCampaign(campaign); setDeleteOpen(true); };

  const handleDelete = async () => {
    if (!deleteCampaign) return;
    setDeleting(true);
    try {
      const { deleteCampaignAction } = await import('@/app/actions/marketing');
      const res = await deleteCampaignAction(deleteCampaign.id);
      if (res.error) { toast.error(res.error); }
      else {
        toast.success('Campaign deleted');
        setCampaigns(prev => prev.filter(c => c.id !== deleteCampaign.id));
        setDeleteOpen(false);
      }
    } catch { toast.error('Delete failed'); }
    setDeleting(false);
  };

  const statusVariant = (status: string): 'success' | 'info' | 'warning' => {
    if (status === 'sent') return 'success';
    if (status === 'scheduled') return 'info';
    return 'warning';
  };

  // "—" means genuinely nothing sent yet, not "we don't track this" — real
  // opens/clicks/bounces are tracked live via the email deliverability
  // webhook (increment_campaign_metric RPC), so a 0% here after a real send
  // is a real zero, not a placeholder.
  const formatRate = (count: number | null | undefined, totalSent: number | null | undefined): string => {
    if (!totalSent || totalSent <= 0) return '—';
    return `${Math.round(((count || 0) / totalSent) * 100)}%`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold !text-dash-text">
            Email <span className="text-dash-accent">campaigns</span>
          </h1>
          <p className="text-[12px] !text-dash-textMuted mt-2 font-medium">
            Broadcast your message with precision delivery.
          </p>
        </div>
        <DashButton onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New campaign
        </DashButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {campaigns.length === 0 ? (
          <div className="col-span-full">
            <DashEmptyState
              icon={Send}
              title="No campaigns yet"
              description="Click to create your first campaign"
              actionLabel="New campaign"
              onAction={() => setCreateOpen(true)}
            />
          </div>
        ) : campaigns.map(campaign => (
          <DashCard key={campaign.id} padding="default" className="group">
            <div className="flex justify-between items-start mb-6">
              <div className="h-11 w-11 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent border border-dash-accent/20">
                <Mail size={18} />
              </div>
              <div className="flex items-center gap-2">
                <DashStatusPill variant={statusVariant(campaign.status)}>{campaign.status}</DashStatusPill>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-lg bg-dash-surface hover:bg-dash-border/60 flex items-center justify-center transition-colors motion-reduce:transition-none">
                      <MoreVertical size={14} className="!text-dash-textMuted" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl min-w-[170px]">
                    <DropdownMenuItem onClick={() => router.push(`/campaigns/${campaign.id}/builder`)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg mx-1 px-3 py-2 text-xs">
                      <Pencil size={14} /> Design layout
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(campaign)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg mx-1 px-3 py-2 text-xs">
                      <Pencil size={14} /> Edit settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDelete(campaign)} className="flex items-center gap-2 cursor-pointer text-red hover:bg-red/10 rounded-lg mx-1 px-3 py-2 text-xs">
                      <Trash2 size={14} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-bold !text-dash-text mb-1">{campaign.name}</h4>
              <p className="!text-dash-textMuted text-[11px] font-semibold">Subject: <span className="!text-dash-text">{campaign.subject || '—'}</span></p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                ['Opens', formatRate(campaign.opens, campaign.total_sent)],
                ['Clicks', formatRate(campaign.clicks, campaign.total_sent)],
                ['Bounced', formatRate(campaign.bounces, campaign.total_sent)],
              ].map(([label, val]) => (
                <div key={label} className="p-3 bg-dash-surface rounded-xl border border-dash-border text-center">
                  <span className="block text-[10px] font-bold !text-dash-textMuted mb-1">{label}</span>
                  <span className="text-base font-bold !text-dash-text">{val}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-dash-border">
              <div className="flex items-center gap-2 text-[11px] font-semibold !text-dash-textMuted">
                <Calendar className="w-3.5 h-3.5" />
                {campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString() : 'Not sent'}
              </div>
              <div className="flex gap-2">
                <DashButton onClick={() => openEdit(campaign)} variant="secondary" size="sm">
                  Settings
                </DashButton>
                <DashButton onClick={() => router.push(`/campaigns/${campaign.id}/builder`)} size="sm">
                  Design
                </DashButton>
              </div>
            </div>
          </DashCard>
        ))}
      </div>

      {/* Create Dialog */}
      <DashModal open={createOpen} onOpenChange={setCreateOpen}>
        <DashModalContent className="max-w-sm">
          <DashModalHeader>
            <DashModalTitle>New <span className="text-dash-accent">campaign</span></DashModalTitle>
          </DashModalHeader>
          <div className="space-y-3">
            <DashFormField label="Campaign name">
              <DashInput value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Welcome Sequence" />
            </DashFormField>
            <DashFormField label="Email subject">
              <DashInput value={createSubject} onChange={e => setCreateSubject(e.target.value)} placeholder="e.g. Welcome to LeadsMind!" />
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
            <DashModalTitle>Edit <span className="text-dash-accent">campaign</span></DashModalTitle>
          </DashModalHeader>
          <div className="space-y-3">
            <DashFormField label="Name">
              <DashInput value={editName} onChange={e => setEditName(e.target.value)} />
            </DashFormField>
            <DashFormField label="Subject">
              <DashInput value={editSubject} onChange={e => setEditSubject(e.target.value)} />
            </DashFormField>
            <DashFormField label="Target audience tags (comma separated)" hint="Leave blank to send to all contacts.">
              <DashInput value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="e.g. VIP, Newsletter, Leads" />
            </DashFormField>
            <DashFormField label="Email body / plain text preview">
              <DashTextarea value={editBody} onChange={e => setEditBody(e.target.value)} placeholder="Write your email content..." className="min-h-[100px]" />
            </DashFormField>
          </div>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setEditOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete campaign?"
        description={`This will permanently delete "${deleteCampaign?.name}". This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}

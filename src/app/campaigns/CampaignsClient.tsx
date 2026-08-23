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
import { TagMultiSelect, TagOption } from '@/components/crm/TagMultiSelect';
import { SegmentRuleBuilder } from '@/components/crm/SegmentRuleBuilder';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import type { RuleGroup } from '@/lib/intelligence/SegmentationCompiler';
import { ChevronDown, ChevronUp } from 'lucide-react';

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

interface SegmentOption { id: string; name: string; }

export default function CampaignsClient({
  initialCampaigns,
  availableTags,
  availableSegments = [],
}: {
  initialCampaigns: any[];
  availableTags: TagOption[];
  availableSegments?: SegmentOption[];
}) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [tags, setTags] = useState<TagOption[]>(availableTags);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  // Real workspace tag NAMES currently selected in the picker — translated to
  // real tag ids only at save time (see handleSaveEdit), since TagMultiSelect's
  // established contract (shared with the Contact form) works in names.
  const [editTagNames, setEditTagNames] = useState<string[]>([]);
  const [editRuleGroup, setEditRuleGroup] = useState<RuleGroup | null>(null);
  const [editCombineMode, setEditCombineMode] = useState<'AND' | 'OR'>('AND');
  const [editSegmentId, setEditSegmentId] = useState<string | null>(null);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
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

    // segment.tags may already be real tag ids (saved via this picker) or, for
    // campaigns saved before this change, plain tag NAMES — either way the
    // picker itself always works in names, so ids get resolved back to their
    // current name here. A stale id whose tag was since deleted is dropped
    // rather than shown as a broken chip.
    let names: string[] = [];
    try {
      if (campaign.segment && typeof campaign.segment === 'object' && Array.isArray(campaign.segment.tags)) {
        const stored: string[] = campaign.segment.tags;
        names = stored
          .map((entry) => (isUuid(entry) ? tags.find((t) => t.id === entry)?.name : entry))
          .filter((n): n is string => !!n);
      }
    } catch (e) {}
    setEditTagNames(names);

    const ruleGroup: RuleGroup | null = (campaign.segment && typeof campaign.segment === 'object' && campaign.segment.ruleGroup)
      ? campaign.segment.ruleGroup
      : null;
    setEditRuleGroup(ruleGroup);
    setEditCombineMode((campaign.segment?.combineMode as 'AND' | 'OR') || 'AND');
    setEditSegmentId((campaign.segment && typeof campaign.segment === 'object' && campaign.segment.segmentId) || null);
    setAdvancedFiltersOpen(!!ruleGroup && ruleGroup.rules.length > 0);

    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editCampaign) return;
    setSaving(true);
    try {
      const { updateCampaign } = await import('@/app/actions/marketing');

      // Re-fetch tags so a tag just created inline in this session (the picker
      // can create a brand-new tag on the fly) resolves to a real id even
      // though it wasn't in the list this page loaded with.
      let currentTags = tags;
      try {
        const { listTags } = await import('@/app/actions/tags');
        const freshRes = await listTags();
        if (freshRes.success) {
          currentTags = freshRes.data;
          setTags(freshRes.data);
        }
      } catch (e) { /* fall back to the tags already in state */ }

      const tagIds = editTagNames
        .map((name) => currentTags.find((t) => t.name.toLowerCase() === name.toLowerCase())?.id)
        .filter((id): id is string => !!id);
      const hasRuleGroup = !!editRuleGroup && editRuleGroup.rules.length > 0;
      // A saved segment and the ad-hoc rule builder are mutually exclusive —
      // picking one clears the other (see the Select's onValueChange below).
      const hasSegmentId = !!editSegmentId && !hasRuleGroup;
      const segmentData = (tagIds.length > 0 || hasRuleGroup || hasSegmentId)
        ? {
            tags: tagIds.length > 0 ? tagIds : undefined,
            ruleGroup: hasRuleGroup ? editRuleGroup : undefined,
            segmentId: hasSegmentId ? editSegmentId : undefined,
            // Only meaningful when both tags and ruleGroup/segmentId are set —
            // harmless to include otherwise, since the resolver ignores it
            // when only one of the two is present.
            combineMode: (tagIds.length > 0 && (hasRuleGroup || hasSegmentId)) ? editCombineMode : undefined,
          }
        : null;

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
                {campaign.status === 'scheduled' && campaign.scheduled_for
                  ? `Scheduled for ${new Date(campaign.scheduled_for).toLocaleString()}`
                  : campaign.sent_at ? `Sent ${new Date(campaign.sent_at).toLocaleDateString()}` : 'Not sent'}
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
            <DashFormField label="Target audience tags" hint="Leave blank to send to all contacts.">
              <TagMultiSelect availableTags={tags} value={editTagNames} onChange={setEditTagNames} />
            </DashFormField>

            <DashFormField label="Saved segment" hint="Select a saved segment instead of building rules below.">
              <Select
                value={editSegmentId || 'none'}
                onValueChange={(v) => {
                  const next = v === 'none' ? null : v;
                  setEditSegmentId(next);
                  if (next) setEditRuleGroup(null);
                }}
              >
                <SelectTrigger className="h-10 border-dash-border rounded-xl text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                  <SelectItem value="none" className="text-[12px]">None (build ad-hoc rules below)</SelectItem>
                  {availableSegments.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-[12px]">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DashFormField>

            <div className={`border border-dash-border rounded-xl overflow-hidden ${editSegmentId ? 'opacity-50 pointer-events-none' : ''}`}>
              <button
                type="button"
                onClick={() => setAdvancedFiltersOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3.5 py-3 text-[12px] font-bold !text-dash-text hover:bg-dash-surface transition-colors motion-reduce:transition-none"
              >
                Advanced filters
                {advancedFiltersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {advancedFiltersOpen && (
                <div className="p-3.5 border-t border-dash-border space-y-3">
                  <SegmentRuleBuilder value={editRuleGroup} onChange={setEditRuleGroup} />

                  {editTagNames.length > 0 && !!editRuleGroup && editRuleGroup.rules.length > 0 && (
                    <div className="pt-2 border-t border-dash-border">
                      <span className="text-[11px] font-bold !text-dash-textMuted block mb-2">
                        Match contacts who have these tags
                      </span>
                      <div className="inline-flex rounded-lg border border-dash-border overflow-hidden mb-2">
                        {(['AND', 'OR'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setEditCombineMode(m)}
                            className={`px-3 py-1 text-[11px] font-bold transition-colors motion-reduce:transition-none ${
                              editCombineMode === m ? 'bg-dash-accent text-white' : 'bg-white !text-dash-textMuted hover:bg-dash-surface'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <span className="text-[11px] font-bold !text-dash-textMuted block">
                        these advanced filters
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

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

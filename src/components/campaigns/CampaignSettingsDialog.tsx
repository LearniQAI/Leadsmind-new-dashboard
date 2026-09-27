'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter } from '@/components/dashboard-ui/Modal';
import { TagAudiencePicker } from '@/components/campaigns/TagAudiencePicker';
import type { TagOption } from '@/components/crm/TagMultiSelect';
import type { RuleGroup } from '@/lib/intelligence/SegmentationCompiler';
import { buildCampaignEditPayload, type EditInitial } from '@/lib/campaigns/editPayload';

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export interface SegmentOption { id: string; name: string; }

interface CampaignSettingsDialogProps {
  campaign: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTags: TagOption[];
  availableSegments: SegmentOption[];
  /** The saved campaign row, after a successful save. */
  onSaved: (campaign: any) => void;
  /** The workspace tag list changed (a tag was created inline or the list was refreshed). */
  onTagsChange?: (tags: TagOption[]) => void;
}

/**
 * The campaign Settings dialog — the ONE place a campaign's audience is configured. Simplified to
 * name, subject and target audience tags (2026-09-27): a saved segment and ad-hoc filters are no
 * longer editable here — live data showed every real campaign's audience was tags-only anyway.
 * If a campaign already has a segmentId/ruleGroup (from before this change), it is carried through
 * unedited on save rather than silently dropped; ruleGroup/segmentId/combineMode below exist ONLY
 * for that preservation, not for the user to set. Used by the campaigns list and by the builder's
 * "Edit audience".
 */
export function CampaignSettingsDialog({ campaign, open, onOpenChange, availableTags, onSaved, onTagsChange }: CampaignSettingsDialogProps) {
  const [tags, setTags] = useState<TagOption[]>(availableTags);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  // Not edited here (Email body / plain text preview was removed from this dialog; the builder's
  // canvas is where a campaign's content is designed) — kept only so a save never touches it.
  const [body, setBody] = useState('');
  // Selected tag IDS — a campaign targets tags by id, so renaming a tag never breaks it.
  const [tagIds, setTagIds] = useState<string[]>([]);
  // Not edited here — carried through unchanged from the campaign so an existing saved-segment or
  // ad-hoc-filter audience survives a tags/name/subject edit instead of being wiped.
  const [ruleGroup, setRuleGroup] = useState<RuleGroup | null>(null);
  const [combineMode, setCombineMode] = useState<'AND' | 'OR'>('AND');
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Snapshot of what the dialog opened with, so Save only writes fields the user actually changed.
  const [initial, setInitial] = useState<EditInitial | null>(null);

  useEffect(() => { setTags(availableTags); }, [availableTags]);

  const updateTags = (next: TagOption[]) => { setTags(next); onTagsChange?.(next); };

  useEffect(() => {
    if (!open || !campaign) return;
    const segment = campaign.segment && typeof campaign.segment === 'object' ? campaign.segment : {};
    setName(campaign.name || '');
    setSubject(campaign.subject || '');
    setBody(campaign.preview_text || '');

    // segment.tags are tag ids, or plain tag NAMES for campaigns saved before ids were used —
    // names are resolved to their current tag id here. A tag that no longer exists is dropped
    // rather than shown as a broken chip.
    const stored: string[] = Array.isArray(segment.tags) ? segment.tags : [];
    const ids = stored
      .map((entry) => (isUuid(entry) ? tags.find((t) => t.id === entry)?.id : tags.find((t) => t.name.toLowerCase() === String(entry).toLowerCase())?.id))
      .filter((n): n is string => !!n);
    setTagIds(ids);

    const rg: RuleGroup | null = segment.ruleGroup ?? null;
    setRuleGroup(rg);
    setCombineMode((segment.combineMode as 'AND' | 'OR') || 'AND');
    setSegmentId(segment.segmentId || null);
    setInitial({
      body: campaign.preview_text || '',
      tagIds: ids,
      ruleKey: JSON.stringify(rg),
      segmentId: segment.segmentId || null,
      combine: (segment.combineMode as string) || 'AND',
    });
    // Initialise once per opening, not on every tag-list change while the dialog is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id]);

  const handleSave = async () => {
    if (!campaign) return;
    setSaving(true);
    try {
      const { updateCampaign } = await import('@/app/actions/marketing');

      // Re-fetch tags so a tag just created inline resolves to a real, existing id.
      let currentTags = tags;
      try {
        const { listTags } = await import('@/app/actions/tags');
        const fresh = await listTags();
        if (fresh.success) { currentTags = fresh.data as TagOption[]; updateTags(currentTags); }
      } catch { /* fall back to the tags already in state */ }

      const payload = buildCampaignEditPayload(
        campaign,
        initial,
        { name, subject, body, tagIds, ruleGroup, segmentId, combine: combineMode },
        (id) => currentTags.some((t) => t.id === id),
      );

      const res = await updateCampaign(campaign.id, payload);
      if (res.error) { toast.error(res.error); }
      else {
        toast.success('Campaign updated!');
        onSaved({ ...campaign, ...(res.data ?? { name, subject }) });
        onOpenChange(false);
      }
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  return (
    <DashModal open={open} onOpenChange={onOpenChange}>
      <DashModalContent className="max-w-md">
        <DashModalHeader>
          <DashModalTitle>Edit <span className="text-dash-accent">campaign</span></DashModalTitle>
        </DashModalHeader>
        <div className="space-y-3">
          <DashFormField label="Name">
            <DashInput value={name} onChange={e => setName(e.target.value)} />
          </DashFormField>
          <DashFormField label="Subject">
            <DashInput value={subject} onChange={e => setSubject(e.target.value)} />
          </DashFormField>
          <DashFormField label="Target audience tags" hint="Sends to contacts that have ALL of the selected tags. A campaign needs an audience: pick at least one tag before sending.">
            <TagAudiencePicker
              availableTags={tags}
              value={tagIds}
              onChange={setTagIds}
              onTagCreated={(t) => updateTags([...tags, t])}
            />
          </DashFormField>
        </div>
        <DashModalFooter>
          <DashButton variant="secondary" onClick={() => onOpenChange(false)}>Cancel</DashButton>
          <DashButton onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
}

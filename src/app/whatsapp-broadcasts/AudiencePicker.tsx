'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { previewWhatsAppBroadcastAudience, listAudienceSegmentOptions } from '@/app/actions/whatsapp_broadcast';
import type { AudienceType, BroadcastAudienceInput, ContactFieldFilter } from '@/lib/whatsapp/audience/types';

export interface AudienceFormState {
  type: AudienceType;
  tags: string; // comma separated
  tagMode: 'all' | 'any';
  source: string;
  timezone: string;
  hasPhone: boolean;
  createdAfter: string; // yyyy-mm-dd
  createdBefore: string;
  segmentId: string;
}

export const EMPTY_AUDIENCE: AudienceFormState = {
  type: 'all_contacts', tags: '', tagMode: 'all', source: '', timezone: '', hasPhone: false,
  createdAfter: '', createdBefore: '', segmentId: '',
};

/** Turns the form into the server's audience input, or a user-facing reason it is not complete. */
export function buildAudienceInput(s: AudienceFormState): { ok: true; audience: BroadcastAudienceInput } | { ok: false; error: string } {
  switch (s.type) {
    case 'all_contacts':
      return { ok: true, audience: { type: 'all_contacts' } };
    case 'tags': {
      const tags = s.tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length === 0) return { ok: false, error: 'Enter at least one tag name' };
      return { ok: true, audience: { type: 'tags', tags, mode: s.tagMode } };
    }
    case 'contact_fields': {
      const filters: ContactFieldFilter[] = [];
      if (s.hasPhone) filters.push({ field: 'has_phone', value: true });
      if (s.source.trim()) filters.push({ field: 'source', value: s.source.trim() });
      if (s.timezone.trim()) filters.push({ field: 'timezone', value: s.timezone.trim() });
      if (s.createdAfter) filters.push({ field: 'created_after', value: new Date(`${s.createdAfter}T00:00:00`).toISOString() });
      if (s.createdBefore) filters.push({ field: 'created_before', value: new Date(`${s.createdBefore}T23:59:59`).toISOString() });
      if (filters.length === 0) return { ok: false, error: 'Add at least one contact filter' };
      return { ok: true, audience: { type: 'contact_fields', filters } };
    }
    case 'saved_segment':
      if (!s.segmentId) return { ok: false, error: 'Choose a saved segment' };
      return { ok: true, audience: { type: 'saved_segment', segmentId: s.segmentId } };
  }
}

export interface Preview {
  counts: { matched: number; eligible: number };
  window: { open: number; closed: number };
  exclusions: { no_phone: number; invalid_number: number; opted_out: number; suppressed: number; duplicate_phone: number };
  sample: { name: string; phone: string }[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The create-form rule: no approved template + anyone outside the 24h window (or an unchecked audience) blocks Create. */
export function evaluateWindowGate(hasTemplate: boolean, window: { open: number; closed: number } | null): { closed: number; needsPreview: boolean; blocked: boolean } {
  if (hasTemplate) return { closed: 0, needsPreview: false, blocked: false };
  if (!window) return { closed: 0, needsPreview: true, blocked: true };
  return { closed: window.closed, needsPreview: false, blocked: window.closed > 0 };
}

export function describeExclusions(ex: Preview['exclusions']): string[] {
  const lines: string[] = [];
  if (ex.opted_out) lines.push(`${plural(ex.opted_out, 'contact', 'contacts')} opted out`);
  if (ex.suppressed) lines.push(`${plural(ex.suppressed, 'number', 'numbers')} on the opt-out list`);
  if (ex.no_phone) lines.push(`${plural(ex.no_phone, 'contact', 'contacts')} with no phone number`);
  if (ex.invalid_number) lines.push(`${plural(ex.invalid_number, 'contact', 'contacts')} whose phone number is not in a valid international format`);
  if (ex.duplicate_phone) lines.push(`${plural(ex.duplicate_phone, 'contact', 'contacts')} sharing a number already in the audience`);
  return lines;
}

export default function AudiencePicker({ value, onChange, onPreview }: {
  value: AudienceFormState;
  onChange: (next: AudienceFormState) => void;
  /** Reports the latest preview (or null when the audience changed), so the form can react to the 24h-window counts. */
  onPreview?: (preview: Preview | null) => void;
}) {
  // Saved segments are loaded lazily when the form opens (this component only mounts inside the open form), and only
  // an id + name list. The "Saved segment" option appears only if the workspace has any.
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    let live = true;
    listAudienceSegmentOptions().then((res) => { if (live && res.success) setSegments(res.data); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const set = (patch: Partial<AudienceFormState>) => {
    setPreview(null); setPreviewError(null); onPreview?.(null);
    onChange({ ...value, ...patch });
  };

  const runPreview = async () => {
    const built = buildAudienceInput(value);
    if (!built.ok) { setPreview(null); onPreview?.(null); setPreviewError((built as { error: string }).error); return; }
    setPreviewing(true); setPreviewError(null);
    try {
      const res = await previewWhatsAppBroadcastAudience(built.audience);
      if (res.success) {
        const p = { counts: res.counts, exclusions: res.exclusions, sample: res.sample, window: res.window };
        setPreview(p); onPreview?.(p);
      } else { setPreview(null); onPreview?.(null); setPreviewError((res as { error: string }).error); }
    } finally { setPreviewing(false); }
  };

  const lines = preview ? describeExclusions(preview.exclusions) : [];

  return (
    <div className="space-y-3">
      <DashFormField label="Audience" hint="Who should receive this campaign">
        <Select value={value.type} onValueChange={(v) => set({ type: v as AudienceType })}>
          <SelectTrigger className="h-11 w-full border-dash-border rounded-xl text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
            <SelectItem value="all_contacts" className="text-sm">All contacts (not opted out)</SelectItem>
            <SelectItem value="tags" className="text-sm">Contacts with tags</SelectItem>
            <SelectItem value="contact_fields" className="text-sm">Contact filter</SelectItem>
            {segments.length > 0 && <SelectItem value="saved_segment" className="text-sm">Saved segment</SelectItem>}
          </SelectContent>
        </Select>
      </DashFormField>

      {value.type === 'tags' && (
        <div className="space-y-3">
          <DashFormField label="Tags" hint="Comma separated tag names, e.g. vip, newsletter">
            <DashInput value={value.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="vip, newsletter" />
          </DashFormField>
          <DashFormField label="Match">
            <Select value={value.tagMode} onValueChange={(v) => set({ tagMode: v as 'all' | 'any' })}>
              <SelectTrigger className="h-10 w-full border-dash-border rounded-xl text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                <SelectItem value="all" className="text-sm">Contacts with ALL of these tags</SelectItem>
                <SelectItem value="any" className="text-sm">Contacts with ANY of these tags</SelectItem>
              </SelectContent>
            </Select>
          </DashFormField>
        </div>
      )}

      {value.type === 'contact_fields' && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[12px] font-bold !text-dash-text cursor-pointer">
            <input type="checkbox" className="rounded" checked={value.hasPhone} onChange={(e) => set({ hasPhone: e.target.checked })} />
            Only contacts that have a phone number
          </label>
          <div className="grid grid-cols-2 gap-3">
            <DashFormField label="Source"><DashInput value={value.source} onChange={(e) => set({ source: e.target.value })} placeholder="e.g. web form" /></DashFormField>
            <DashFormField label="Timezone"><DashInput value={value.timezone} onChange={(e) => set({ timezone: e.target.value })} placeholder="e.g. Africa/Johannesburg" /></DashFormField>
            <DashFormField label="Added on or after"><DashInput type="date" value={value.createdAfter} onChange={(e) => set({ createdAfter: e.target.value })} /></DashFormField>
            <DashFormField label="Added on or before"><DashInput type="date" value={value.createdBefore} onChange={(e) => set({ createdBefore: e.target.value })} /></DashFormField>
          </div>
        </div>
      )}

      {value.type === 'saved_segment' && (
        <DashFormField label="Saved segment" hint="Optional. Segments are managed under Marketing > Segments">
          <Select value={value.segmentId} onValueChange={(v) => set({ segmentId: v })}>
            <SelectTrigger className="h-10 w-full border-dash-border rounded-xl text-sm"><SelectValue placeholder="Select a segment" /></SelectTrigger>
            <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
              {segments.map((s) => <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </DashFormField>
      )}

      <p className="text-[11px] !text-dash-textMuted">
        LeadsMind does not yet record WhatsApp consent per contact. Until it does, you are responsible for making sure
        everyone in this audience agreed to receive WhatsApp marketing messages from your business.
      </p>

      <div className="flex items-center gap-3">
        <DashButton variant="secondary" onClick={runPreview} disabled={previewing}>
          {previewing ? <><Loader2 size={14} className="animate-spin" /> Checking…</> : 'Preview audience'}
        </DashButton>
        <span className="text-[11px] !text-dash-textMuted">Nothing is sent when you preview.</span>
      </div>

      {previewError && <p className="text-[12px] text-red">{previewError}</p>}

      {preview && (
        <div className="border border-dash-border rounded-xl p-3 bg-dash-surface space-y-1.5 text-[12px]">
          <p className="font-bold !text-dash-text">
            {plural(preview.counts.eligible, 'contact', 'contacts')} can receive this campaign
            <span className="font-medium !text-dash-textMuted"> ({preview.counts.matched} matched)</span>
          </p>
          <p className="!text-dash-textMuted">
            {preview.window.open} {preview.window.open === 1 ? 'has' : 'have'} an open 24-hour window (can get your free-text message); {preview.window.closed} {preview.window.closed === 1 ? 'does' : 'do'} not (need an approved template).
          </p>
          {lines.length > 0 && (
            <div className="!text-dash-textMuted">
              <p className="font-semibold">Left out:</p>
              <ul className="list-disc pl-5">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          )}
          {preview.sample.length > 0 && (
            <p className="!text-dash-textMuted">
              Examples: {preview.sample.map((s) => `${s.name} (${s.phone})`).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

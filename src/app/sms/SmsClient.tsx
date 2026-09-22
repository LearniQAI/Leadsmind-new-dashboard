'use client';

import React, { useMemo, useState } from 'react';
import { Plus, MessageSquareText, Trash2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter
} from '@/components/dashboard-ui/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { MoreVertical } from 'lucide-react';
import { createBulkSmsCampaign, cancelBulkSmsCampaign, deleteBulkSmsCampaign } from '@/app/actions/bulk_sms';
import { analyzeSms, hasOptOutWording, STOP_WORDING, MAX_SMS_BODY_CHARS } from '@/lib/smsSegments';
import { hasMergeTags } from '@/lib/smsMessage';

interface SegmentRow {
  id: string;
  name: string;
  // Live count of segment members reachable by SMS (opted-out and phone-less contacts excluded).
  reach?: { sms?: number | null } | null;
}

interface CampaignRow {
  id: string;
  name: string;
  message_body: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  total_skipped_opt_out: number;
  total_skipped_invalid_number?: number;
  total_delivered?: number;
  total_undelivered?: number;
  created_at: string;
}

const STATUS_VARIANT: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'neutral',
  scheduled: 'info',
  sending: 'warning',
  completed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function SmsClient({
  initialCampaigns,
  segments,
  smsReady = true,
}: {
  initialCampaigns: CampaignRow[];
  segments: SegmentRow[];
  smsReady?: boolean;
}) {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(initialCampaigns);

  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSegmentId, setFormSegmentId] = useState<string>('');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<CampaignRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const analysis = useMemo(() => analyzeSms(formMessage), [formMessage]);
  const overLimit = formMessage.length > MAX_SMS_BODY_CHARS;
  const selectedSegment = segments.find((s) => s.id === formSegmentId);
  const reach = selectedSegment?.reach?.sms ?? null;
  const showStopReminder = formMessage.trim().length > 0 && !hasOptOutWording(formMessage);

  const openCreate = () => {
    setFormName('');
    setFormMessage('');
    setFormSegmentId('');
    setFormScheduledAt('');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Please enter a campaign name'); return; }
    if (!formMessage.trim()) { toast.error('Please enter a message'); return; }
    if (overLimit) { toast.error(`Message is too long (maximum ${MAX_SMS_BODY_CHARS} characters)`); return; }
    if (!formSegmentId) { toast.error('Select an audience segment'); return; }

    setSaving(true);
    try {
      const res = await createBulkSmsCampaign({
        name: formName.trim(),
        messageBody: formMessage.trim(),
        segmentId: formSegmentId,
        scheduledAt: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
      });

      if (!res.success) { toast.error(res.error || 'Failed to create campaign'); return; }

      const exclusions = [
        res.excludedOptOut ? `${res.excludedOptOut} opted out` : null,
        res.excludedInvalid ? `${res.excludedInvalid} invalid number${res.excludedInvalid === 1 ? '' : 's'}` : null,
      ].filter(Boolean).join(', ');
      toast.success(
        `Campaign scheduled for ${res.recipientCount} recipient${res.recipientCount === 1 ? '' : 's'}` +
        (exclusions ? ` (${exclusions} excluded)` : '')
      );
      setCampaigns((prev) => [res.data, ...prev]);
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      const res = await cancelBulkSmsCampaign(cancelTarget.id);
      if (!res.success) { toast.error(res.error || 'Failed to cancel campaign'); return; }
      toast.success('Campaign cancelled');
      setCampaigns((prev) => prev.map((c) => (c.id === cancelTarget.id ? { ...c, status: 'cancelled' } : c)));
      setCancelTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await deleteBulkSmsCampaign(deleteTarget.id);
      if (!res.success) { toast.error(res.error || 'Failed to delete campaign'); return; }
      toast.success('Campaign deleted');
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight !text-dash-text">Bulk SMS</h1>
          <p className="text-sm !text-dash-textMuted font-medium">
            Schedule a one-time text message to a saved Segment. Contacts who reply STOP are automatically excluded.
          </p>
        </div>
        <DashButton onClick={openCreate} disabled={segments.length === 0 || !smsReady}>
          <Plus size={14} /> New SMS Campaign
        </DashButton>
      </div>

      {!smsReady && (
        <DashCard className="p-4 text-[13px] !text-dash-textMuted flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber" />
          <span>
            Connect your Twilio account and a sending number before you can schedule SMS campaigns.{' '}
            <a href="/settings" className="text-dash-accent font-bold underline">Open Settings › Phone</a>
          </span>
        </DashCard>
      )}

      {segments.length === 0 && (
        <DashCard className="p-4 text-[13px] !text-dash-textMuted">
          You need at least one <a href="/segments" className="text-dash-accent font-bold underline">Segment</a> before you can target a bulk SMS campaign.
        </DashCard>
      )}

      {campaigns.length === 0 ? (
        <DashEmptyState
          icon={MessageSquareText}
          title="No SMS campaigns yet"
          description="Send a scheduled bulk text message to a saved audience"
          actionLabel="New SMS Campaign"
          onAction={segments.length > 0 && smsReady ? openCreate : undefined}
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <DashCard key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold !text-dash-text">{c.name}</p>
                    <DashStatusPill variant={STATUS_VARIANT[c.status] || 'neutral'}>{c.status}</DashStatusPill>
                  </div>
                  <p className="text-[12px] !text-dash-textMuted mt-1 line-clamp-2">{c.message_body}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] !text-dash-textMuted font-semibold flex-wrap">
                    <span>{plural(c.total_recipients, 'recipient')}</span>
                    <span>·</span>
                    <span title="Accepted by Twilio for delivery">{c.total_sent} sent</span>
                    <span>·</span>
                    <span title="Confirmed delivered to the handset (from Twilio delivery receipts)">{c.total_delivered ?? 0} delivered</span>
                    {(c.total_undelivered ?? 0) > 0 && <><span>·</span><span className="text-red" title="Twilio reported the message could not be delivered">{c.total_undelivered} not delivered</span></>}
                    {c.total_failed > 0 && <><span>·</span><span className="text-red" title="Twilio refused the message, or it could not be sent">{c.total_failed} failed</span></>}
                    {c.total_skipped_opt_out > 0 && <><span>·</span><span>{c.total_skipped_opt_out} opted out</span></>}
                    {(c.total_skipped_invalid_number ?? 0) > 0 && <><span>·</span><span title="Repeated Twilio delivery failures marked this number invalid">{c.total_skipped_invalid_number} invalid number{c.total_skipped_invalid_number === 1 ? '' : 's'}</span></>}
                    {c.scheduled_at && <><span>·</span><span>Scheduled {new Date(c.scheduled_at).toLocaleString()}</span></>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface" disabled={busyId === c.id}>
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl p-2 min-w-[160px]">
                    {['scheduled', 'sending'].includes(c.status) && (
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center gap-2 hover:bg-amber/10 rounded-lg p-2 font-bold text-amber"
                        onClick={() => setCancelTarget(c)}
                      >
                        <XCircle size={14} /> Cancel
                      </DropdownMenuItem>
                    )}
                    {c.status !== 'sending' && (
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center gap-2 hover:bg-red/10 rounded-lg p-2 font-bold text-red"
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2 size={14} /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </DashCard>
          ))}
        </div>
      )}

      <DashModal open={formOpen} onOpenChange={setFormOpen}>
        <DashModalContent className="max-w-2xl">
          <DashModalHeader>
            <DashModalTitle>New SMS Campaign</DashModalTitle>
          </DashModalHeader>
          <div className="space-y-4 px-1">
            <DashFormField label="Campaign name">
              <DashInput
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Spring Sale Blast"
              />
            </DashFormField>
            <DashFormField label="Audience" hint="Target a saved Segment (create one under Marketing > Segments)">
              <Select value={formSegmentId} onValueChange={setFormSegmentId}>
                <SelectTrigger className="h-11 w-full border-dash-border rounded-xl text-sm">
                  <SelectValue placeholder="Select a segment" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DashFormField>
            <DashFormField
              label="Message"
              hint={`Merge tags such as {{first_name}}, {{last_name}} and {{company}} are filled in for each recipient. Maximum ${MAX_SMS_BODY_CHARS} characters.`}
            >
              <DashTextarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Hi {{first_name}}, ..."
                rows={4}
              />
            </DashFormField>

            {/* Length, encoding and cost: SMS is billed per SEGMENT, per recipient. */}
            <div className="rounded-xl border border-dash-border bg-dash-surface p-3 space-y-2 text-[12px] !text-dash-textMuted" aria-live="polite">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className={`font-bold ${overLimit ? 'text-red' : '!text-dash-text'}`}>
                  {analysis.length}/{MAX_SMS_BODY_CHARS} characters
                  {overLimit && ' — too long'}
                </span>
                <span className="font-bold !text-dash-text">
                  {plural(analysis.segments, 'segment')} per recipient · {analysis.encoding}
                </span>
              </div>
              <p className="flex items-start gap-1.5">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>
                  A text is billed per segment, not per message. Standard characters (GSM-7) fit 160 in one segment
                  (153 each once it splits); a message that needs Unicode fits only 70 (67 once it splits).
                </span>
              </p>
              {analysis.encoding === 'Unicode' && (
                <p className="flex items-start gap-1.5 text-amber font-semibold">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>
                    This message contains characters that force Unicode ({analysis.nonGsmChars.slice(0, 8).join(' ')}
                    {analysis.nonGsmChars.length > 8 ? ' …' : ''}), so only 70 characters fit per segment and it costs
                    more. Replace emoji, curly quotes and accented or non-English characters with plain ones to bring the cost down.
                  </span>
                </p>
              )}
              {reach !== null && analysis.segments > 0 && (
                <p>
                  Estimated cost: up to <strong>{reach}</strong> recipient{reach === 1 ? '' : 's'} × {plural(analysis.segments, 'segment')} ={' '}
                  <strong>{reach * analysis.segments}</strong> billed segment{reach * analysis.segments === 1 ? '' : 's'}.
                  {hasMergeTags(formMessage) && ' Merge tags are replaced per person, so the final length can differ slightly.'}
                </p>
              )}
              {showStopReminder && (
                <p className="flex items-start gap-1.5 text-amber font-semibold">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>
                    Marketing texts should tell people how to opt out (for example “{STOP_WORDING}”).{' '}
                    <button
                      type="button"
                      className="underline text-dash-accent"
                      onClick={() => setFormMessage((m) => `${m.trimEnd()} ${STOP_WORDING}`)}
                    >
                      Add opt-out wording
                    </button>
                  </span>
                </p>
              )}
            </div>

            <DashFormField label="Schedule for" hint="Leave blank to send as soon as possible">
              <DashInput
                type="datetime-local"
                value={formScheduledAt}
                onChange={(e) => setFormScheduledAt(e.target.value)}
              />
            </DashFormField>
          </div>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setFormOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleSave} disabled={saving || overLimit}>
              {saving ? 'Scheduling…' : 'Schedule campaign'}
            </DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel this campaign?"
        description={`Recipients who haven't been texted yet in "${cancelTarget?.name}" will not receive this message. Messages already handed to the carrier can't be recalled.`}
        confirmLabel="Cancel campaign"
        variant="warning"
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete this campaign?"
        description={`This permanently removes "${deleteTarget?.name}" and its send history.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Plus, MessageSquareText, Trash2, XCircle } from 'lucide-react';
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

interface SegmentRow {
  id: string;
  name: string;
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

const MAX_SMS_LENGTH = 320;

export default function SmsClient({ initialCampaigns, segments }: { initialCampaigns: CampaignRow[]; segments: SegmentRow[] }) {
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

      toast.success(
        `Campaign scheduled for ${res.recipientCount} recipient${res.recipientCount === 1 ? '' : 's'}` +
        (res.excludedOptOut ? ` (${res.excludedOptOut} excluded — opted out of SMS)` : '')
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
        <DashButton onClick={openCreate} disabled={segments.length === 0}>
          <Plus size={14} /> New SMS Campaign
        </DashButton>
      </div>

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
          onAction={segments.length > 0 ? openCreate : undefined}
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
                    <span>{c.total_recipients} recipient{c.total_recipients === 1 ? '' : 's'}</span>
                    <span>·</span>
                    <span>{c.total_sent} sent</span>
                    {c.total_failed > 0 && <><span>·</span><span className="text-red">{c.total_failed} failed</span></>}
                    {c.total_skipped_opt_out > 0 && <><span>·</span><span>{c.total_skipped_opt_out} opted out</span></>}
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
              hint={`${formMessage.length}/${MAX_SMS_LENGTH} characters`}
            >
              <DashTextarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value.slice(0, MAX_SMS_LENGTH))}
                placeholder="Hi {{first_name}}, ..."
                rows={4}
              />
            </DashFormField>
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
            <DashButton onClick={handleSave} disabled={saving}>
              {saving ? 'Scheduling…' : 'Schedule campaign'}
            </DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel this campaign?"
        description={`Any recipients who haven't been texted yet in "${cancelTarget?.name}" will not receive this message.`}
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

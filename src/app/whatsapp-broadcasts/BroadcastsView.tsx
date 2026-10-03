'use client';

import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, Trash2, XCircle, Loader2 } from 'lucide-react';
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
import {
  createWhatsAppBroadcastCampaign, cancelWhatsAppBroadcastCampaign, deleteWhatsAppBroadcastCampaign,
  listApprovedWhatsAppTemplates,
} from '@/app/actions/whatsapp_broadcast';
import { COMPLIANCE_TEXT } from '@/lib/whatsapp/audience/types';
import AudiencePicker, { EMPTY_AUDIENCE, buildAudienceInput, evaluateWindowGate, type AudienceFormState, type Preview } from './AudiencePicker';

export interface CampaignRow {
  id: string;
  name: string;
  message_body: string | null;
  template_name: string | null;
  template_language: string | null;
  status: string;
  scheduled_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  total_skipped_opt_out: number;
  total_skipped_no_template: number;
  created_at: string;
}

interface TemplateOption {
  name: string;
  language: string;
  category: string;
  status: string;
  bodyText: string;
}

const STATUS_VARIANT: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'neutral', scheduled: 'info', sending: 'warning', completed: 'success', failed: 'danger', cancelled: 'neutral',
};

function countTemplateVars(bodyText: string): number {
  const matches = bodyText.match(/\{\{\d+\}\}/g);
  if (!matches) return 0;
  return new Set(matches).size;
}

export default function BroadcastsView({ campaigns, setCampaigns }: {
  campaigns: CampaignRow[]; setCampaigns: React.Dispatch<React.SetStateAction<CampaignRow[]>>;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [audience, setAudience] = useState<AudienceFormState>(EMPTY_AUDIENCE);
  const [attested, setAttested] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  const [useTemplate, setUseTemplate] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [templatesMock, setTemplatesMock] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [templateParams, setTemplateParams] = useState<string[]>([]);

  const [cancelTarget, setCancelTarget] = useState<CampaignRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCreate = () => {
    setFormName(''); setFormMessage(''); setAudience(EMPTY_AUDIENCE); setAttested(false); setPreview(null); setFormScheduledAt('');
    setUseTemplate(false); setSelectedTemplate(null); setTemplateParams([]);
    setFormOpen(true);
  };

  useEffect(() => {
    if (!formOpen || !useTemplate || templates.length > 0 || templatesLoading) return;
    setTemplatesLoading(true);
    listApprovedWhatsAppTemplates()
      .then((res) => {
        if (res.success) { setTemplates(res.data); setTemplatesMock(!!res.mock); }
        else setTemplatesError(res.error || 'Failed to load templates');
      })
      .finally(() => setTemplatesLoading(false));
  }, [formOpen, useTemplate, templates.length, templatesLoading]);

  const handleSelectTemplate = (name: string) => {
    const t = templates.find((tpl) => tpl.name === name) || null;
    setSelectedTemplate(t);
    setTemplateParams(t ? Array(countTemplateVars(t.bodyText)).fill('') : []);
  };

  // UI-level guard for now (server enforcement belongs to the later wizard batch): without an approved template, anyone
  // outside the 24-hour window would be skipped, so require a template or an all-in-window audience.
  const gate = evaluateWindowGate(!!selectedTemplate, preview ? preview.window : null);
  const closedWindow = gate.closed;
  const needsPreviewForWindow = gate.needsPreview;
  const createBlocked = gate.blocked;

  const handleSave = async () => {
    if (createBlocked) return;
    if (!formName.trim()) { toast.error('Please enter a campaign name'); return; }
    if (!formMessage.trim() && !selectedTemplate) { toast.error('Add a free-text message, an approved template, or both'); return; }
    const built = buildAudienceInput(audience);
    if (!built.ok) { toast.error((built as { error: string }).error); return; }
    if (!attested) { toast.error('Confirm that these contacts agreed to receive WhatsApp marketing messages'); return; }

    setSaving(true);
    try {
      const res = await createWhatsAppBroadcastCampaign({
        name: formName.trim(),
        messageBody: formMessage.trim() || null,
        templateName: selectedTemplate?.name || null,
        templateLanguage: selectedTemplate?.language || null,
        templateBodyParams: templateParams.length ? templateParams : null,
        audience: built.audience,
        consentAttested: attested,
        scheduledAt: formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
      });

      if (!res.success) { toast.error(res.error || 'Failed to create campaign'); return; }

      toast.success(
        `Campaign scheduled for ${res.recipientCount} recipient${res.recipientCount === 1 ? '' : 's'}` +
        (res.excludedOptOut ? ` (${res.excludedOptOut} excluded — opted out of WhatsApp)` : '')
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
      const res = await cancelWhatsAppBroadcastCampaign(cancelTarget.id);
      if (!res.success) { toast.error(res.error || 'Failed to cancel campaign'); return; }
      toast.success('Campaign cancelled');
      setCampaigns((prev) => prev.map((c) => (c.id === cancelTarget.id ? { ...c, status: 'cancelled' } : c)));
      setCancelTarget(null);
    } finally { setBusyId(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await deleteWhatsAppBroadcastCampaign(deleteTarget.id);
      if (!res.success) { toast.error(res.error || 'Failed to delete campaign'); return; }
      toast.success('Campaign deleted');
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DashButton onClick={openCreate}>
          <Plus size={14} /> New WhatsApp Campaign
        </DashButton>
      </div>

      {campaigns.length === 0 ? (
        <DashEmptyState
          icon={MessageCircle}
          title="No WhatsApp campaigns yet"
          description="Send a scheduled bulk WhatsApp message to your contacts"
          actionLabel="New WhatsApp Campaign"
          onAction={openCreate}
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
                    {c.template_name && <DashStatusPill variant="accent">template: {c.template_name}</DashStatusPill>}
                  </div>
                  {c.message_body && <p className="text-[12px] !text-dash-textMuted mt-1 line-clamp-2">{c.message_body}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] !text-dash-textMuted font-semibold flex-wrap">
                    <span>{c.total_recipients} recipient{c.total_recipients === 1 ? '' : 's'}</span>
                    <span>·</span>
                    <span>{c.total_sent} sent</span>
                    {c.total_failed > 0 && <><span>·</span><span className="text-red">{c.total_failed} failed</span></>}
                    {c.total_skipped_opt_out > 0 && <><span>·</span><span>{c.total_skipped_opt_out} opted out</span></>}
                    {c.total_skipped_no_template > 0 && <><span>·</span><span>{c.total_skipped_no_template} skipped (out-of-window, no template)</span></>}
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
                      <DropdownMenuItem className="cursor-pointer flex items-center gap-2 hover:bg-amber/10 rounded-lg p-2 font-bold text-amber" onClick={() => setCancelTarget(c)}>
                        <XCircle size={14} /> Cancel
                      </DropdownMenuItem>
                    )}
                    {c.status !== 'sending' && (
                      <DropdownMenuItem className="cursor-pointer flex items-center gap-2 hover:bg-red/10 rounded-lg p-2 font-bold text-red" onClick={() => setDeleteTarget(c)}>
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
          <DashModalHeader><DashModalTitle>New WhatsApp Campaign</DashModalTitle></DashModalHeader>
          <div className="space-y-4 px-1 max-h-[70vh] overflow-y-auto">
            <DashFormField label="Campaign name">
              <DashInput value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Spring Sale Blast" />
            </DashFormField>
            <AudiencePicker value={audience} onChange={setAudience} onPreview={setPreview} />

            <label className="flex items-start gap-2 text-[12px] font-bold !text-dash-text cursor-pointer">
              <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="rounded mt-0.5" />
              <span>{COMPLIANCE_TEXT}</span>
            </label>

            <DashFormField label="Free-text message" hint="Sent to contacts inside their 24h WhatsApp session window (i.e. who messaged you recently)">
              <DashTextarea value={formMessage} onChange={(e) => setFormMessage(e.target.value)} placeholder="Hi {{contact.first_name}}, ..." rows={3} />
            </DashFormField>

            <div className="border border-dash-border rounded-xl p-3 bg-dash-surface space-y-3">
              <label className="flex items-center gap-2 text-[12px] font-bold !text-dash-text cursor-pointer">
                <input type="checkbox" checked={useTemplate} onChange={(e) => setUseTemplate(e.target.checked)} className="rounded" />
                Add an approved template (required to reach contacts outside the 24h window)
              </label>

              {useTemplate && (
                <div className="space-y-3">
                  {templatesLoading && <p className="text-[11px] !text-dash-textMuted flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Fetching approved templates from Meta…</p>}
                  {templatesError && <p className="text-[11px] text-red">{templatesError}</p>}
                  {templatesMock && <p className="text-[10.5px] text-amber font-semibold">No live WhatsApp Business connection detected — showing sample templates for layout only.</p>}
                  {!templatesLoading && templates.length > 0 && (
                    <>
                      <Select value={selectedTemplate?.name || ''} onValueChange={handleSelectTemplate}>
                        <SelectTrigger className="h-10 w-full border-dash-border rounded-xl text-sm bg-white">
                          <SelectValue placeholder="Select an approved template" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                          {templates.map((t) => (
                            <SelectItem key={t.name} value={t.name} className="text-sm">{t.name} ({t.language})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTemplate && (
                        <div className="space-y-2">
                          <p className="text-[11px] !text-dash-textMuted italic">"{selectedTemplate.bodyText}"</p>
                          {templateParams.map((val, i) => (
                            <DashInput
                              key={i}
                              value={val}
                              onChange={(e) => setTemplateParams((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
                              placeholder={`Variable {{${i + 1}}} — e.g. {{contact.first_name}}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {closedWindow > 0 && (
              <p className="text-[12px] text-amber font-semibold" data-testid="window-warning">
                {closedWindow} {closedWindow === 1 ? 'recipient has' : 'recipients have'} no open 24-hour window and would be skipped without an approved template. Add a template above, or choose an audience where everyone has messaged you in the last 24 hours.
              </p>
            )}
            {needsPreviewForWindow && (
              <p className="text-[12px] !text-dash-textMuted" data-testid="window-needs-preview">
                Preview the audience first, so we can check who has an open 24-hour window. Without an approved template, only those people can receive your message.
              </p>
            )}

            <DashFormField label="Schedule for" hint="Leave blank to send as soon as possible">
              <DashInput type="datetime-local" value={formScheduledAt} onChange={(e) => setFormScheduledAt(e.target.value)} />
            </DashFormField>
          </div>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setFormOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleSave} disabled={saving || createBlocked}>{saving ? 'Scheduling…' : 'Schedule campaign'}</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      <ConfirmDialog
        isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel this campaign?"
        description={`Any recipients who haven't been messaged yet in "${cancelTarget?.name}" will not receive this message.`}
        confirmLabel="Cancel campaign" variant="warning" onConfirm={handleCancel}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete this campaign?"
        description={`This permanently removes "${deleteTarget?.name}" and its send history.`}
        confirmLabel="Delete" variant="danger" onConfirm={handleDelete}
      />
    </div>
  );
}

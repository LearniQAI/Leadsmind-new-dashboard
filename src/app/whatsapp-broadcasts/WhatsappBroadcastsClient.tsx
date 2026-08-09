'use client';

import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, Trash2, XCircle, Bot, Radio, Loader2, Power } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import {
  createWhatsAppBroadcastCampaign, cancelWhatsAppBroadcastCampaign, deleteWhatsAppBroadcastCampaign,
  listApprovedWhatsAppTemplates,
} from '@/app/actions/whatsapp_broadcast';
import {
  createWhatsAppBotRule, updateWhatsAppBotRule, deleteWhatsAppBotRule, toggleWhatsAppBotRule,
  WhatsAppBotRulePayload,
} from '@/app/actions/whatsapp_bot_rules';

interface SegmentRow { id: string; name: string; }

interface CampaignRow {
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

interface RuleRow {
  id: string;
  name: string;
  match_type: 'exact' | 'contains' | 'regex';
  match_value: string;
  reply_type: 'text' | 'template';
  reply_text: string | null;
  reply_template_name: string | null;
  priority: number;
  active: boolean;
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

export default function WhatsappBroadcastsClient({ initialCampaigns, initialRules, segments }: {
  initialCampaigns: CampaignRow[]; initialRules: RuleRow[]; segments: SegmentRow[];
}) {
  const [view, setView] = useState<'broadcasts' | 'replies'>('broadcasts');
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(initialCampaigns);
  const [rules, setRules] = useState<RuleRow[]>(initialRules);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight !text-dash-text">WhatsApp Broadcasts</h1>
          <p className="text-sm !text-dash-textMuted font-medium">
            Scheduled bulk WhatsApp sends and keyword-triggered automated replies, via your connected WhatsApp Business account.
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-dash-surface border border-dash-border rounded-xl">
          <button
            onClick={() => setView('broadcasts')}
            className={cn('h-9 px-4 rounded-lg text-[12.5px] font-bold flex items-center gap-2 transition-colors', view === 'broadcasts' ? 'bg-white shadow-sm !text-dash-text' : '!text-dash-textMuted')}
          >
            <Radio size={14} /> Broadcasts
          </button>
          <button
            onClick={() => setView('replies')}
            className={cn('h-9 px-4 rounded-lg text-[12.5px] font-bold flex items-center gap-2 transition-colors', view === 'replies' ? 'bg-white shadow-sm !text-dash-text' : '!text-dash-textMuted')}
          >
            <Bot size={14} /> Automated Replies
          </button>
        </div>
      </div>

      {view === 'broadcasts' ? (
        <BroadcastsView campaigns={campaigns} setCampaigns={setCampaigns} segments={segments} />
      ) : (
        <RepliesView rules={rules} setRules={setRules} />
      )}
    </div>
  );
}

function BroadcastsView({ campaigns, setCampaigns, segments }: {
  campaigns: CampaignRow[]; setCampaigns: React.Dispatch<React.SetStateAction<CampaignRow[]>>; segments: SegmentRow[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSegmentId, setFormSegmentId] = useState('');
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
    setFormName(''); setFormMessage(''); setFormSegmentId(''); setFormScheduledAt('');
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

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Please enter a campaign name'); return; }
    if (!formMessage.trim() && !selectedTemplate) { toast.error('Add a free-text message, an approved template, or both'); return; }
    if (!formSegmentId) { toast.error('Select an audience segment'); return; }

    setSaving(true);
    try {
      const res = await createWhatsAppBroadcastCampaign({
        name: formName.trim(),
        messageBody: formMessage.trim() || null,
        templateName: selectedTemplate?.name || null,
        templateLanguage: selectedTemplate?.language || null,
        templateBodyParams: templateParams.length ? templateParams : null,
        segmentId: formSegmentId,
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
        <DashButton onClick={openCreate} disabled={segments.length === 0}>
          <Plus size={14} /> New WhatsApp Campaign
        </DashButton>
      </div>

      {segments.length === 0 && (
        <DashCard className="p-4 text-[13px] !text-dash-textMuted">
          You need at least one <a href="/segments" className="text-dash-accent font-bold underline">Segment</a> before you can target a WhatsApp broadcast.
        </DashCard>
      )}

      {campaigns.length === 0 ? (
        <DashEmptyState
          icon={MessageCircle}
          title="No WhatsApp campaigns yet"
          description="Send a scheduled bulk WhatsApp message to a saved audience"
          actionLabel="New WhatsApp Campaign"
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
            <DashFormField label="Audience" hint="Target a saved Segment (create one under Marketing > Segments)">
              <Select value={formSegmentId} onValueChange={setFormSegmentId}>
                <SelectTrigger className="h-11 w-full border-dash-border rounded-xl text-sm">
                  <SelectValue placeholder="Select a segment" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                  {segments.map((s) => <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </DashFormField>
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

            <DashFormField label="Schedule for" hint="Leave blank to send as soon as possible">
              <DashInput type="datetime-local" value={formScheduledAt} onChange={(e) => setFormScheduledAt(e.target.value)} />
            </DashFormField>
          </div>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setFormOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleSave} disabled={saving}>{saving ? 'Scheduling…' : 'Schedule campaign'}</DashButton>
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

const EMPTY_RULE_FORM: WhatsAppBotRulePayload = {
  name: '', matchType: 'contains', matchValue: '', replyType: 'text', replyText: '', priority: 0, active: true,
};

function RepliesView({ rules, setRules }: { rules: RuleRow[]; setRules: React.Dispatch<React.SetStateAction<RuleRow[]>>; }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WhatsAppBotRulePayload>(EMPTY_RULE_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RuleRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_RULE_FORM); setFormOpen(true); };
  const openEdit = (rule: RuleRow) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name, matchType: rule.match_type, matchValue: rule.match_value,
      replyType: rule.reply_type, replyText: rule.reply_text || '',
      replyTemplateName: rule.reply_template_name || '', priority: rule.priority, active: rule.active,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = editingId ? await updateWhatsAppBotRule(editingId, form) : await createWhatsAppBotRule(form);
      if (!res.success) { toast.error(res.error || 'Failed to save rule'); return; }
      toast.success(editingId ? 'Rule updated' : 'Rule created');
      if (editingId) {
        setRules((prev) => prev.map((r) => (r.id === editingId ? res.data : r)));
      } else {
        setRules((prev) => [...prev, res.data].sort((a, b) => a.priority - b.priority));
      }
      setFormOpen(false);
    } finally { setSaving(false); }
  };

  const handleToggle = async (rule: RuleRow) => {
    setBusyId(rule.id);
    try {
      const res = await toggleWhatsAppBotRule(rule.id, !rule.active);
      if (!res.success) { toast.error(res.error || 'Failed to update rule'); return; }
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r)));
    } finally { setBusyId(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await deleteWhatsAppBotRule(deleteTarget.id);
      if (!res.success) { toast.error(res.error || 'Failed to delete rule'); return; }
      toast.success('Rule deleted');
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DashButton onClick={openCreate}><Plus size={14} /> New Rule</DashButton>
      </div>

      {rules.length === 0 ? (
        <DashEmptyState
          icon={Bot}
          title="No automated replies yet"
          description="Auto-reply to inbound WhatsApp messages that match a keyword, e.g. reply to 'pricing' with your pricing page link"
          actionLabel="New Rule"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <DashCard key={r.id} className={cn('p-5', !r.active && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold !text-dash-text">{r.name}</p>
                    <DashStatusPill variant={r.active ? 'success' : 'neutral'}>{r.active ? 'Active' : 'Inactive'}</DashStatusPill>
                    <DashStatusPill variant="info">{r.match_type}</DashStatusPill>
                  </div>
                  <p className="text-[12px] !text-dash-textMuted mt-1">
                    When message {r.match_type === 'exact' ? 'equals' : r.match_type === 'contains' ? 'contains' : 'matches regex'} <code className="bg-dash-surface px-1.5 py-0.5 rounded font-mono">{r.match_value}</code>
                  </p>
                  <p className="text-[12px] !text-dash-textMuted mt-0.5 line-clamp-1">
                    Reply: {r.reply_type === 'template' ? `[Template: ${r.reply_template_name}]` : r.reply_text}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(r)}
                    disabled={busyId === r.id}
                    title={r.active ? 'Deactivate' : 'Activate'}
                    className="h-8 w-8 rounded-lg flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface"
                  >
                    <Power size={15} />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 rounded-lg flex items-center justify-center !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface" disabled={busyId === r.id}>
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl p-2 min-w-[140px]">
                      <DropdownMenuItem className="cursor-pointer flex items-center gap-2 hover:bg-dash-surface rounded-lg p-2 font-bold" onClick={() => openEdit(r)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer flex items-center gap-2 hover:bg-red/10 rounded-lg p-2 font-bold text-red" onClick={() => setDeleteTarget(r)}>
                        <Trash2 size={14} /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </DashCard>
          ))}
        </div>
      )}

      <DashModal open={formOpen} onOpenChange={setFormOpen}>
        <DashModalContent className="max-w-lg">
          <DashModalHeader><DashModalTitle>{editingId ? 'Edit rule' : 'New automated reply rule'}</DashModalTitle></DashModalHeader>
          <div className="space-y-4 px-1">
            <DashFormField label="Rule name">
              <DashInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Pricing question" />
            </DashFormField>
            <DashFormField label="Match type">
              <Select value={form.matchType} onValueChange={(v) => setForm((f) => ({ ...f, matchType: v as any }))}>
                <SelectTrigger className="h-10 w-full border-dash-border rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                  <SelectItem value="contains" className="text-sm">Contains</SelectItem>
                  <SelectItem value="exact" className="text-sm">Exact match</SelectItem>
                  <SelectItem value="regex" className="text-sm">Regex</SelectItem>
                </SelectContent>
              </Select>
            </DashFormField>
            <DashFormField label="Match value" hint={form.matchType === 'regex' ? 'Case-insensitive regex, e.g. ^(hi|hello)$' : 'Case-insensitive'}>
              <DashInput value={form.matchValue} onChange={(e) => setForm((f) => ({ ...f, matchValue: e.target.value }))} placeholder="pricing" />
            </DashFormField>
            <DashFormField label="Reply type">
              <Select value={form.replyType} onValueChange={(v) => setForm((f) => ({ ...f, replyType: v as any }))}>
                <SelectTrigger className="h-10 w-full border-dash-border rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                  <SelectItem value="text" className="text-sm">Free text</SelectItem>
                  <SelectItem value="template" className="text-sm">Approved template</SelectItem>
                </SelectContent>
              </Select>
            </DashFormField>
            {form.replyType === 'text' ? (
              <DashFormField label="Reply text">
                <DashTextarea value={form.replyText || ''} onChange={(e) => setForm((f) => ({ ...f, replyText: e.target.value }))} rows={3} placeholder="Hi! Our pricing starts at..." />
              </DashFormField>
            ) : (
              <DashFormField label="Template name" hint="Must exactly match an approved WABA template name">
                <DashInput value={form.replyTemplateName || ''} onChange={(e) => setForm((f) => ({ ...f, replyTemplateName: e.target.value }))} placeholder="pricing_info" />
              </DashFormField>
            )}
            <DashFormField label="Priority" hint="Lower number is evaluated first when multiple rules could match">
              <DashInput type="number" value={form.priority ?? 0} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} />
            </DashFormField>
          </div>
          <DashModalFooter>
            <DashButton variant="secondary" onClick={() => setFormOpen(false)}>Cancel</DashButton>
            <DashButton onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save rule'}</DashButton>
          </DashModalFooter>
        </DashModalContent>
      </DashModal>

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete this rule?"
        description={`"${deleteTarget?.name}" will stop auto-replying to matching messages.`}
        confirmLabel="Delete" variant="danger" onConfirm={handleDelete}
      />
    </div>
  );
}

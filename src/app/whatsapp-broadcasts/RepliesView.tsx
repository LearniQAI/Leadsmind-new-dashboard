'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Bot, Power } from 'lucide-react';
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
  createWhatsAppBotRule, updateWhatsAppBotRule, deleteWhatsAppBotRule, toggleWhatsAppBotRule,
  WhatsAppBotRulePayload,
} from '@/app/actions/whatsapp_bot_rules';

export interface RuleRow {
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

const EMPTY_RULE_FORM: WhatsAppBotRulePayload = {
  name: '', matchType: 'contains', matchValue: '', replyType: 'text', replyText: '', priority: 0, active: true,
};

export default function RepliesView({ rules, setRules }: { rules: RuleRow[]; setRules: React.Dispatch<React.SetStateAction<RuleRow[]>>; }) {
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
            <DashCard key={r.id} className={cn('p-5', (!r.active || r.match_type === 'regex') && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold !text-dash-text">{r.name}</p>
                    <DashStatusPill variant={r.active && r.match_type !== 'regex' ? 'success' : 'neutral'}>{r.match_type === 'regex' ? 'Disabled' : r.active ? 'Active' : 'Inactive'}</DashStatusPill>
                    <DashStatusPill variant="info">{r.match_type}</DashStatusPill>
                  </div>
                  <p className="text-[12px] !text-dash-textMuted mt-1">
                    When message {r.match_type === 'exact' ? 'equals' : r.match_type === 'contains' ? 'contains' : 'matches regex'} <code className="bg-dash-surface px-1.5 py-0.5 rounded font-mono">{r.match_value}</code>
                  </p>
                  {r.match_type === 'regex' && (
                    <p className="text-[12px] text-amber font-semibold mt-1">
                      Regex rules are no longer supported and never send a reply. Delete this rule and recreate it with "Contains" or "Exact match".
                    </p>
                  )}
                  <p className="text-[12px] !text-dash-textMuted mt-0.5 line-clamp-1">
                    Reply: {r.reply_type === 'template' ? `[Template: ${r.reply_template_name}]` : r.reply_text}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(r)}
                    disabled={busyId === r.id || r.match_type === 'regex'}
                    title={r.match_type === 'regex' ? 'Regex rules are no longer supported' : r.active ? 'Deactivate' : 'Activate'}
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
                      {r.match_type !== 'regex' && (
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2 hover:bg-dash-surface rounded-lg p-2 font-bold" onClick={() => openEdit(r)}>
                          Edit
                        </DropdownMenuItem>
                      )}
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
                </SelectContent>
              </Select>
            </DashFormField>
            <DashFormField label="Match value" hint="Case-insensitive">
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

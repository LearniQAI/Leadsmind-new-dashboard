'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Mail, Clock, ArrowDown } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput, DashTextarea, DashFormField } from '@/components/dashboard-ui/FormField';
import { DashCard } from '@/components/dashboard-ui/Card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { saveSequence, type SequenceEmailStep } from '@/app/actions/email_sequences';
import { SEQUENCE_TRIGGERS } from '@/lib/automation/sequenceConstants';

export function SequenceEditorClient({ sequence }: { sequence: any }) {
  const router = useRouter();
  const [name, setName] = useState(sequence.name || '');
  const [triggerType, setTriggerType] = useState(sequence.trigger_type || SEQUENCE_TRIGGERS[0].value);
  const [isActive, setIsActive] = useState(!!sequence.is_active);
  const [emails, setEmails] = useState<SequenceEmailStep[]>(
    sequence.emails?.length ? sequence.emails : [{ subject: '', body: '', isHtml: false, delayValue: 3, delayUnit: 'days' }]
  );
  const [saving, setSaving] = useState(false);

  const updateEmail = (idx: number, patch: Partial<SequenceEmailStep>) =>
    setEmails((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  const addEmail = () =>
    setEmails((prev) => [...prev, { subject: '', body: '', isHtml: false, delayValue: 3, delayUnit: 'days' }]);

  const removeEmail = (idx: number) =>
    setEmails((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Give the sequence a name'); return; }
    if (emails.some((e) => !e.subject.trim() || !e.body.trim())) {
      toast.error('Every email needs a subject and body');
      return;
    }
    setSaving(true);
    try {
      const res = await saveSequence({ id: sequence.id, name, trigger_type: triggerType, is_active: isActive, emails });
      if (!res.success) { toast.error(res.error); return; }
      toast.success('Sequence saved');
      router.push('/sequences');
      router.refresh();
    } catch {
      toast.error('Failed to save sequence');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold !text-dash-text flex items-center gap-2"><Mail className="text-dash-accent" /> Edit email sequence</h1>
        <div className="flex gap-2">
          <DashButton variant="secondary" onClick={() => router.push('/sequences')}>Cancel</DashButton>
          <DashButton onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save sequence'}</DashButton>
        </div>
      </div>

      <DashCard padding="default" className="space-y-4">
        <DashFormField label="Sequence name" required>
          <DashInput value={name} onChange={(e) => setName(e.target.value)} className="h-11" placeholder="e.g. New lead nurture" />
        </DashFormField>
        <DashFormField label="Start this sequence when..." required hint="A curated subset of trigger events relevant to marketing sequences. For any other trigger, use the full Workflow Builder.">
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger className="h-11 border-dash-border rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
              {SEQUENCE_TRIGGERS.map((o) => <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </DashFormField>
        <label className="flex items-center gap-2 text-[12px] font-bold !text-dash-text">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </DashCard>

      <div className="space-y-3">
        <p className="text-sm font-bold !text-dash-text">Emails</p>
        {emails.map((email, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <div className="flex items-center gap-2 pl-2">
                <ArrowDown size={14} className="!text-dash-textMuted" />
                <Clock size={12} className="!text-dash-textMuted" />
                <span className="text-[10px] font-bold !text-dash-textMuted">Wait</span>
                <input
                  type="number"
                  min={1}
                  value={email.delayValue}
                  onChange={(e) => updateEmail(idx, { delayValue: Number(e.target.value) })}
                  className="h-8 w-16 rounded-lg border border-dash-border px-2 text-[12px]"
                />
                <Select value={email.delayUnit} onValueChange={(v) => updateEmail(idx, { delayUnit: v as SequenceEmailStep['delayUnit'] })}>
                  <SelectTrigger className="h-8 w-28 border-dash-border rounded-lg text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                    <SelectItem value="minutes" className="text-[13px]">Minutes</SelectItem>
                    <SelectItem value="hours" className="text-[13px]">Hours</SelectItem>
                    <SelectItem value="days" className="text-[13px]">Days</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[10px] font-bold !text-dash-textMuted">before the next email</span>
              </div>
            )}
            <DashCard padding="default" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold !text-dash-textMuted">Email {idx + 1}{idx === 0 ? ' — sent immediately on trigger' : ''}</span>
                {emails.length > 1 && (
                  <button type="button" onClick={() => removeEmail(idx)} className="p-2 rounded-lg hover:bg-red/10 text-red">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <DashFormField label="Subject" required>
                <DashInput value={email.subject} onChange={(e) => updateEmail(idx, { subject: e.target.value })} className="h-10" placeholder="Welcome to the team!" />
              </DashFormField>
              <DashFormField label="Body" required hint="Plain text or HTML.">
                <DashTextarea value={email.body} onChange={(e) => updateEmail(idx, { body: e.target.value })} rows={6} placeholder="Hi {{contact.first_name}}, ..." />
              </DashFormField>
              <label className="flex items-center gap-2 text-[11px] font-bold !text-dash-textMuted">
                <input type="checkbox" checked={!!email.isHtml} onChange={(e) => updateEmail(idx, { isHtml: e.target.checked })} />
                Body is HTML
              </label>
            </DashCard>
          </React.Fragment>
        ))}
        <DashButton variant="secondary" onClick={addEmail}><Plus size={14} /> Add email</DashButton>
      </div>
    </div>
  );
}

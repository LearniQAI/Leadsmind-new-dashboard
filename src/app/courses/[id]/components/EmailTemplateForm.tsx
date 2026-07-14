'use client';

import React, { useState, useRef } from 'react';
import { Mail, Sparkles, AlertCircle, Save, HelpCircle } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashInput, DashTextarea } from '@/components/dashboard-ui/FormField';
import { toast } from 'sonner';
import { updateCourseEmailTemplate } from '@/app/actions/courseEmails';

interface EmailTemplateFormProps {
  course: any;
  onSaved?: (course: any) => void;
}

const CHIPS = [
  { value: '{{student_first_name}}', label: 'First Name' },
  { value: '{{student_email}}', label: 'Student Email' },
  { value: '{{course_name}}', label: 'Course Title' },
  { value: '{{portal_url}}', label: 'Portal Link' },
  { value: '{{access_type_description}}', label: 'Access Tier' },
  { value: '{{admin_support_email}}', label: 'Support Contact' }
];

export default function EmailTemplateForm({ course, onSaved }: EmailTemplateFormProps) {
  const [subject, setSubject] = useState(course.onboarding_email_subject || 'Welcome to {{course_name}}!');
  const [body, setBody] = useState(course.onboarding_email_body || `Hello {{student_first_name}},\n\nWelcome to {{course_name}}! You have been granted {{access_type_description}} access.\n\nAccess your student portal here: {{portal_url}}\n\nIf you have any questions, contact us at {{admin_support_email}}.`);
  const [saving, setSaving] = useState(false);
  const [lastFocused, setLastFocused] = useState<'subject' | 'body'>('body');

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (variable: string) => {
    if (lastFocused === 'subject') {
      const input = subjectRef.current;
      if (!input) return;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = input.value;
      const newText = text.substring(0, start) + variable + text.substring(end);
      setSubject(newText);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      const textarea = bodyRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const text = textarea.value;
      const newText = text.substring(0, start) + variable + text.substring(end);
      setBody(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateCourseEmailTemplate(course.id, {
        onboarding_email_subject: subject,
        onboarding_email_body: body
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Onboarding email templates saved!');
        if (onSaved) {
          onSaved({
            ...course,
            onboarding_email_subject: subject,
            onboarding_email_body: body
          });
        }
      }
    } catch {
      toast.error('Failed to update email settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm space-y-6">
      <div className="border-b border-dash-border pb-4">
        <h3 className="text-lg font-bold !text-dash-text flex items-center gap-2">
          <Mail className="text-dash-accent w-5 h-5" /> Onboarding emails
        </h3>
        <p className="text-xs !text-dash-textMuted mt-1">
          Customize the email sent automatically when a student registers
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Subject */}
        <DashFormField label="Email subject">
          <DashInput
            ref={subjectRef}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => setLastFocused('subject')}
            placeholder="e.g. Welcome to {{course_name}}!"
            required
          />
        </DashFormField>

        {/* Dynamic Variable Chips */}
        <div className="bg-dash-surface border border-dash-border rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dash-accent flex items-center gap-1">
              <Sparkles size={11} /> Insert a variable
            </span>
            <span className="text-[11px] !text-dash-textMuted">
              Click a token to insert it at your cursor
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => insertVariable(chip.value)}
                className="bg-white border border-dash-border hover:border-dash-accent/40 hover:bg-dash-accent/10 rounded-lg px-2.5 py-1.5 text-xs font-bold !text-dash-text transition-all motion-reduce:transition-none active:scale-95 flex items-center gap-1"
              >
                <span>{chip.label}</span>
                <span className="text-dash-accent text-[11px] font-medium">{chip.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[13px] font-semibold !text-dash-text">
              Email body (markdown supported)
            </label>
            <span className="text-[11px] !text-dash-textMuted flex items-center gap-1">
              <HelpCircle size={10} /> Variables fill in automatically
            </span>
          </div>
          <DashTextarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setLastFocused('body')}
            placeholder="Compose welcome message..."
            rows={8}
            required
            className="leading-relaxed"
          />
        </div>

        {/* Warning Alert */}
        <div className="bg-amber-600/10 border border-amber-600/20 rounded-xl p-4 flex gap-3 text-amber-600">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="text-[13px] leading-relaxed">
            <strong>Note:</strong> Make sure variables are typed correctly inside double braces (e.g. <code>{"{{"}student_first_name{"}}"}</code>). Incorrectly formatted variables will not be filled in when the email is sent.
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-3">
          <DashButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : <><Save size={14} /> Save templates</>}
          </DashButton>
        </div>
      </form>
    </div>
  );
}

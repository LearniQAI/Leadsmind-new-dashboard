'use client';

import React, { useState, useRef } from 'react';
import { Mail, Sparkles, AlertCircle, Save, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="bg-[#0c1535] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-base font-space-grotesk font-black text-white flex items-center gap-2 uppercase tracking-tight">
          <Mail className="text-primary w-5 h-5" /> Onboarding Lifecycle Emails
        </h3>
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
          Customize transactional notifications dispatched upon successful student registration
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Subject */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 font-mono">
            Email Subject Row
          </label>
          <input
            ref={subjectRef}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => setLastFocused('subject')}
            className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary text-white"
            placeholder="e.g. Welcome to {{course_name}}!"
            required
          />
        </div>

        {/* Dynamic Variable Chips */}
        <div className="bg-[#111d47]/30 border border-white/5 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#3b82f6] flex items-center gap-1">
              <Sparkles size={11} /> Dynamic Parameter Tokens
            </span>
            <span className="text-[8px] font-mono text-white/30">
              Clicks parameter to insert at selector cursor position
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => insertVariable(chip.value)}
                className="bg-white/5 border border-white/10 hover:border-primary/20 hover:bg-primary/10 hover:text-white rounded-lg px-2.5 py-1.5 text-[10px] font-mono font-bold text-white/60 transition-all active:scale-95 flex items-center gap-1"
              >
                <span>{chip.label}</span>
                <span className="text-primary-light text-[9px] font-medium">{chip.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 font-mono">
              Email Template Body (Markdown Supported)
            </label>
            <span className="text-[8px] font-mono text-white/20 flex items-center gap-1">
              <HelpCircle size={10} /> Hydrates values dynamically
            </span>
          </div>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setLastFocused('body')}
            className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary text-white font-mono leading-relaxed"
            placeholder="Compose welcome message..."
            rows={8}
            required
          />
        </div>

        {/* Warning Alert */}
        <div className="bg-amber-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-yellow-400">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>Advisory Note:</strong> Ensure all variables are typed correctly inside double braces (e.g. <code>{"{{"}student_first_name{"}}"}</code>). Incomplete variable formatting tags will prevent variables from parsing correctly in the mail queue processor.
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-3">
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-primary/95 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-6 shadow-lg shadow-primary/20 flex items-center gap-1.5"
          >
            {saving ? 'Saving...' : <><Save size={14} /> Save Templates</>}
          </Button>
        </div>
      </form>
    </div>
  );
}

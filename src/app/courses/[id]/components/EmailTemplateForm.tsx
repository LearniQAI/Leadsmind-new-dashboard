"use client";

import React, { useState, useRef } from "react";
import { Info, Plus } from "lucide-react";
import { toast } from "sonner";
import { updateCourseEmailTemplate } from "@/app/actions/courseEmails";
import {
  SettingsPanel,
  SettingsHeader,
  SettingsBody,
  SettingsFooter,
  Field,
  FieldGroup,
  SectionLabel,
  TextInput,
  TextArea,
  PrimaryButton,
} from "./settings/primitives";

interface EmailTemplateFormProps {
  course: any;
  onSaved?: (course: any) => void;
}

const CHIPS = [
  { value: "{{student_first_name}}", label: "First name" },
  { value: "{{student_email}}", label: "Student email" },
  { value: "{{course_name}}", label: "Course title" },
  { value: "{{portal_url}}", label: "Portal link" },
  { value: "{{access_type_description}}", label: "Access tier" },
  { value: "{{admin_support_email}}", label: "Support contact" },
];

const DEFAULT_BODY = `Hello {{student_first_name}},

Welcome to {{course_name}}! You have been granted {{access_type_description}} access.

Access your student portal here: {{portal_url}}

If you have any questions, contact us at {{admin_support_email}}.`;

export default function EmailTemplateForm({ course, onSaved }: EmailTemplateFormProps) {
  const [subject, setSubject] = useState(
    course.onboarding_email_subject || "Welcome to {{course_name}}!"
  );
  const [body, setBody] = useState(course.onboarding_email_body || DEFAULT_BODY);
  const [saving, setSaving] = useState(false);
  const [lastFocused, setLastFocused] = useState<"subject" | "body">("body");

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (variable: string) => {
    const el = lastFocused === "subject" ? subjectRef.current : bodyRef.current;
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const text = el.value;
    const next = text.substring(0, start) + variable + text.substring(end);
    if (lastFocused === "subject") setSubject(next);
    else setBody(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateCourseEmailTemplate(course.id, {
        onboarding_email_subject: subject,
        onboarding_email_body: body,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Onboarding email saved.");
        onSaved?.({
          ...course,
          onboarding_email_subject: subject,
          onboarding_email_body: body,
        });
      }
    } catch {
      toast.error("Failed to update email settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <SettingsPanel>
        <SettingsHeader
          eyebrow="Emails"
          title="Onboarding email"
          description="The email sent automatically the moment a student is enrolled."
        />

        <SettingsBody className="space-y-7">
          <FieldGroup>
            <Field label="Subject" htmlFor="em-subject" required>
              <TextInput
                id="em-subject"
                ref={subjectRef}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onFocus={() => setLastFocused("subject")}
                placeholder="e.g. Welcome to {{course_name}}!"
                required
              />
            </Field>

            <Field
              label="Body"
              htmlFor="em-body"
              align="start"
              required
              hint="Markdown supported. Variables are replaced when the email is sent."
            >
              <TextArea
                id="em-body"
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => setLastFocused("body")}
                placeholder="Compose the welcome message…"
                rows={10}
                required
                className="font-mono text-[12px] leading-relaxed"
              />
            </Field>
          </FieldGroup>

          <div className="space-y-2.5 rounded-xl border border-dash-border bg-dash-surface/70 p-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Insert a variable</SectionLabel>
              <span className="text-[11px] text-dash-textMuted">
                Inserts at your cursor in the {lastFocused === "subject" ? "subject" : "body"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => insertVariable(chip.value)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-white px-2.5 py-1.5 text-[12px] font-medium text-dash-text transition-colors hover:border-sky-400 hover:bg-sky-50"
                >
                  <Plus className="size-3 text-sky-500" />
                  {chip.label}
                  <span className="font-mono text-[11px] text-dash-textMuted">{chip.value}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3.5">
            <Info className="mt-0.5 size-4 shrink-0 text-sky-600" />
            <p className="text-[12px] leading-relaxed text-sky-800/90">
              Variables must be typed exactly, inside double braces — e.g.{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] text-sky-700">
                {"{{student_first_name}}"}
              </code>
              . Anything misspelled is left as-is in the sent email.
            </p>
          </div>
        </SettingsBody>

        <SettingsFooter>
          <PrimaryButton type="submit" loading={saving}>
            {saving ? "Saving…" : "Save email"}
          </PrimaryButton>
        </SettingsFooter>
      </SettingsPanel>
    </form>
  );
}

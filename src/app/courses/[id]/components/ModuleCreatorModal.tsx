"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, X } from "lucide-react";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import {
  SectionLabel,
  TextInput,
  TextArea,
  Select,
  Toggle,
  PrimaryButton,
  GhostButton,
} from "./settings/primitives";

interface ModuleCreatorModalProps {
  courseId: string;
  moduleId?: string;
  onClose: () => void;
  onSaved: () => void;
  isOpen?: boolean;
}

const EMOJI_OPTIONS = ["📚", "🎯", "⚡", "💼", "🧪", "📋"];
const NQF_LEVELS = [
  "None",
  ...Array.from({ length: 10 }, (_, i) => `NQF Level ${i + 1}`),
];

/** Stacked label + control, sized to match the settings primitives. */
function MField({
  label,
  hint,
  htmlFor,
  required,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[12px] font-semibold text-dash-text">
        {label}
        {required && <span className="ml-0.5 text-sky-600">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-dash-textMuted">{hint}</p>}
    </div>
  );
}

export default function ModuleCreatorModal({
  courseId,
  moduleId,
  onClose,
  onSaved,
  isOpen = true,
}: ModuleCreatorModalProps) {
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📚");
  const [customIcon, setCustomIcon] = useState("");
  const [publishStatus, setPublishStatus] = useState<"published" | "draft" | "coming_soon">("draft");
  const [nqfLevel, setNqfLevel] = useState("None");
  const [requiredForCompletion, setRequiredForCompletion] = useState(true);
  const [dripDays, setDripDays] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (moduleId && isOpen) {
      fetch(`/api/lms/modules?id=${moduleId}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.data) {
            const m = resData.data;
            setTitle(m.title || "");
            setDescription(m.description || "");
            setPublishStatus(m.publish_status || "draft");
            setNqfLevel(m.nqf_level || "None");
            setRequiredForCompletion(m.required_for_completion !== false);
            setDripDays(m.drip_days || 0);

            if (EMOJI_OPTIONS.includes(m.icon)) {
              setIcon(m.icon);
              setCustomIcon("");
            } else {
              setIcon("custom");
              setCustomIcon(m.icon || "");
            }
          }
        })
        .catch(() => toast.error("Failed to load module details"));
    } else {
      setTitle("");
      setDescription("");
      setIcon("📚");
      setCustomIcon("");
      setPublishStatus("draft");
      setNqfLevel("None");
      setRequiredForCompletion(true);
      setDripDays(0);
    }
  }, [moduleId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLenaGenerate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a module name first!");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Write a student-facing module description for a module called: ${title}. Keep it 2-3 sentences. Friendly, motivating tone.`,
        }),
      });

      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else if (result.text) {
        setDescription(result.text);
        toast.success("LENA AI description generated!");
      }
    } catch {
      toast.error("Failed to generate description");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Module name is required");
      return;
    }
    if (!workspaceId) {
      toast.error("No active workspace found");
      return;
    }

    setIsSaving(true);
    const finalIcon = icon === "custom" ? customIcon : icon;

    try {
      const url = moduleId ? `/api/lms/modules?id=${moduleId}` : "/api/lms/modules";
      const method = moduleId ? "PATCH" : "POST";
      const bodyPayload = moduleId
        ? { title, description, icon: finalIcon, publish_status: publishStatus, nqf_level: nqfLevel, required_for_completion: requiredForCompletion, drip_days: dripDays }
        : { course_id: courseId, workspace_id: workspaceId, title, description, icon: finalIcon, publish_status: publishStatus, nqf_level: nqfLevel, required_for_completion: requiredForCompletion, drip_days: dripDays };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const resData = await res.json();
      if (resData.error) {
        toast.error(resData.error);
      } else {
        toast.success(moduleId ? "Module updated successfully!" : "Module created successfully!");
        onSaved();
        onClose();
      }
    } catch {
      toast.error("Failed to save module");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-dash-border bg-white text-dash-text shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-5">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
              Module
            </div>
            <h2 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-dash-text">
              {moduleId ? "Edit module" : "Create module"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col overflow-y-auto">
          <div className="space-y-6 px-6 py-6">
            <MField label="Module name" htmlFor="mm-name" required>
              <TextInput
                id="mm-name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advanced Invoicing"
                required
                autoFocus
              />
            </MField>

            <div className="grid gap-4 sm:grid-cols-2">
              <MField label="Publish status" htmlFor="mm-status">
                <Select
                  id="mm-status"
                  value={publishStatus}
                  onChange={(e) => setPublishStatus(e.target.value as any)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="coming_soon">Coming soon</option>
                </Select>
              </MField>

              <MField label="NQF level" htmlFor="mm-nqf">
                <Select id="mm-nqf" value={nqfLevel} onChange={(e) => setNqfLevel(e.target.value)}>
                  {NQF_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </Select>
              </MField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MField label="Drip days" htmlFor="mm-drip" hint="0 = available immediately.">
                <TextInput
                  id="mm-drip"
                  type="number"
                  min={0}
                  value={dripDays}
                  onChange={(e) => setDripDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="font-mono"
                />
              </MField>

              <div className="flex items-end">
                <Toggle
                  checked={requiredForCompletion}
                  onChange={setRequiredForCompletion}
                  label="Required for completion"
                  description="Students must finish this module to complete the course."
                />
              </div>
            </div>

            {/* LENA AI */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-sky-800">
                    <Sparkles className="size-3.5" /> Generate with LENA
                  </div>
                  <p className="text-[12px] leading-relaxed text-sky-700/90">
                    Draft a student-facing description from the module name.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLenaGenerate}
                  disabled={isGenerating || !title.trim()}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 text-[12px] font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50 [&_svg]:size-3.5"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  Generate
                </button>
              </div>
            </div>

            <MField label="Description" htmlFor="mm-desc">
              <TextArea
                id="mm-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short overview of what this module covers…"
                rows={4}
              />
            </MField>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-dash-border bg-dash-surface/60 px-6 py-4">
            <GhostButton type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </GhostButton>
            <PrimaryButton type="submit" loading={isSaving}>
              {isSaving ? "Saving…" : moduleId ? "Save changes" : "Create module"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Link as LinkIcon, Check, ArrowRight } from "lucide-react";
import { DashModal, DashModalContent } from "@/components/dashboard-ui/Modal";
import { createCourseWithDomain } from "@/app/actions/lms";
import { getDomainsForCurrentWorkspace } from "@/app/actions/domains";
import { updateCourseLandingSettings } from "@/app/actions/courseLanding";
import { COURSE_THEME_LIST } from "@/lib/courses/courseThemeTokens";
import CourseThemeMiniPreview from "./CourseThemeMiniPreview";
import {
  TextInput,
  Select,
  InputAffix,
  PrimaryButton,
  GhostButton,
  SectionLabel,
} from "@/app/courses/[id]/components/settings/primitives";
import { cn } from "@/lib/utils";

const TEMPLATES = COURSE_THEME_LIST;

interface CreateCourseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const STEPS = [
  { n: 1, label: "Name & URL" },
  { n: 2, label: "Theme" },
];

export default function CreateCourseWizard({ open, onOpenChange, onCreated }: CreateCourseWizardProps) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [domains, setDomains] = useState<any[]>([]);
  const [domainId, setDomainId] = useState("");
  const [urlPath, setUrlPath] = useState("");
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("clean_minimal");

  const reset = () => {
    setStep(1);
    setTitle("");
    setDomainId("");
    setUrlPath("");
    setCreatedCourseId(null);
    setSelectedTemplate("clean_minimal");
  };

  useEffect(() => {
    if (!open) return;
    setIsLoadingDomains(true);
    getDomainsForCurrentWorkspace()
      .then((res) => {
        if ("data" in res && res.data) {
          setDomains(res.data.filter((d: any) => d.status === "active"));
        } else if ("error" in res && res.error) {
          toast.error(res.error);
        }
      })
      .finally(() => setIsLoadingDomains(false));
  }, [open]);

  const selectedDomain = domains.find((d) => d.id === domainId);
  const previewUrl = selectedDomain
    ? `${selectedDomain.hostname}/${urlPath || "your-course-slug"}`
    : null;

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const handleCreateStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Course name is required");
    if (domainId && !urlPath.trim())
      return toast.error("URL path is required when a domain is selected");

    setIsSaving(true);
    try {
      const res = await createCourseWithDomain(title, domainId || null, urlPath || null);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setCreatedCourseId(res.data.id);
      setStep(2);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishStep2 = async () => {
    if (!createdCourseId) return;
    setIsSaving(true);
    try {
      const res = await updateCourseLandingSettings(createdCourseId, { template: selectedTemplate });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Course created — add your first module.");
      onCreated();
      handleClose();
      router.push(`/courses/${createdCourseId}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashModal open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DashModalContent className="max-w-xl gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="border-b border-dash-border px-6 py-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
            New course
          </div>
          <h2 className="mt-1 text-[15px] font-semibold text-dash-text">
            {step === 1 ? "Name and address" : "Pick a theme"}
          </h2>
          <p className="mt-0.5 text-[13px] text-dash-textMuted">
            {step === 1
              ? "Give the course a name. A custom domain is optional."
              : "Each preview is a live render of the student player with that theme."}
          </p>

          {/* Stepper */}
          <div className="mt-4 flex items-center gap-2">
            {STEPS.map((s, i) => {
              const state = step > s.n ? "done" : step === s.n ? "active" : "todo";
              return (
                <React.Fragment key={s.n}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                        state === "done" && "bg-sky-500 text-white",
                        state === "active" && "bg-sky-500/15 text-sky-700 ring-1 ring-inset ring-sky-500/40",
                        state === "todo" && "bg-slate-100 text-slate-400"
                      )}
                    >
                      {state === "done" ? <Check className="size-3" /> : s.n}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold",
                        state === "todo" ? "text-dash-textMuted" : "text-dash-text"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span
                      className={cn(
                        "h-px w-6",
                        step > s.n ? "bg-sky-400" : "bg-dash-border"
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body */}
        {step === 1 && (
          <form onSubmit={handleCreateStep1}>
            <div className="space-y-5 px-6 py-6">
              <div className="space-y-1.5">
                <label htmlFor="cc-title" className="block text-[12px] font-semibold text-dash-text">
                  Course name <span className="text-sky-600">*</span>
                </label>
                <TextInput
                  id="cc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Masterclass in JavaScript"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cc-domain" className="block text-[12px] font-semibold text-dash-text">
                  Domain <span className="font-normal text-dash-textMuted">(optional)</span>
                </label>
                {isLoadingDomains ? (
                  <div className="flex items-center gap-2 rounded-lg border border-dash-border bg-dash-surface px-3 py-2.5 text-[12px] text-dash-textMuted">
                    <Loader2 className="size-3.5 animate-spin" /> Loading connected domains…
                  </div>
                ) : domains.length === 0 ? (
                  <p className="rounded-lg border border-dash-border bg-dash-surface px-3 py-2.5 text-[12px] leading-relaxed text-dash-textMuted">
                    No verified domains yet — skip for now and add one later in Settings.
                  </p>
                ) : (
                  <Select
                    id="cc-domain"
                    value={domainId}
                    onChange={(e) => setDomainId(e.target.value)}
                  >
                    <option value="">Skip for now — add a domain later</option>
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.hostname}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              {domainId && selectedDomain && (
                <div className="space-y-1.5">
                  <label htmlFor="cc-slug" className="block text-[12px] font-semibold text-dash-text">
                    URL path <span className="text-sky-600">*</span>
                  </label>
                  <div className="flex items-stretch overflow-hidden rounded-lg border border-dash-border focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/12">
                    <span className="flex max-w-[45%] shrink-0 items-center truncate bg-dash-surface px-3 font-mono text-[11px] text-dash-textMuted">
                      https://{selectedDomain.hostname}/
                    </span>
                    <input
                      id="cc-slug"
                      value={urlPath}
                      onChange={(e) => setUrlPath(e.target.value)}
                      placeholder="tefl-beginner"
                      required
                      className="min-w-0 flex-1 px-3 py-2.5 text-[13px] text-dash-text outline-none"
                    />
                    <span className="flex items-center px-3 text-dash-textMuted">
                      <LinkIcon className="size-3.5" />
                    </span>
                  </div>
                </div>
              )}

              {previewUrl && (
                <div className="rounded-lg border border-dash-border bg-dash-surface px-3 py-2 font-mono text-[11px] text-dash-textMuted">
                  https://{previewUrl}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-dash-border bg-dash-surface/60 px-6 py-4">
              <GhostButton type="button" onClick={handleClose} disabled={isSaving}>
                Cancel
              </GhostButton>
              <PrimaryButton type="submit" loading={isSaving} disabled={!title.trim()}>
                Continue <ArrowRight />
              </PrimaryButton>
            </div>
          </form>
        )}

        {step === 2 && (
          <div>
            <div className="space-y-4 px-6 py-6">
              <SectionLabel>Theme</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "overflow-hidden rounded-xl border text-left transition-all outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20",
                        isSelected
                          ? "border-sky-500 ring-1 ring-inset ring-sky-500/30"
                          : "border-dash-border hover:border-slate-300"
                      )}
                    >
                      <CourseThemeMiniPreview theme={tmpl} selected={isSelected} />
                      <div className="border-t border-dash-border bg-white p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-semibold text-dash-text">
                            {tmpl.label}
                          </span>
                          {isSelected && <Check className="size-3 text-sky-600" />}
                        </div>
                        <div className="mt-0.5 text-[10px] leading-relaxed text-dash-textMuted">
                          {tmpl.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-dash-border bg-dash-surface/60 px-6 py-4">
              <GhostButton type="button" onClick={() => setStep(1)} disabled={isSaving}>
                Back
              </GhostButton>
              <PrimaryButton type="button" onClick={handleFinishStep2} loading={isSaving}>
                {isSaving ? "Creating…" : "Create course"}
              </PrimaryButton>
            </div>
          </div>
        )}
      </DashModalContent>
    </DashModal>
  );
}
